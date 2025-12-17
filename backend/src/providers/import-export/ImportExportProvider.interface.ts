/**
 * Import/Export Provider Interface
 * Abstraction für verschiedene Import-/Export-Formate
 */

export interface ImportOptions {
  targetFolderId?: string;
  preserveStructure?: boolean;
  overwriteExisting?: boolean;
}

export interface ImportResult {
  success: boolean;
  notesCreated: number;
  foldersCreated: number;
  errors?: string[];
  warnings?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ExportOptions {
  includeAttachments?: boolean;
  includeMetadata?: boolean;
  format?: 'zip' | 'single' | 'folder';
  preserveStructure?: boolean;
}

/**
 * Import Provider Interface
 */
export interface IImportProvider {
  /** Name des Providers (z.B. 'markdown', 'evernote', 'notion') */
  readonly name: string;

  /** Unterstützte Formate (z.B. ['md', 'markdown']) */
  readonly supportedFormats: string[];

  /**
   * Daten importieren
   * @param data - Import-Daten als Buffer
   * @param format - Format-Identifikator
   * @param userId - User-ID für Ownership
   * @param options - Import-Optionen
   */
  import(
    data: Buffer,
    format: string,
    userId: string,
    options?: ImportOptions
  ): Promise<ImportResult>;

  /**
   * Import-Daten validieren
   * @param data - Zu validierende Daten
   * @param format - Format-Identifikator
   */
  validate(data: Buffer, format: string): Promise<ValidationResult>;
}

/**
 * Export Provider Interface
 */
export interface IExportProvider {
  /** Name des Providers (z.B. 'markdown', 'pdf', 'html') */
  readonly name: string;

  /** Unterstützte Formate (z.B. ['md', 'markdown']) */
  readonly supportedFormats: string[];

  /**
   * Notizen exportieren
   * @param noteIds - Array von Notiz-IDs
   * @param format - Export-Format
   * @param options - Export-Optionen
   */
  export(noteIds: string[], format: string, options?: ExportOptions): Promise<Buffer>;

  /**
   * Alle Notizen eines Benutzers exportieren
   * @param userId - User-ID
   * @param format - Export-Format
   * @param options - Export-Optionen
   */
  exportAll(userId: string, format: string, options?: ExportOptions): Promise<Buffer>;
}
