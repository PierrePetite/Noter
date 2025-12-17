import { PrismaClient, Permission } from '@prisma/client';

export class ShareService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Notiz mit Benutzer teilen
   */
  async shareNote(
    noteId: string,
    targetUserId: string,
    permission: Permission,
    ownerId: string
  ) {
    // Prüfe ob Notiz existiert und User der Owner ist
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.ownerId !== ownerId) {
      throw new Error('Only the owner can share this note');
    }

    // Prüfe ob Ziel-User existiert
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Prüfe ob bereits geteilt
    const existingShare = await this.prisma.noteShare.findUnique({
      where: {
        noteId_userId: {
          noteId,
          userId: targetUserId,
        },
      },
    });

    if (existingShare) {
      // Aktualisiere Permission
      const updated = await this.prisma.noteShare.update({
        where: {
          noteId_userId: {
            noteId,
            userId: targetUserId,
          },
        },
        data: {
          permission,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      return updated;
    }

    // Neue Freigabe erstellen
    const share = await this.prisma.noteShare.create({
      data: {
        noteId,
        userId: targetUserId,
        permission,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return share;
  }

  /**
   * Notiz-Freigabe entfernen
   */
  async unshareNote(noteId: string, targetUserId: string, ownerId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.ownerId !== ownerId) {
      throw new Error('Only the owner can unshare this note');
    }

    await this.prisma.noteShare.delete({
      where: {
        noteId_userId: {
          noteId,
          userId: targetUserId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Ordner mit Benutzer teilen
   */
  async shareFolder(
    folderId: string,
    targetUserId: string,
    permission: Permission,
    ownerId: string
  ) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (folder.ownerId !== ownerId) {
      throw new Error('Only the owner can share this folder');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Prüfe ob bereits geteilt
    const existingShare = await this.prisma.folderShare.findUnique({
      where: {
        folderId_userId: {
          folderId,
          userId: targetUserId,
        },
      },
    });

    if (existingShare) {
      // Aktualisiere Permission
      const updated = await this.prisma.folderShare.update({
        where: {
          folderId_userId: {
            folderId,
            userId: targetUserId,
          },
        },
        data: {
          permission,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      return updated;
    }

    const share = await this.prisma.folderShare.create({
      data: {
        folderId,
        userId: targetUserId,
        permission,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return share;
  }

  /**
   * Ordner-Freigabe entfernen
   */
  async unshareFolder(folderId: string, targetUserId: string, ownerId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (folder.ownerId !== ownerId) {
      throw new Error('Only the owner can unshare this folder');
    }

    await this.prisma.folderShare.delete({
      where: {
        folderId_userId: {
          folderId,
          userId: targetUserId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Alle mit mir geteilten Inhalte abrufen
   */
  async getSharedWithMe(userId: string) {
    const [notes, folders] = await Promise.all([
      this.prisma.note.findMany({
        where: {
          shares: {
            some: {
              userId: userId,
            },
          },
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
          shares: {
            where: {
              userId: userId,
            },
            select: {
              permission: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      this.prisma.folder.findMany({
        where: {
          shares: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          shares: {
            where: {
              userId: userId,
            },
            select: {
              permission: true,
            },
          },
          _count: {
            select: {
              notes: true,
              children: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    return {
      notes,
      folders,
    };
  }

  /**
   * Alle Benutzer auflisten (für Freigabe-UI)
   */
  async searchUsers(query: string, currentUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: query } },
          { email: { contains: query } },
          { displayName: { contains: query } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
      },
      take: 10,
    });

    return users;
  }

  /**
   * Shares einer Notiz abrufen
   */
  async getNoteShares(noteId: string, requesterId: string) {
    // Prüfe ob Notiz existiert und User Zugriff hat
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.ownerId !== requesterId) {
      throw new Error('Only the owner can view shares');
    }

    const shares = await this.prisma.noteShare.findMany({
      where: { noteId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return shares;
  }

  /**
   * Shares eines Ordners abrufen
   */
  async getFolderShares(folderId: string, requesterId: string) {
    // Prüfe ob Ordner existiert und User Zugriff hat
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (folder.ownerId !== requesterId) {
      throw new Error('Only the owner can view shares');
    }

    const shares = await this.prisma.folderShare.findMany({
      where: { folderId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return shares;
  }
}
