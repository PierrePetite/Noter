import AdmZip from 'adm-zip';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { htmlToTiptap, cleanHtml } from '../../utils/htmlToTiptap';
import { PluginRegistry } from '../../plugins/PluginRegistry';

/**
 * Synology NoteStation Backup-Struktur
 */
interface SynologyConfig {
  note: string[];
  notebook: string[];
  todo: string[];
}

interface SynologyNote {
  category: 'note';
  parent_id: string;
  title: string;
  thumb?: string;
  mtime: number;
  ctime: number;
  latitude: number;
  longitude: number;
  encrypt: boolean;
  attachment?: Record<
    string,
    {
      md5: string;
      name: string;
      size: number;
      width?: number;
      height?: number;
      type: string;
      ctime: number;
      ref: string;
    }
  >;
  brief: string;
  content: string;
  tag: string[];
}

interface SynologyNotebook {
  category: 'notebook';
  title: string;
  ctime: number;
  mtime: number;
  stack: string;
}

/**
 * Import-Optionen
 */
export interface SynologyImportOptions {
  userId: string;
  preserveTimestamps?: boolean;
  skipErrors?: boolean;
}

/**
 * Import-Ergebnis
 */
export interface SynologyImportResult {
  success: boolean;
  notesCreated: number;
  foldersCreated: number;
  attachmentsImported: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
}

/**
 * Synology NoteStation Import Provider
 */
export class SynologyImportProvider {
  constructor(private prisma: PrismaClient) {}

  /**
   * Importiert eine Synology NSX-Backup-Datei
   */
  async import(
    nsxFilePath: string,
    options: SynologyImportOptions
  ): Promise<SynologyImportResult> {
    const result: SynologyImportResult = {
      success: false,
      notesCreated: 0,
      foldersCreated: 0,
      attachmentsImported: 0,
      errors: [],
    };

    try {
      // 1. NSX-Datei entpacken
      const extractDir = await this.extractNsxFile(nsxFilePath);

      // 2. config.json laden
      const config = await this.loadConfig(extractDir);

      // 3. Notizbücher (Folders) importieren
      const folderMapping = await this.importNotebooks(extractDir, config, options);
      result.foldersCreated = folderMapping.size;

      // 4. Notizen importieren
      const { notesCreated, attachmentsImported, errors } = await this.importNotes(
        extractDir,
        config,
        folderMapping,
        options
      );
      result.notesCreated = notesCreated;
      result.attachmentsImported = attachmentsImported;
      result.errors = errors;

      // 5. Temporäres Verzeichnis aufräumen
      await fs.rm(extractDir, { recursive: true, force: true });

      result.success = true;
    } catch (error: any) {
      result.errors.push({
        file: 'general',
        error: error.message || 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Entpackt die NSX-Datei (ZIP)
   */
  private async extractNsxFile(nsxFilePath: string): Promise<string> {
    const zip = new AdmZip(nsxFilePath);
    const extractDir = path.join('/tmp', `synology_import_${Date.now()}`);

    await fs.mkdir(extractDir, { recursive: true });
    zip.extractAllTo(extractDir, true);

    return extractDir;
  }

  /**
   * Lädt die config.json
   */
  private async loadConfig(extractDir: string): Promise<SynologyConfig> {
    const configPath = path.join(extractDir, 'config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configContent);
  }

  /**
   * Importiert alle Notizbücher
   * @returns Map: Synology-ID -> Noter-Folder-UUID
   */
  private async importNotebooks(
    extractDir: string,
    config: SynologyConfig,
    options: SynologyImportOptions
  ): Promise<Map<string, string>> {
    const folderMapping = new Map<string, string>();

    // Spezial-ID für Notizen ohne Parent
    folderMapping.set('1031_#00000000', ''); // Root-Level

    for (const notebookFile of config.notebook) {
      try {
        const notebookPath = path.join(extractDir, notebookFile);
        const notebookContent = await fs.readFile(notebookPath, 'utf-8');
        const notebook: SynologyNotebook = JSON.parse(notebookContent);

        // Erstelle Folder in Datenbank
        const folder = await this.prisma.folder.create({
          data: {
            name: notebook.title,
            ownerId: options.userId,
            parentId: null, // TODO: stack-Unterstützung für verschachtelte Ordner
            createdAt: options.preserveTimestamps
              ? new Date(notebook.ctime * 1000)
              : undefined,
            updatedAt: options.preserveTimestamps
              ? new Date(notebook.mtime * 1000)
              : undefined,
          },
        });

        folderMapping.set(notebookFile, folder.id);
      } catch (error: any) {
        if (!options.skipErrors) {
          throw error;
        }
        // Fehler wird später in errors[] hinzugefügt
      }
    }

    return folderMapping;
  }

  /**
   * Importiert alle Notizen
   */
  private async importNotes(
    extractDir: string,
    config: SynologyConfig,
    folderMapping: Map<string, string>,
    options: SynologyImportOptions
  ): Promise<{
    notesCreated: number;
    attachmentsImported: number;
    errors: Array<{ file: string; error: string }>;
  }> {
    let notesCreated = 0;
    let attachmentsImported = 0;
    const errors: Array<{ file: string; error: string }> = [];

    for (const noteFile of config.note) {
      try {
        const notePath = path.join(extractDir, noteFile);
        const noteContent = await fs.readFile(notePath, 'utf-8');
        const note: SynologyNote = JSON.parse(noteContent);

        // 1. Anhänge hochladen und URL-Mapping erstellen
        const { imageRefMap, uploadedAttachments } = await this.uploadAttachments(
          extractDir,
          note.attachment || {},
          options
        );
        attachmentsImported += imageRefMap.size;

        // 2. HTML zu TipTap JSON konvertieren
        const cleanedHtml = cleanHtml(note.content);
        const tiptapContent = htmlToTiptap(cleanedHtml, { imageRefMap });

        // 3. Folder-ID ermitteln
        const folderId = folderMapping.get(note.parent_id) || null;

        // 4. Notiz in Datenbank erstellen
        const createdNote = await this.prisma.note.create({
          data: {
            title: note.title || 'Ohne Titel',
            content: tiptapContent as any,
            ownerId: options.userId,
            folderId: folderId || undefined,
            isFavorite: false,
            createdAt: options.preserveTimestamps ? new Date(note.ctime * 1000) : undefined,
            updatedAt: options.preserveTimestamps ? new Date(note.mtime * 1000) : undefined,
          },
        });

        // 4b. Attachment-Einträge in DB erstellen (für nicht-Bild Dateien)
        for (const attachment of uploadedAttachments) {
          // Nur nicht-Bilder als Attachments speichern (Bilder sind inline)
          if (!attachment.mimeType.startsWith('image/')) {
            await this.prisma.attachment.create({
              data: {
                filename: attachment.filename,
                mimeType: attachment.mimeType,
                size: attachment.size,
                path: attachment.path,
                noteId: createdNote.id,
              },
            });
          }
        }

        // 5. Tags verarbeiten
        if (note.tag && note.tag.length > 0) {
          await this.processTags(createdNote.id, note.tag);
        }

        notesCreated++;
      } catch (error: any) {
        errors.push({
          file: noteFile,
          error: error.message || 'Unknown error',
        });

        if (!options.skipErrors) {
          throw error;
        }
      }
    }

    return { notesCreated, attachmentsImported, errors };
  }

  /**
   * Lädt Anhänge hoch und gibt URL-Mapping zurück
   */
  private async uploadAttachments(
    extractDir: string,
    attachments: SynologyNote['attachment'],
    options: SynologyImportOptions
  ): Promise<{
    imageRefMap: Map<string, string>;
    uploadedAttachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      path: string;
    }>;
  }> {
    const imageRefMap = new Map<string, string>();
    const uploadedAttachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      path: string;
    }> = [];

    if (!attachments) return { imageRefMap, uploadedAttachments };

    const registry = PluginRegistry.getInstance();
    const storageProvider = registry.getStorageProvider();

    for (const [, attachment] of Object.entries(attachments)) {
      try {
        // Finde Datei anhand des MD5
        const filePath = path.join(extractDir, `file_${attachment.md5}`);

        try {
          await fs.access(filePath);
        } catch {
          // Datei existiert nicht, überspringen
          continue;
        }

        // Lese Datei
        const fileBuffer = await fs.readFile(filePath);

        // Upload über StorageProvider
        const uploadPath = `imports/${options.userId}/${Date.now()}_${attachment.name}`;
        const uploadedFile = await storageProvider.upload(fileBuffer, uploadPath, {
          mimeType: attachment.type,
          originalName: attachment.name,
        });

        // Mapping: ref -> URL
        imageRefMap.set(attachment.ref, uploadedFile.url);

        // Info für DB-Einträge sammeln
        uploadedAttachments.push({
          filename: attachment.name,
          mimeType: attachment.type,
          size: attachment.size,
          path: uploadPath,
        });
      } catch (error: any) {
        // Fehler beim Upload ignorieren (Bild wird nicht angezeigt)
        console.error(`Failed to upload attachment ${attachment.name}:`, error.message);
      }
    }

    return { imageRefMap, uploadedAttachments };
  }

  /**
   * Verarbeitet Tags für eine Notiz
   */
  private async processTags(noteId: string, tags: string[]): Promise<void> {
    for (const tagName of tags) {
      try {
        // Tag finden oder erstellen
        let tag = await this.prisma.tag.findUnique({
          where: { name: tagName },
        });

        if (!tag) {
          tag = await this.prisma.tag.create({
            data: { name: tagName },
          });
        }

        // Tag mit Notiz verknüpfen
        await this.prisma.note.update({
          where: { id: noteId },
          data: {
            tags: {
              connect: { id: tag.id },
            },
          },
        });
      } catch (error) {
        // Fehler bei Tags ignorieren
        console.error(`Failed to process tag ${tagName}:`, error);
      }
    }
  }

  /**
   * Dekodiert Synology Base64-Dateinamen
   */
  static decodeFilename(base64Name: string): string {
    try {
      // Entferne Prefix (note_, nb_)
      const withoutPrefix = base64Name.replace(/^(note_|nb_)/, '');
      return Buffer.from(withoutPrefix, 'base64').toString('utf-8');
    } catch {
      return base64Name;
    }
  }
}
