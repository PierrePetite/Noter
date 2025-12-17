import { PrismaClient } from '@prisma/client';
import { CreateFolderInput } from '../utils/validation';

export class FolderService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Alle Ordner eines Benutzers abrufen (mit Hierarchie)
   */
  async getAllFolders(userId: string) {
    const folders = await this.prisma.folder.findMany({
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
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
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
            notes: true,
            children: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return folders;
  }

  /**
   * Ordner-Baum generieren (hierarchische Struktur)
   */
  async getFolderTree(userId: string) {
    const folders = await this.getAllFolders(userId);

    // Root-Ordner (ohne Parent)
    const rootFolders = folders.filter((f) => !f.parentId);

    // Hierarchie aufbauen
    const buildTree = (parentId: string | null): any[] => {
      return folders
        .filter((f) => f.parentId === parentId)
        .map((folder) => ({
          ...folder,
          children: buildTree(folder.id),
        }));
    };

    return rootFolders.map((folder) => ({
      ...folder,
      children: buildTree(folder.id),
    }));
  }

  /**
   * Einzelnen Ordner abrufen
   */
  async getFolderById(folderId: string, userId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        notes: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
            tags: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
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

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Prüfe Zugriffsberechtigung
    const hasAccess =
      folder.ownerId === userId ||
      folder.shares.some((share) => share.userId === userId);

    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return folder;
  }

  /**
   * Neuen Ordner erstellen
   */
  async createFolder(input: CreateFolderInput, userId: string) {
    // Wenn parentId angegeben, prüfe ob Parent existiert und User Zugriff hat
    if (input.parentId) {
      const parent = await this.prisma.folder.findUnique({
        where: { id: input.parentId },
      });

      if (!parent || parent.ownerId !== userId) {
        throw new Error('Parent folder not found or access denied');
      }
    }

    const folder = await this.prisma.folder.create({
      data: {
        name: input.name,
        parentId: input.parentId || null,
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
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return folder;
  }

  /**
   * Ordner umbenennen/verschieben
   */
  async updateFolder(
    folderId: string,
    input: Partial<CreateFolderInput>,
    userId: string
  ) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (folder.ownerId !== userId) {
      throw new Error('Only the owner can update this folder');
    }

    // Wenn parentId geändert wird, prüfe Zirkelbezug
    if (input.parentId !== undefined && input.parentId !== null) {
      // Prüfe ob neuer Parent existiert
      const newParent = await this.prisma.folder.findUnique({
        where: { id: input.parentId },
      });

      if (!newParent || newParent.ownerId !== userId) {
        throw new Error('Parent folder not found or access denied');
      }

      // Prüfe ob Zirkelbezug entstehen würde
      if (await this.wouldCreateCycle(folderId, input.parentId)) {
        throw new Error('Cannot move folder: would create circular reference');
      }
    }

    const updatedFolder = await this.prisma.folder.update({
      where: { id: folderId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedFolder;
  }

  /**
   * Ordner löschen
   */
  async deleteFolder(folderId: string, userId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        children: true,
        notes: true,
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (folder.ownerId !== userId) {
      throw new Error('Only the owner can delete this folder');
    }

    // Optional: Prüfe ob Ordner leer ist
    if (folder.children.length > 0) {
      throw new Error('Cannot delete folder with subfolders');
    }

    if (folder.notes.length > 0) {
      throw new Error('Cannot delete folder with notes');
    }

    await this.prisma.folder.delete({
      where: { id: folderId },
    });

    return { success: true };
  }

  /**
   * Prüft ob das Verschieben einen Zirkelbezug erzeugen würde
   */
  private async wouldCreateCycle(
    folderId: string,
    newParentId: string
  ): Promise<boolean> {
    // Wenn der neue Parent der Ordner selbst ist
    if (folderId === newParentId) {
      return true;
    }

    // Prüfe ob newParentId ein Nachfahre von folderId ist
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === folderId) {
        return true;
      }

      const parent: { parentId: string | null } | null = await this.prisma.folder.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = parent?.parentId || null;
    }

    return false;
  }
}
