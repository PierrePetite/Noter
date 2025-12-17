import { z } from 'zod';

/**
 * Validierungs-Schemas mit Zod
 */

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  content: z.any(), // TipTap JSON
  folderId: z.string().uuid().optional().nullable(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.any().optional(),
  folderId: z.string().uuid().optional().nullable(),
  isFavorite: z.boolean().optional(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  parentId: z.string().uuid().optional().nullable(),
});

export const shareSchema = z.object({
  userId: z.string().uuid(),
  permission: z.enum(['READ', 'WRITE']),
});

export const exportSchema = z.object({
  noteIds: z.array(z.string().uuid()),
  format: z.string(),
  includeAttachments: z.boolean().optional(),
  includeMetadata: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type ShareInput = z.infer<typeof shareSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
