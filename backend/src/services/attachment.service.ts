import { PrismaClient } from '@prisma/client';
import { PluginRegistry } from '../plugins/PluginRegistry';
import crypto from 'crypto';
import path from 'path';

export class AttachmentService {
  constructor(
    private prisma: PrismaClient,
    private registry: PluginRegistry
  ) {}

  /**
   * Datei zu Notiz hochladen
   */
  async uploadAttachment(
    noteId: string,
    userId: string,
    file: {
      filename: string;
      mimetype: string;
      data: Buffer;
    }
  ) {
    // Prüfe ob Notiz existiert und User Schreibzugriff hat
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

    // Generiere sicheren Dateinamen
    const ext = path.extname(file.filename);
    const hash = crypto.randomBytes(16).toString('hex');
    const safeName = `${hash}${ext}`;
    const filePath = `attachments/${noteId}/${safeName}`;

    // Upload über Storage Provider
    const storageProvider = this.registry.getStorageProvider();
    const uploadedFile = await storageProvider.upload(file.data, filePath, {
      mimeType: file.mimetype,
      originalName: file.filename,
    });

    // Attachment in DB speichern
    const attachment = await this.prisma.attachment.create({
      data: {
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.data.length,
        path: filePath,
        noteId,
      },
    });

    return {
      ...attachment,
      url: uploadedFile.url,
    };
  }

  /**
   * Alle Attachments einer Notiz abrufen
   */
  async getAttachmentsByNote(noteId: string, userId: string) {
    // Prüfe Zugriff auf Notiz
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        shares: true,
      },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    const hasAccess =
      note.ownerId === userId ||
      note.shares.some((share) => share.userId === userId);

    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
    });

    // URLs generieren
    const storageProvider = this.registry.getStorageProvider();
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (att) => ({
        ...att,
        url: await storageProvider.getUrl(att.path),
      }))
    );

    return attachmentsWithUrls;
  }

  /**
   * Attachment herunterladen
   */
  async downloadAttachment(attachmentId: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        note: {
          include: {
            shares: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Prüfe Zugriff
    const hasAccess =
      attachment.note.ownerId === userId ||
      attachment.note.shares.some((share) => share.userId === userId);

    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Datei vom Storage Provider abrufen
    const storageProvider = this.registry.getStorageProvider();
    const fileData = await storageProvider.download(attachment.path);

    return {
      data: fileData,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
    };
  }

  /**
   * Attachment löschen
   */
  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        note: {
          include: {
            shares: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Nur Owner oder User mit Write-Permission können löschen
    const isOwner = attachment.note.ownerId === userId;
    const hasWriteAccess = attachment.note.shares.some(
      (share) => share.userId === userId && share.permission === 'WRITE'
    );

    if (!isOwner && !hasWriteAccess) {
      throw new Error('Access denied');
    }

    // Datei vom Storage löschen
    const storageProvider = this.registry.getStorageProvider();
    try {
      await storageProvider.delete(attachment.path);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
      // Fahre fort, auch wenn Datei nicht gelöscht werden konnte
    }

    // DB-Eintrag löschen
    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return { success: true };
  }

  /**
   * Bild hochladen (für Editor)
   * Erstellt kein Attachment-Objekt, nur Upload
   */
  async uploadImage(
    userId: string,
    file: {
      filename: string;
      mimetype: string;
      data: Buffer;
    }
  ) {
    // Prüfe ob es ein Bild ist
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only images are allowed');
    }

    // Generiere sicheren Dateinamen
    const ext = path.extname(file.filename);
    const hash = crypto.randomBytes(16).toString('hex');
    const safeName = `${hash}${ext}`;
    const filePath = `images/${userId}/${safeName}`;

    // Upload über Storage Provider
    const storageProvider = this.registry.getStorageProvider();
    const uploadedFile = await storageProvider.upload(file.data, filePath, {
      mimeType: file.mimetype,
      originalName: file.filename,
    });

    return {
      url: uploadedFile.url,
      path: filePath,
      size: uploadedFile.size,
      mimeType: uploadedFile.mimeType,
    };
  }
}
