import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { signToken } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../utils/validation';

const SALT_ROUNDS = 10;

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(input: RegisterInput) {
    // Prüfe ob Email bereits existiert
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingEmail) {
      throw new Error('Email already in use');
    }

    // Prüfe ob Username bereits existiert
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: input.username },
    });

    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // User erstellen
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
        displayName: input.displayName || null,
      },
    });

    // JWT Token generieren
    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async login(input: LoginInput) {
    // User finden
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Passwort prüfen
    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // JWT Token generieren
    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async getUserById(userId: string) {
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

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
