import { IImportProvider, IExportProvider, ImportOptions, ImportResult, ValidationResult, ExportOptions } from './ImportExportProvider.interface';
import { PrismaClient } from '@prisma/client';
import archiver from 'archiver';

/**
 * Markdown Import/Export Provider
 * Unterstützt Import und Export von Notizen im Markdown-Format
 */
export class MarkdownProvider implements IImportProvider, IExportProvider {
  readonly name = 'markdown';
  readonly supportedFormats = ['md', 'markdown'];
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Import-Funktionen

  async import(
    data: Buffer,
    _format: string,
    userId: string,
    options?: ImportOptions
  ): Promise<ImportResult> {
    try {
      const markdown = data.toString('utf-8');

      // Einfacher Parser: Erste Zeile als Titel, Rest als Content
      const lines = markdown.split('\n');
      const title = lines[0].replace(/^#\s*/, '').trim() || 'Untitled';
      const content = lines.slice(1).join('\n').trim();

      // Konvertiere Markdown zu TipTap JSON (vereinfacht)
      const tipTapContent = this.markdownToTipTap(content);

      // Erstelle Notiz
      await this.prisma.note.create({
        data: {
          title,
          content: tipTapContent,
          ownerId: userId,
          folderId: options?.targetFolderId || null,
        },
      });

      return {
        success: true,
        notesCreated: 1,
        foldersCreated: 0,
      };
    } catch (error) {
      return {
        success: false,
        notesCreated: 0,
        foldersCreated: 0,
        errors: [`Import failed: ${error}`],
      };
    }
  }

  async validate(data: Buffer, _format: string): Promise<ValidationResult> {
    try {
      const markdown = data.toString('utf-8');

      if (!markdown || markdown.trim().length === 0) {
        return {
          valid: false,
          errors: ['Empty markdown file'],
        };
      }

      return {
        valid: true,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${error}`],
      };
    }
  }

  // Export-Funktionen

  async export(noteIds: string[], _format: string, options?: ExportOptions): Promise<Buffer> {
    const notes = await this.prisma.note.findMany({
      where: { id: { in: noteIds } },
      include: {
        tags: true,
        attachments: options?.includeAttachments,
      },
    });

    if (notes.length === 0) {
      throw new Error('No notes found');
    }

    if (notes.length === 1 && options?.format !== 'zip') {
      // Einzelne Notiz als Markdown
      const markdown = this.noteToMarkdown(notes[0], options);
      return Buffer.from(markdown, 'utf-8');
    }

    // Multiple Notizen als ZIP
    return this.createMarkdownZip(notes, options);
  }

  async exportAll(userId: string, _format: string, options?: ExportOptions): Promise<Buffer> {
    const notes = await this.prisma.note.findMany({
      where: { ownerId: userId },
      include: {
        folder: true,
        tags: true,
        attachments: options?.includeAttachments,
      },
    });

    return this.createMarkdownZip(notes, options);
  }

  // Helper-Methoden

  private markdownToTipTap(markdown: string): any {
    // Vereinfachte Konvertierung - in Produktion würde man eine Library nutzen
    const paragraphs = markdown.split('\n\n').filter(p => p.trim());

    return {
      type: 'doc',
      content: paragraphs.map(p => ({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: p,
          },
        ],
      })),
    };
  }

  private noteToMarkdown(note: any, options?: ExportOptions): string {
    let markdown = `# ${note.title}\n\n`;

    // Metadaten
    if (options?.includeMetadata) {
      markdown += `---\n`;
      markdown += `created: ${note.createdAt.toISOString()}\n`;
      markdown += `updated: ${note.updatedAt.toISOString()}\n`;
      if (note.tags && note.tags.length > 0) {
        markdown += `tags: ${note.tags.map((t: any) => t.name).join(', ')}\n`;
      }
      markdown += `---\n\n`;
    }

    // Content (TipTap JSON zu Markdown - vereinfacht)
    const content = this.tipTapToMarkdown(note.content);
    markdown += content;

    // Attachments
    if (options?.includeAttachments && note.attachments && note.attachments.length > 0) {
      markdown += `\n\n## Attachments\n\n`;
      for (const attachment of note.attachments) {
        markdown += `- [${attachment.filename}](${attachment.path})\n`;
      }
    }

    return markdown;
  }

  private tipTapToMarkdown(content: any): string {
    // Vereinfachte Konvertierung - in Produktion würde man eine Library nutzen
    if (!content || !content.content) {
      return '';
    }

    let markdown = '';

    for (const node of content.content) {
      if (node.type === 'paragraph') {
        const text = node.content?.map((c: any) => c.text || '').join('') || '';
        markdown += text + '\n\n';
      } else if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        const text = node.content?.map((c: any) => c.text || '').join('') || '';
        markdown += '#'.repeat(level) + ' ' + text + '\n\n';
      } else if (node.type === 'bulletList') {
        for (const item of node.content || []) {
          const text = item.content?.[0]?.content?.map((c: any) => c.text || '').join('') || '';
          markdown += `- ${text}\n`;
        }
        markdown += '\n';
      }
    }

    return markdown.trim();
  }

  private async createMarkdownZip(notes: any[], options?: ExportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Füge Notizen hinzu
      for (const note of notes) {
        const markdown = this.noteToMarkdown(note, options);
        const filename = this.sanitizeFilename(`${note.title}.md`);

        let filePath = filename;
        if (options?.preserveStructure && note.folder) {
          filePath = `${note.folder.name}/${filename}`;
        }

        archive.append(markdown, { name: filePath });
      }

      archive.finalize();
    });
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9_\-\.]/gi, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 200);
  }
}
