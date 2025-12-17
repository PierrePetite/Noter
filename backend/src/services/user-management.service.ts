import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  isAdmin?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  username?: string;
  displayName?: string;
  isAdmin?: boolean;
  password?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserManagementService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Alle Benutzer abrufen (nur für Admins)
   */
  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  /**
   * Einzelnen Benutzer abrufen
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Neuen Benutzer erstellen
   */
  async createUser(data: CreateUserDto): Promise<UserResponse> {
    // Prüfen ob Email bereits existiert
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new Error('Email bereits vergeben');
    }

    // Prüfen ob Username bereits existiert
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUsername) {
      throw new Error('Username bereits vergeben');
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Benutzer erstellen
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        displayName: data.displayName || null,
        isAdmin: data.isAdmin || false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Benutzer aktualisieren
   */
  async updateUser(userId: string, data: UpdateUserDto): Promise<UserResponse> {
    // Prüfen ob Benutzer existiert
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error('Benutzer nicht gefunden');
    }

    // Prüfen ob Email bereits von anderem Benutzer verwendet wird
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new Error('Email bereits vergeben');
      }
    }

    // Prüfen ob Username bereits von anderem Benutzer verwendet wird
    if (data.username && data.username !== existingUser.username) {
      const usernameExists = await this.prisma.user.findUnique({
        where: { username: data.username },
      });

      if (usernameExists) {
        throw new Error('Username bereits vergeben');
      }
    }

    // Update-Daten vorbereiten
    const updateData: any = {};

    if (data.email) updateData.email = data.email;
    if (data.username) updateData.username = data.username;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;

    // Passwort hashen falls angegeben
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Benutzer aktualisieren
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Benutzer löschen
   */
  async deleteUser(userId: string): Promise<void> {
    // Prüfen ob Benutzer existiert
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Benutzer nicht gefunden');
    }

    // Alle Attachments des Benutzers finden und physische Dateien löschen
    const attachments = await this.prisma.attachment.findMany({
      where: {
        note: {
          ownerId: userId,
        },
      },
    });

    if (attachments.length > 0) {
      await this.deleteAttachmentFiles(attachments);
    }

    // Benutzer löschen (Cascade löscht automatisch alle zugehörigen Notizen, Ordner, etc.)
    await this.prisma.user.delete({
      where: { id: userId },
    });
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
   * Benutzer-Statistiken abrufen
   */
  async getUserStats(userId: string): Promise<{
    noteCount: number;
    folderCount: number;
    storageUsed: number;
  }> {
    const [noteCount, folderCount] = await Promise.all([
      this.prisma.note.count({
        where: { ownerId: userId },
      }),
      this.prisma.folder.count({
        where: { ownerId: userId },
      }),
    ]);

    // Storage berechnen (Attachments)
    const attachments = await this.prisma.attachment.findMany({
      where: {
        note: {
          ownerId: userId,
        },
      },
      select: {
        size: true,
      },
    });

    const storageUsed = attachments.reduce((sum, att) => sum + att.size, 0);

    return {
      noteCount,
      folderCount,
      storageUsed,
    };
  }
}
