import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { signToken } from '../utils/jwt';

const SALT_ROUNDS = 10;

export class SetupService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Prüft ob Setup erforderlich ist (kein Admin existiert)
   */
  async isSetupRequired(): Promise<boolean> {
    const adminCount = await this.prisma.user.count({
      where: { isAdmin: true },
    });

    return adminCount === 0;
  }

  /**
   * Initialisiert die Anwendung mit dem ersten Admin-User
   */
  async initializeApp(data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) {
    // Prüfe ob Setup bereits durchgeführt wurde
    const setupRequired = await this.isSetupRequired();

    if (!setupRequired) {
      throw new Error('Setup already completed');
    }

    // Validiere Input
    if (!data.email || !data.username || !data.password) {
      throw new Error('Email, username and password are required');
    }

    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Ersten Admin-User erstellen
    const admin = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        displayName: data.displayName || null,
        isAdmin: true, // Erster User ist immer Admin
      },
    });

    // JWT Token generieren
    const token = signToken({
      userId: admin.id,
      email: admin.email,
      username: admin.username,
      isAdmin: admin.isAdmin,
    });

    return {
      user: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        displayName: admin.displayName,
        isAdmin: admin.isAdmin,
        createdAt: admin.createdAt,
      },
      token,
    };
  }

  /**
   * System-Statistiken für Setup-Seite
   */
  async getSystemStats() {
    const [userCount, noteCount, folderCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.note.count(),
      this.prisma.folder.count(),
    ]);

    return {
      users: userCount,
      notes: noteCount,
      folders: folderCount,
      setupRequired: await this.isSetupRequired(),
    };
  }
}
