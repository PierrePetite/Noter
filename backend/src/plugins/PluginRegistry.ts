import { IStorageProvider } from '../providers/storage/StorageProvider.interface';
import { IBackupProvider } from '../providers/backup/BackupProvider.interface';
import { IImportProvider, IExportProvider } from '../providers/import-export/ImportExportProvider.interface';

/**
 * Plugin Registry
 * Zentrales System zur Verwaltung aller Provider (Storage, Backup, Import/Export)
 */
export class PluginRegistry {
  private static instance: PluginRegistry;

  private storageProviders: Map<string, IStorageProvider> = new Map();
  private backupProviders: Map<string, IBackupProvider> = new Map();
  private importProviders: Map<string, IImportProvider> = new Map();
  private exportProviders: Map<string, IExportProvider> = new Map();

  private defaultStorageProvider: string = 'local';
  private defaultBackupProvider: string = 'local';

  private constructor() {}

  /**
   * Singleton-Instanz abrufen
   */
  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  // Storage Provider

  registerStorageProvider(provider: IStorageProvider): void {
    if (this.storageProviders.has(provider.name)) {
      console.warn(`Storage provider '${provider.name}' is already registered. Overwriting.`);
    }
    this.storageProviders.set(provider.name, provider);
    console.log(`Registered storage provider: ${provider.name}`);
  }

  getStorageProvider(name?: string): IStorageProvider {
    const providerName = name || this.defaultStorageProvider;
    const provider = this.storageProviders.get(providerName);

    if (!provider) {
      throw new Error(`Storage provider '${providerName}' not found`);
    }

    return provider;
  }

  setDefaultStorageProvider(name: string): void {
    if (!this.storageProviders.has(name)) {
      throw new Error(`Storage provider '${name}' not registered`);
    }
    this.defaultStorageProvider = name;
  }

  listStorageProviders(): string[] {
    return Array.from(this.storageProviders.keys());
  }

  // Backup Provider

  registerBackupProvider(provider: IBackupProvider): void {
    if (this.backupProviders.has(provider.name)) {
      console.warn(`Backup provider '${provider.name}' is already registered. Overwriting.`);
    }
    this.backupProviders.set(provider.name, provider);
    console.log(`Registered backup provider: ${provider.name}`);
  }

  getBackupProvider(name?: string): IBackupProvider {
    const providerName = name || this.defaultBackupProvider;
    const provider = this.backupProviders.get(providerName);

    if (!provider) {
      throw new Error(`Backup provider '${providerName}' not found`);
    }

    return provider;
  }

  setDefaultBackupProvider(name: string): void {
    if (!this.backupProviders.has(name)) {
      throw new Error(`Backup provider '${name}' not registered`);
    }
    this.defaultBackupProvider = name;
  }

  listBackupProviders(): string[] {
    return Array.from(this.backupProviders.keys());
  }

  // Import Provider

  registerImportProvider(provider: IImportProvider): void {
    if (this.importProviders.has(provider.name)) {
      console.warn(`Import provider '${provider.name}' is already registered. Overwriting.`);
    }
    this.importProviders.set(provider.name, provider);
    console.log(`Registered import provider: ${provider.name} (formats: ${provider.supportedFormats.join(', ')})`);
  }

  getImportProvider(format: string): IImportProvider {
    // Suche Provider der das Format unterstützt
    for (const provider of this.importProviders.values()) {
      if (provider.supportedFormats.includes(format.toLowerCase())) {
        return provider;
      }
    }

    throw new Error(`No import provider found for format '${format}'`);
  }

  listImportFormats(): string[] {
    const formats = new Set<string>();
    for (const provider of this.importProviders.values()) {
      provider.supportedFormats.forEach(f => formats.add(f));
    }
    return Array.from(formats);
  }

  // Export Provider

  registerExportProvider(provider: IExportProvider): void {
    if (this.exportProviders.has(provider.name)) {
      console.warn(`Export provider '${provider.name}' is already registered. Overwriting.`);
    }
    this.exportProviders.set(provider.name, provider);
    console.log(`Registered export provider: ${provider.name} (formats: ${provider.supportedFormats.join(', ')})`);
  }

  getExportProvider(format: string): IExportProvider {
    // Suche Provider der das Format unterstützt
    for (const provider of this.exportProviders.values()) {
      if (provider.supportedFormats.includes(format.toLowerCase())) {
        return provider;
      }
    }

    throw new Error(`No export provider found for format '${format}'`);
  }

  listExportFormats(): string[] {
    const formats = new Set<string>();
    for (const provider of this.exportProviders.values()) {
      provider.supportedFormats.forEach(f => formats.add(f));
    }
    return Array.from(formats);
  }

  // Gesamtübersicht

  getProviderStatus(): {
    storage: { providers: string[]; default: string };
    backup: { providers: string[]; default: string };
    import: { providers: string[]; formats: string[] };
    export: { providers: string[]; formats: string[] };
  } {
    return {
      storage: {
        providers: this.listStorageProviders(),
        default: this.defaultStorageProvider,
      },
      backup: {
        providers: this.listBackupProviders(),
        default: this.defaultBackupProvider,
      },
      import: {
        providers: Array.from(this.importProviders.keys()),
        formats: this.listImportFormats(),
      },
      export: {
        providers: Array.from(this.exportProviders.keys()),
        formats: this.listExportFormats(),
      },
    };
  }
}
