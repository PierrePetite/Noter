/**
 * Storage Provider Interface
 * Abstraction für verschiedene Speicher-Backends (Lokal, S3, Google Drive, etc.)
 */

export interface StorageFile {
  path: string;
  size: number;
  mimeType: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface IStorageProvider {
  /** Name des Providers (z.B. 'local', 's3', 'gdrive') */
  readonly name: string;

  /**
   * Datei hochladen
   * @param file - Datei-Buffer
   * @param path - Ziel-Pfad (relativ)
   * @param metadata - Optionale Metadaten
   */
  upload(file: Buffer, path: string, metadata?: Record<string, any>): Promise<StorageFile>;

  /**
   * Datei herunterladen
   * @param path - Pfad zur Datei
   */
  download(path: string): Promise<Buffer>;

  /**
   * Datei löschen
   * @param path - Pfad zur Datei
   */
  delete(path: string): Promise<void>;

  /**
   * Prüfen ob Datei existiert
   * @param path - Pfad zur Datei
   */
  exists(path: string): Promise<boolean>;

  /**
   * URL zur Datei generieren
   * @param path - Pfad zur Datei
   */
  getUrl(path: string): Promise<string>;

  /**
   * Metadaten abrufen
   * @param path - Pfad zur Datei
   */
  getMetadata(path: string): Promise<Record<string, any>>;

  /**
   * Metadaten aktualisieren
   * @param path - Pfad zur Datei
   * @param metadata - Neue Metadaten
   */
  updateMetadata(path: string, metadata: Record<string, any>): Promise<void>;
}
