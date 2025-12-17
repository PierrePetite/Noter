import { PrismaClient } from '@prisma/client';
import { CreateNoteInput, UpdateNoteInput } from '../utils/validation';
import * as fs from 'fs/promises';
import * as path from 'path';

export class NoteService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Alle Notizen eines Benutzers abrufen (eigene + geteilte)
   */
  async getAllNotes(userId: string, folderId?: string) {
    const where: any = {
      OR: [
        { ownerId: userId },
        {
          shares: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    };

    if (folderId !== undefined) {
      where.folderId = folderId === 'null' ? null : folderId;
    }

    const notes = await this.prisma.note.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: true,
        shares: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            attachments: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return notes;
  }

  /**
   * Einzelne Notiz abrufen
   */
  async getNoteById(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: true,
        attachments: true,
        shares: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    // Prüfe Zugriffsberechtigung
    const hasAccess =
      note.ownerId === userId ||
      note.shares.some((share) => share.userId === userId);

    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return note;
  }

  /**
   * Neue Notiz erstellen
   */
  async createNote(input: CreateNoteInput, userId: string) {
    // Wenn folderId angegeben, prüfe ob Ordner existiert und User Zugriff hat
    if (input.folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: input.folderId },
      });

      if (!folder || folder.ownerId !== userId) {
        throw new Error('Folder not found or access denied');
      }
    }

    const note = await this.prisma.note.create({
      data: {
        title: input.title,
        content: input.content,
        folderId: input.folderId || null,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: true,
      },
    });

    return note;
  }

  /**
   * Notiz aktualisieren
   */
  async updateNote(noteId: string, input: UpdateNoteInput, userId: string) {
    // Prüfe ob Notiz existiert und User Schreibrechte hat
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        shares: true,
      },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    const isOwner = note.ownerId === userId;
    const hasWriteAccess = note.shares.some(
      (share) => share.userId === userId && share.permission === 'WRITE'
    );

    if (!isOwner && !hasWriteAccess) {
      throw new Error('Access denied');
    }

    // Wenn folderId geändert wird, prüfe neuen Ordner
    if (input.folderId !== undefined && input.folderId !== null) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: input.folderId },
      });

      if (!folder || folder.ownerId !== userId) {
        throw new Error('Folder not found or access denied');
      }
    }

    const updatedNote = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.content && { content: input.content }),
        ...(input.folderId !== undefined && { folderId: input.folderId }),
        ...(input.isFavorite !== undefined && { isFavorite: input.isFavorite }),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: true,
      },
    });

    return updatedNote;
  }

  /**
   * Notiz löschen
   */
  async deleteNote(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        attachments: true,
      },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    // Nur Owner kann löschen
    if (note.ownerId !== userId) {
      throw new Error('Only the owner can delete this note');
    }

    // Physische Dateien löschen
    if (note.attachments && note.attachments.length > 0) {
      await this.deleteAttachmentFiles(note.attachments);
    }

    // Note aus DB löschen (Cascade löscht automatisch die Attachment-Einträge)
    await this.prisma.note.delete({
      where: { id: noteId },
    });

    return { success: true };
  }

  /**
   * Physische Attachment-Dateien löschen
   */
  private async deleteAttachmentFiles(attachments: Array<{ path: string }>) {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';

    for (const attachment of attachments) {
      try {
        const filePath = path.resolve(uploadDir, attachment.path);
        await fs.unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
      } catch (error) {
        console.error(`Failed to delete file ${attachment.path}:`, error);
        // Fehler nicht weitergeben, damit Löschung trotzdem durchgeht
      }
    }
  }

  /**
   * Notizen durchsuchen (Titel + Content)
   */
  async searchNotes(userId: string, query: string) {
    // Hole alle Notizen des Users (eigene + geteilte)
    const allNotes = await this.prisma.note.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            shares: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Filtere clientseitig nach Titel ODER Content
    const searchLower = query.toLowerCase();
    const filteredNotes = allNotes.filter((note) => {
      // Suche im Titel
      if (note.title.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Suche im Content (TipTap JSON)
      try {
        const contentText = this.extractTextFromTiptap(note.content);
        return contentText.toLowerCase().includes(searchLower);
      } catch (error) {
        // Falls Content nicht parsbar ist, ignoriere diesen Teil
        return false;
      }
    });

    return filteredNotes;
  }

  /**
   * Extrahiert Text aus TipTap JSON Format
   */
  private extractTextFromTiptap(content: any): string {
    if (!content) return '';

    // Wenn es bereits ein String ist
    if (typeof content === 'string') {
      return content;
    }

    let text = '';

    const extractFromNode = (node: any): void => {
      // Text-Node
      if (node.type === 'text' && node.text) {
        text += node.text + ' ';
      }

      // Node mit Content (z.B. paragraph, heading, etc.)
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(extractFromNode);
      }
    };

    // Starte mit dem Root-Node
    if (content.type === 'doc' && content.content) {
      content.content.forEach(extractFromNode);
    } else if (Array.isArray(content)) {
      content.forEach(extractFromNode);
    } else {
      extractFromNode(content);
    }

    return text.trim();
  }

  /**
   * Favoriten-Status umschalten
   */
  async toggleFavorite(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.ownerId !== userId) {
      throw new Error('Only the owner can favorite notes');
    }

    const updatedNote = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        isFavorite: !note.isFavorite,
      },
    });

    return updatedNote;
  }

  /**
   * Alle Favoriten abrufen
   */
  async getFavorites(userId: string) {
    const notes = await this.prisma.note.findMany({
      where: {
        ownerId: userId,
        isFavorite: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return notes;
  }
}
