import { promises as fs } from 'fs';
import path from 'path';
import { IStorageProvider, StorageFile } from './StorageProvider.interface';

export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local';
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir: string, baseUrl: string = '/uploads') {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;
  }

  async upload(file: Buffer, filePath: string, metadata?: Record<string, any>): Promise<StorageFile> {
    const fullPath = path.join(this.uploadDir, filePath);
    const dir = path.dirname(fullPath);

    // Erstelle Verzeichnis falls nicht vorhanden
    await fs.mkdir(dir, { recursive: true });

    // Schreibe Datei
    await fs.writeFile(fullPath, file);

    // Speichere Metadaten wenn vorhanden
    if (metadata) {
      const metadataPath = `${fullPath}.meta.json`;
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    const stats = await fs.stat(fullPath);

    return {
      path: filePath,
      size: stats.size,
      mimeType: metadata?.mimeType || 'application/octet-stream',
      url: `${this.baseUrl}/${filePath}`,
      metadata,
    };
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, filePath);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);
    const metadataPath = `${fullPath}.meta.json`;

    try {
      await fs.unlink(fullPath);
      // Lösche auch Metadaten falls vorhanden
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Ignoriere wenn Metadaten nicht existieren
      }
    } catch (error) {
      throw new Error(`Failed to delete file: ${filePath}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getUrl(filePath: string): Promise<string> {
    return `${this.baseUrl}/${filePath}`;
  }

  async getMetadata(filePath: string): Promise<Record<string, any>> {
    const fullPath = path.join(this.uploadDir, filePath);
    const metadataPath = `${fullPath}.meta.json`;

    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(metadataContent);
    } catch {
      return {};
    }
  }

  async updateMetadata(filePath: string, metadata: Record<string, any>): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);
    const metadataPath = `${fullPath}.meta.json`;

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }
}
