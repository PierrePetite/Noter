import { PrismaClient } from '@prisma/client';

export class TagService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Alle Tags abrufen
   */
  async getAllTags() {
    const tags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: {
            notes: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return tags;
  }

  /**
   * Tag erstellen
   */
  async createTag(name: string, color?: string) {
    // Prüfe ob Tag bereits existiert
    const existing = await this.prisma.tag.findUnique({
      where: { name },
    });

    if (existing) {
      return existing;
    }

    const tag = await this.prisma.tag.create({
      data: {
        name,
        color: color || null,
      },
    });

    return tag;
  }

  /**
   * Tags zu Notiz hinzufügen
   */
  async addTagsToNote(noteId: string, tagNames: string[], userId: string) {
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

    // Tags erstellen (falls nicht vorhanden) und IDs sammeln
    const tagIds: string[] = [];

    for (const tagName of tagNames) {
      let tag = await this.prisma.tag.findUnique({
        where: { name: tagName },
      });

      if (!tag) {
        tag = await this.prisma.tag.create({
          data: { name: tagName },
        });
      }

      tagIds.push(tag.id);
    }

    // Tags mit Notiz verknüpfen
    await this.prisma.note.update({
      where: { id: noteId },
      data: {
        tags: {
          connect: tagIds.map((id) => ({ id })),
        },
      },
    });

    // Notiz mit Tags zurückgeben
    const updatedNote = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        tags: true,
      },
    });

    return updatedNote;
  }

  /**
   * Tags von Notiz entfernen
   */
  async removeTagsFromNote(noteId: string, tagIds: string[], userId: string) {
    // Prüfe Zugriff
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

    // Tags entfernen
    await this.prisma.note.update({
      where: { id: noteId },
      data: {
        tags: {
          disconnect: tagIds.map((id) => ({ id })),
        },
      },
    });

    // Notiz mit Tags zurückgeben
    const updatedNote = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        tags: true,
      },
    });

    return updatedNote;
  }

  /**
   * Alle Notizen mit einem bestimmten Tag
   */
  async getNotesByTag(tagId: string, userId: string) {
    const notes = await this.prisma.note.findMany({
      where: {
        tags: {
          some: {
            id: tagId,
          },
        },
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

    return notes;
  }
}
