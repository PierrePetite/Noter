# Noter - Kollaborative Notizen-Webanwendung

## Projektübersicht

Noter ist eine moderne Webanwendung für das Erstellen und Verwalten von Rich-Text-Notizen, inspiriert von Synology NoteStation. Die Anwendung ermöglicht Benutzern das Erstellen, Organisieren und Teilen von Notizen mit umfangreichen Formatierungsmöglichkeiten.

## Architektur-Prinzipien

**WICHTIG**: Die gesamte Anwendung wird nach dem **Plugin/Provider-Pattern** entwickelt:
- **Modularer Aufbau**: Alle Features sind als austauschbare Module implementiert
- **Erweiterbarkeit**: Neue Features können ohne Kern-Änderungen hinzugefügt werden
- **Provider-System**: Storage, Backup und Import/Export verwenden Adapter-Pattern
- **Dependency Injection**: Services werden injiziert, nicht hart verdrahtet

**⚠️ KRITISCH: Backwards Compatibility für Daten-Exports & Backups**

Ab sofort müssen **ALLE Releases** vollständig rückwärtskompatibel mit Export- und Backup-Formaten sein:

1. **Backup-Format Versionierung**: Jedes Backup enthält ein `version`-Feld in der `metadata.json` (aktuell: `1.0.0`)
2. **Restore-Garantie**: Neuere Versionen MÜSSEN ältere Backups wiederherstellen können
3. **Breaking Changes verboten**: Änderungen am Backup-Format erfordern Migrations-Code
4. **Metadata-Erweiterungen**: Neue Felder nur additiv, nie bestehende entfernen
5. **Datenbank-Schema**: Prisma-Migrationen müssen alte Backup-Restores unterstützen

**Bei Änderungen am Backup-Format:**
- Version-Nummer erhöhen (Semantic Versioning: Major.Minor.Patch)
- Migration-Code für ältere Versionen implementieren
- Tests für Restore von allen unterstützten Versionen
- Dokumentation aktualisieren

**Beispiel für kompatible Änderungen:**
```typescript
// ✅ ERLAUBT: Neue Felder hinzufügen (mit Defaults)
metadata: {
  version: '1.1.0',
  newField?: string; // Optional mit Fallback
}

// ❌ VERBOTEN: Bestehende Felder entfernen oder umbenennen
metadata: {
  // users: number; // ❌ NICHT LÖSCHEN!
  statistics: { users: number }; // ✅ Stattdessen: Daten verschieben + Migration
}
```

Diese Regel gilt für:
- Backup-Formate (tar.gz mit metadata.json)
- Export-Formate (Markdown, HTML, PDF, JSON)
- Import-Formate (beim Erkennen von Versions-Informationen)

## Entwicklungs-Richtlinien für Claude Code

**Git & Version Control:**
- **NUR zu Git pushen, wenn explizit vom Benutzer angefordert**
- Commits können automatisch erstellt werden, wenn sinnvoll
- Vor jedem Push: Prüfung auf sensible Daten (.env, Secrets, Passwörter)
- Nach jedem Push: Commit-Hash oder URL mitteilen

## Technologie-Stack

### Frontend
- **Framework**: Vue 3 mit TypeScript ✅
- **Build-Tool**: Vite ✅
- **Rich-Text-Editor**: TipTap (ProseMirror-basiert) ✅
  - Unterstützte Formatierungen:
    - Text-Formatierung: Fett, Kursiv, Durchgestrichen, Code, Hervorheben
    - Überschriften: H1, H2, H3
    - Listen: Aufzählungen, Nummeriert, Aufgaben/Checklisten
    - Code-Blöcke mit Syntax-Highlighting (via lowlight)
    - Blockzitate
    - Links
    - Horizontale Linien
    - Tabellen (resizable, mit Header-Zeilen) ✅
    - Inline-Bilder (Drag & Drop, Paste, Upload) ✅
    - Undo/Redo
- **UI-Framework**: Tailwind CSS ✅
- **State Management**: Pinia (geplant)
- **API-Client**: Axios ✅
- **Routing**: Vue Router ✅

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify (schneller als Express)
- **Sprache**: TypeScript
- **Authentifizierung**: JWT (jsonwebtoken)
- **Passwort-Hashing**: bcrypt
- **ORM**: Prisma
- **Validierung**: Zod
- **Datei-Upload**: @fastify/multipart
- **Modulares System**: Eigenes Plugin-System für Erweiterungen

### Datenbank
- **DBMS**: PostgreSQL 16
- **Migrations**: Prisma Migrate
- **Backup**: pg_dump (täglich)

### Deployment
- **Umgebung**: LXC Container auf Proxmox
- **Reverse Proxy**: Nginx
- **Process Manager**: PM2
- **Container-OS**: Ubuntu 24.04 LTS

## Schnellstart (Entwicklung)

### Backend starten
```bash
cd backend
npm install
# .env konfigurieren (siehe Umgebungsvariablen)
npx prisma migrate dev
npm run dev
```

### Frontend starten
```bash
cd frontend
npm install
# .env mit VITE_API_URL konfigurieren
npm run dev
```

Die Anwendung ist dann verfügbar unter:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

Beim ersten Aufruf werden Sie zum Setup weitergeleitet, wo Sie einen Admin-Account erstellen können.

## Aktueller Implementierungs-Status

### ✅ Fertig implementiert (Backend)

**Phase 1: Grundfunktionen**
- [x] Benutzerregistrierung und -anmeldung (JWT)
- [x] Notizen erstellen, bearbeiten, löschen (CRUD)
- [x] TipTap JSON-Format für Rich-Text (Frontend pending)
- [x] Ordnerstruktur mit Hierarchie
- [x] Volltextsuche (Titel-basiert)
- [x] Favoriten/Sterne

**Phase 2: Erweiterte Features**
- [x] Tags für Notizen
- [x] Tag-Verwaltung
- [x] Ordner-Baum mit verschachtelten Ordnern

**Phase 3: Kollaboration**
- [x] Notizen mit Benutzern teilen
- [x] Ordner freigeben
- [x] Berechtigungen (READ/WRITE)
- [x] "Mit mir geteilt" Ansicht
- [x] Benutzer-Suche für Freigaben

**Provider-System:**
- [x] Storage Provider (Local)
- [x] Backup Provider (Local) ✅
  - Backup-Erstellung (Datenbank + Uploads)
  - Backup-Verwaltung (Liste, Download, Löschen)
  - Admin-Panel UI
  - Metadata mit Versionierung für Backwards Compatibility
- [x] Import/Export Provider (Markdown)
- [x] Import Provider (Synology NoteStation) ✅
- [x] Plugin-Registry
- [x] HTML zu TipTap JSON Konverter ✅

### 🚧 In Entwicklung

**Frontend:**
- [x] Vue 3 Setup mit Vite
- [x] TipTap Editor Integration
- [x] Authentifizierung UI (Login, Setup)
- [x] Notizen-Verwaltung (Liste, Editor)
- [x] **Ordner-Verwaltung UI** ✅
  - Hierarchischer Folder-Tree in Sidebar
  - Ordner erstellen/umbenennen/löschen
  - Notizen nach Ordner filtern
  - Unterordner-Support
- [x] **Inline-Bilder im Editor** ✅
  - Drag & Drop Upload
  - Paste aus Zwischenablage
  - Toolbar-Button für Upload
  - Automatische Integration in TipTap
- [x] **Tabellen-Unterstützung** ✅
  - TipTap Table Extensions (@tiptap/extension-table)
  - Toolbar mit 8 Buttons (Insert, Add/Delete Rows/Columns)
  - Resizable Columns
  - Header-Zeilen Support
  - Professionelles Styling (Borders, Padding, Selected Cell)
- [x] **Synology NoteStation Import** ✅
  - NSX-Datei Upload
  - HTML zu TipTap Konvertierung (inkl. Tabellen)
  - Ordner & Bilder Import
  - Import-Fortschritt & Statistiken
- [x] **Admin-Panel** ✅
  - User-Verwaltung (CRUD)
  - System-Statistiken Dashboard
  - Größte Dateien Übersicht
  - Admin-only Zugriff
- [x] **Anhänge-UI** ✅
  - NoteSidebar mit Metadata
  - Datei-Upload (Drag & Drop)
  - Attachments Liste
  - Download/Delete Funktionen
- [x] **Freigabe-UI (Komplett)** ✅
  - ShareDialog Komponente mit Benutzer-Suche
  - Permission-Auswahl und Live-Änderung (READ/WRITE)
  - Share-Status in NoteSidebar mit Benutzernamen
  - "Mit mir geteilt" Ansicht funktional
  - Share-Icon bei geteilten Notizen in Liste
  - Shares verwalten (hinzufügen/entfernen/ändern)
  - Klickbare Share-Badges öffnen Dialog
- [ ] Tags-UI implementieren

**Erweiterte Features:**
- [x] Dateianhänge/Attachments (Backend)
- [x] Bilder hochladen (Backend API)
- [x] Image Upload UI + TipTap Integration ✅
- [x] Import API-Endpoints (Synology) ✅
- [x] Attachments UI (Frontend - Datei-Upload außerhalb Editor) ✅
- [x] File Cleanup bei Notiz/User-Löschung ✅
- [x] Orphaned Files Cleanup Script ✅
- [x] **Backup System (MVP)** ✅
  - Backup Service (Datenbank + Uploads → tar.gz)
  - Backup API (Erstellen, Listen, Löschen, Download)
  - Admin Panel UI (BackupsView Component)
  - Metadata mit Versionierung (1.0.0)
  - SQLite & PostgreSQL Support
- [ ] Backup Scheduler (Cron-Integration)
- [ ] Backup Restore Funktionalität
- [ ] Versionshistorie
- [ ] PDF Export
- [ ] Öffentliche Freigabe-Links
- [ ] Export API-Endpoints (Markdown, PDF, HTML)

**Provider-Erweiterungen:**
- [x] Synology NoteStation Import Provider ✅
- [ ] S3 Storage Provider
- [ ] Google Drive Backup Provider
- [ ] PDF Export Provider
- [ ] HTML Export Provider
- [ ] Evernote Import Provider
- [ ] Notion Import Provider

## Datenmodell

### User
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  passwordHash  String
  displayName   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  ownedNotes    Note[]    @relation("NoteOwner")
  ownedFolders  Folder[]  @relation("FolderOwner")
  sharedNotes   NoteShare[]
  sharedFolders FolderShare[]
}
```

### Folder
```prisma
model Folder {
  id          String    @id @default(uuid())
  name        String
  parentId    String?
  parent      Folder?   @relation("FolderHierarchy", fields: [parentId], references: [id])
  children    Folder[]  @relation("FolderHierarchy")
  ownerId     String
  owner       User      @relation("FolderOwner", fields: [ownerId], references: [id])
  notes       Note[]
  shares      FolderShare[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Note
```prisma
model Note {
  id          String    @id @default(uuid())
  title       String
  content     Json      // TipTap JSON-Format
  folderId    String?
  folder      Folder?   @relation(fields: [folderId], references: [id])
  ownerId     String
  owner       User      @relation("NoteOwner", fields: [ownerId], references: [id])
  shares      NoteShare[]
  attachments Attachment[]
  tags        Tag[]
  isFavorite  Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### NoteShare
```prisma
model NoteShare {
  id          String    @id @default(uuid())
  noteId      String
  note        Note      @relation(fields: [noteId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  permission  Permission @default(READ)
  createdAt   DateTime  @default(now())

  @@unique([noteId, userId])
}
```

### FolderShare
```prisma
model FolderShare {
  id          String    @id @default(uuid())
  folderId    String
  folder      Folder    @relation(fields: [folderId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  permission  Permission @default(READ)
  createdAt   DateTime  @default(now())

  @@unique([folderId, userId])
}
```

### Attachment
```prisma
model Attachment {
  id          String    @id @default(uuid())
  filename    String
  mimeType    String
  size        Int
  path        String    // Pfad im Dateisystem
  noteId      String
  note        Note      @relation(fields: [noteId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
}
```

### Tag
```prisma
model Tag {
  id          String    @id @default(uuid())
  name        String    @unique
  notes       Note[]
  createdAt   DateTime  @default(now())
}

enum Permission {
  READ
  WRITE
}
```

## Modulares Plugin-System

### Storage Provider Interface

Alle Datei-Operationen laufen über abstrakte Provider, die einfach ausgetauscht werden können:

```typescript
// backend/src/providers/storage/StorageProvider.interface.ts
export interface IStorageProvider {
  name: string;

  // Datei-Operationen
  upload(file: Buffer, path: string, metadata?: Record<string, any>): Promise<StorageFile>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getUrl(path: string): Promise<string>;

  // Metadaten
  getMetadata(path: string): Promise<Record<string, any>>;
  updateMetadata(path: string, metadata: Record<string, any>): Promise<void>;
}

export interface StorageFile {
  path: string;
  size: number;
  mimeType: string;
  url: string;
  metadata?: Record<string, any>;
}
```

**Implementierte Provider:**
- `LocalStorageProvider` (Standard): Lokales Dateisystem
- `S3StorageProvider` (optional): S3-kompatibler Speicher (MinIO, AWS S3, etc.)
- Zukünftig: GoogleDrive, Dropbox, OneDrive, etc.

### Backup Provider Interface

```typescript
// backend/src/providers/backup/BackupProvider.interface.ts
export interface IBackupProvider {
  name: string;
  isConfigured(): Promise<boolean>;

  // Backup-Operationen
  createBackup(): Promise<Backup>;
  restoreBackup(backupId: string): Promise<void>;
  listBackups(): Promise<Backup[]>;
  deleteBackup(backupId: string): Promise<void>;

  // Automatisierung
  scheduleBackup(schedule: string): Promise<void>;
  getSchedule(): Promise<string | null>;
}

export interface Backup {
  id: string;
  timestamp: Date;
  size: number;
  provider: string;
  metadata?: {
    noteCount: number;
    userCount: number;
    fileCount: number;
  };
}
```

**Implementierte Provider:**
- `LocalBackupProvider` (Standard): Lokale Backups
- `GoogleDriveBackupProvider` (erweiterbar): Google Drive Integration
- `S3BackupProvider` (erweiterbar): S3-basierte Backups
- Zukünftig: Dropbox, OneDrive, FTP, WebDAV, etc.

### Import/Export Provider Interface

```typescript
// backend/src/providers/import-export/ImportExportProvider.interface.ts
export interface IImportProvider {
  name: string;
  supportedFormats: string[];

  import(data: Buffer, format: string, options?: ImportOptions): Promise<ImportResult>;
  validate(data: Buffer, format: string): Promise<ValidationResult>;
}

export interface IExportProvider {
  name: string;
  supportedFormats: string[];

  export(noteIds: string[], format: string, options?: ExportOptions): Promise<Buffer>;
  exportAll(userId: string, format: string, options?: ExportOptions): Promise<Buffer>;
}

export interface ImportResult {
  success: boolean;
  notesCreated: number;
  foldersCreated: number;
  errors?: string[];
}

export interface ExportOptions {
  includeAttachments?: boolean;
  includeMetadata?: boolean;
  format?: 'zip' | 'single';
}
```

**Implementierte Provider:**
- `MarkdownImportExportProvider`: Markdown-Import/-Export
- `SynologyImportProvider` ✅: Synology NoteStation Import (.nsx Dateien)
  - ZIP-Entpackung von NSX-Backups
  - HTML zu TipTap JSON Konvertierung
  - Ordner-Hierarchie Import
  - Bilder & Attachments Upload
  - Tags-Migration
  - Unterstützt alle HTML-Formatierungen (Überschriften, Listen, Links, Bilder, Code-Blöcke, etc.)
- `HTMLExportProvider`: HTML-Export (geplant)
- `PDFExportProvider`: PDF-Export (mit puppeteer, geplant)
- `JSONImportExportProvider`: Vollständiger Daten-Export im JSON-Format (geplant)
- Zukünftig: Evernote, Notion, OneNote, etc.

### Backup System - Technische Details

Das Backup-System erstellt vollständige Datensicherungen der Noter-Anwendung im tar.gz-Format:

**Architektur:**
```
BackupService
├── Backup-Erstellung
│   ├── 1. Temp-Verzeichnis erstellen
│   ├── 2. Datenbank-Backup
│   │   ├── SQLite: Datei kopieren
│   │   └── PostgreSQL: pg_dump (Custom Format -Fc)
│   ├── 3. Uploads-Verzeichnis kopieren
│   │   └── Filter: .tmp und Hidden Files ausschließen
│   ├── 4. Metadata erstellen (metadata.json)
│   │   ├── version: "1.0.0" (Backup-Format Version)
│   │   ├── appVersion: Noter Version
│   │   ├── database: { name, size }
│   │   ├── uploads: { fileCount, totalSize }
│   │   └── statistics: { users, notes, folders, shares, attachments, tags }
│   ├── 5. Komprimierung (tar -czf)
│   └── 6. Cleanup + DB-Update
├── Backup-Verwaltung
│   ├── Liste (sortiert nach Datum)
│   ├── Download (File Streaming)
│   └── Löschen (File + DB-Record)
└── Admin-UI (BackupsView Component)
    ├── Status-Anzeige (IN_PROGRESS, COMPLETED, FAILED)
    ├── Metadata-Anzeige (Größe, Statistiken)
    └── Aktionen (Erstellen, Download, Löschen)
```

**Backup-Inhalt:**
```
backup_timestamp.tar.gz
├── database.sql          # SQLite-Datei oder pg_dump Output
├── uploads/              # Alle hochgeladenen Dateien
│   ├── images/
│   └── attachments/
└── metadata.json         # Backup-Metadaten mit Version
```

**Metadata-Format (v1.0.0):**
```json
{
  "version": "1.0.0",
  "appVersion": "1.0.0",
  "createdAt": "2025-12-17T...",
  "type": "data",
  "database": {
    "name": "sqlite" | "postgres",
    "size": 1234567
  },
  "uploads": {
    "fileCount": 42,
    "totalSize": 9876543
  },
  "statistics": {
    "users": 5,
    "notes": 123,
    "folders": 12,
    "shares": 8,
    "attachments": 15,
    "tags": 20
  }
}
```

**Versionierung & Backwards Compatibility:**
- **Aktuell**: Version 1.0.0
- **Format**: Semantic Versioning (Major.Minor.Patch)
- **Garantie**: Neuere Versionen müssen ältere Backups wiederherstellen können
- **Breaking Changes**: Nur mit Major-Version-Erhöhung + Migration-Code

**API-Endpoints:**
- `GET /api/backups` - Liste aller Backups
- `POST /api/backups` - Neues Backup erstellen
- `GET /api/backups/:id/download` - Backup herunterladen
- `DELETE /api/backups/:id` - Backup löschen

**Umgebungsvariablen:**
- `BACKUP_DIR` - Verzeichnis für Backups (default: `./backups`)
- `DATABASE_URL` - Für DB-Type-Erkennung (SQLite/PostgreSQL)

**Geplante Features:**
- Automatisches Scheduling (node-cron)
- Restore-Funktionalität
- Google Drive Backup Provider
- S3 Backup Provider
- Retention Policy (Auto-Delete alter Backups)

#### Synology Import - Technische Details

Der Synology NoteStation Importer ist ein vollständiger Import-Provider für .nsx Backup-Dateien:

**Architektur:**
```
SynologyImportProvider
├── NSX-Extraktion (adm-zip)
├── Config.json Parsing
├── HTML zu TipTap Konverter (htmlToTiptap.ts)
│   ├── Heading-Konvertierung (h1-h6)
│   ├── Listen (ul, ol, task lists)
│   ├── Text-Formatierung (bold, italic, strike, code, highlight)
│   ├── Links & Bilder
│   ├── Code-Blöcke mit Syntax-Highlighting
│   ├── Blockquotes & horizontale Linien
│   └── Tabellen (table, thead, tbody, tr, td, th) ✅
│       ├── Header-Erkennung (thead/th)
│       ├── Verschachtelte Strukturen
│       └── Text in Zellen → Paragraph-Wrapping
├── Ordner-Import
│   ├── Synology ID → Noter UUID Mapping
│   └── Hierarchie-Unterstützung (flach im aktuellen Backup)
├── Notizen-Import
│   ├── Titel & Content
│   ├── Timestamps (optional beibehalten)
│   └── Ordner-Zuordnung
├── Bild-Upload
│   ├── MD5-basierte Datei-Referenzen
│   ├── Upload über StorageProvider
│   └── URL-Mapping für Editor
└── Tags-Migration (optional)
```

**Unterstützte Formate:**
- Alle Synology HTML-Formatierungen
- Inline-Bilder mit ref-Attributen
- Base64-kodierte Dateinamen
- Externe Links (https://...)
- Interne Anker-Links
- Synology-spezifische CSS-Klassen

**Import-Optionen:**
- `preserveTimestamps`: Originale Erstellungs- und Änderungsdaten beibehalten
- `skipErrors`: Fehlerhafte Notizen überspringen und Import fortsetzen

**Bekannte Einschränkungen:**
- Stack (verschachtelte Notizbücher) werden aktuell nicht unterstützt (alle auf Root-Level)
- Inline-Styles werden entfernt (nicht kompatibel mit TipTap)
- Komplexe Tabellen-Merging (rowspan/colspan) werden nicht unterstützt

**Performance:**
- ~65 Notizen in ~10-15 Sekunden
- ~50 Bilder werden parallel hochgeladen
- Fehlertoleranz durch `skipErrors`-Option

### Plugin-Registry

```typescript
// backend/src/plugins/PluginRegistry.ts
export class PluginRegistry {
  private storageProviders: Map<string, IStorageProvider> = new Map();
  private backupProviders: Map<string, IBackupProvider> = new Map();
  private importProviders: Map<string, IImportProvider> = new Map();
  private exportProviders: Map<string, IExportProvider> = new Map();

  // Provider registrieren
  registerStorageProvider(provider: IStorageProvider): void;
  registerBackupProvider(provider: IBackupProvider): void;
  registerImportProvider(provider: IImportProvider): void;
  registerExportProvider(provider: IExportProvider): void;

  // Provider abrufen
  getStorageProvider(name?: string): IStorageProvider;
  getBackupProvider(name?: string): IBackupProvider;
  getImportProvider(format: string): IImportProvider;
  getExportProvider(format: string): IExportProvider;

  // Liste aller verfügbaren Provider
  listStorageProviders(): string[];
  listBackupProviders(): string[];
  listImportFormats(): string[];
  listExportFormats(): string[];
}
```

### Konfiguration der Provider

```typescript
// backend/src/config/providers.config.ts
export interface ProviderConfig {
  storage: {
    default: 'local' | 's3' | string;
    providers: {
      local?: {
        uploadDir: string;
      };
      s3?: {
        endpoint: string;
        bucket: string;
        accessKey: string;
        secretKey: string;
      };
    };
  };

  backup: {
    enabled: boolean;
    schedule: string; // Cron-Format
    retention: number; // Tage
    default: 'local' | 'gdrive' | 's3' | string;
    providers: {
      local?: {
        backupDir: string;
      };
      gdrive?: {
        clientId: string;
        clientSecret: string;
        refreshToken: string;
        folderId?: string;
      };
      s3?: {
        endpoint: string;
        bucket: string;
        accessKey: string;
        secretKey: string;
      };
    };
  };

  export: {
    pdf: {
      enabled: boolean;
    };
    markdown: {
      enabled: boolean;
    };
  };
}
```

## API-Struktur (✅ = Implementiert)

### Authentifizierung ✅
```
POST   /api/auth/register      - Benutzerregistrierung
POST   /api/auth/login         - Anmeldung (liefert JWT)
GET    /api/auth/me            - Aktuellen Benutzer abrufen
```

### Notizen ✅
```
GET    /api/notes              - Alle eigenen Notizen (+ geteilte)
GET    /api/notes/favorites    - Alle Favoriten
GET    /api/notes/search?q=    - Notizen durchsuchen
GET    /api/notes/:id          - Einzelne Notiz abrufen
POST   /api/notes              - Neue Notiz erstellen
PUT    /api/notes/:id          - Notiz aktualisieren
DELETE /api/notes/:id          - Notiz löschen
POST   /api/notes/:id/favorite - Favorit toggle
```

### Ordner ✅
```
GET    /api/folders            - Alle Ordner (flach)
GET    /api/folders/tree       - Ordner-Baum (hierarchisch)
GET    /api/folders/:id        - Ordner mit Notizen
POST   /api/folders            - Neuen Ordner erstellen
PUT    /api/folders/:id        - Ordner umbenennen/verschieben
DELETE /api/folders/:id        - Ordner löschen
```

### Freigaben ✅
```
POST   /api/shares/notes/:id/share           - Notiz freigeben
DELETE /api/shares/notes/:id/share/:userId   - Notiz-Freigabe entfernen
GET    /api/notes/:id/shares                 - Shares einer Notiz abrufen ✅
POST   /api/shares/folders/:id/share         - Ordner freigeben
DELETE /api/shares/folders/:id/share/:userId - Ordner-Freigabe entfernen
GET    /api/folders/:id/shares               - Shares eines Ordners abrufen ✅
GET    /api/shares/with-me                   - Mit mir geteilte Inhalte
GET    /api/shares/users/search?q=           - Benutzer für Freigabe suchen
```

### Tags ✅
```
GET    /api/tags                    - Alle Tags
POST   /api/tags                    - Neuen Tag erstellen
GET    /api/tags/:id/notes          - Alle Notizen mit Tag
PUT    /api/tags/notes/:id/tags     - Tags zu Notiz hinzufügen
DELETE /api/tags/notes/:id/tags     - Tags von Notiz entfernen
```

### Anhänge ✅
```
POST   /api/notes/:id/attachments - Datei zu Notiz hochladen
GET    /api/notes/:id/attachments - Alle Attachments einer Notiz
GET    /api/attachments/:id       - Attachment herunterladen
DELETE /api/attachments/:id       - Attachment löschen
POST   /api/upload/image          - Bild hochladen (für Editor)
```

### Import/Export ✅
```
POST   /api/import/synology    - Synology NSX Import (Multipart mit .nsx File) ✅
GET    /api/import/formats     - Verfügbare Import-Formate ✅
POST   /api/export/notes       - Notizen exportieren (Body: {noteIds: [], format: 'md'|'html'|'pdf'|'json'})
POST   /api/export/all         - Alle Notizen exportieren
GET    /api/export/formats     - Verfügbare Export-Formate
```

### Backup ✅
```
GET    /api/backups                - Alle Backups auflisten ✅
POST   /api/backups                - Manuelles Backup erstellen ✅
GET    /api/backups/:id/download   - Backup herunterladen ✅
DELETE /api/backups/:id            - Backup löschen ✅
GET    /api/backups/:id            - Backup-Details abrufen (geplant)
POST   /api/backups/:id/restore    - Backup wiederherstellen (geplant)
GET    /api/backups/providers      - Verfügbare Backup-Provider (geplant)
PUT    /api/backups/schedule       - Backup-Zeitplan konfigurieren (geplant)
GET    /api/backups/schedule       - Aktuellen Zeitplan abrufen (geplant)
```

### Admin/Settings (nur für Admins) ✅
```
GET    /api/admin/stats        - System-Statistiken ✅
GET    /api/admin/users        - Alle Benutzer ✅
GET    /api/admin/users/:id    - Einzelner Benutzer ✅
POST   /api/admin/users        - Benutzer erstellen ✅
PUT    /api/admin/users/:id    - Benutzer aktualisieren ✅
DELETE /api/admin/users/:id    - Benutzer löschen ✅
GET    /api/admin/users/:id/stats - Benutzer-Statistiken ✅
GET    /api/admin/providers    - Alle konfigurierten Provider
PUT    /api/admin/providers/:type/:name/config - Provider konfigurieren
POST   /api/admin/providers/:type/:name/test   - Provider-Verbindung testen
```

## Projektstruktur

```
noter/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── notes.ts
│   │   │   ├── folders.ts
│   │   │   ├── shares.ts
│   │   │   ├── attachments.ts
│   │   │   ├── tags.ts
│   │   │   └── import.ts ✅
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── note.service.ts
│   │   │   ├── folder.service.ts
│   │   │   ├── share.service.ts
│   │   │   └── storage.service.ts
│   │   ├── providers/
│   │   │   ├── storage/
│   │   │   │   └── LocalStorageProvider.ts
│   │   │   ├── backup/
│   │   │   │   └── LocalBackupProvider.ts
│   │   │   └── import-export/
│   │   │       ├── MarkdownProvider.ts
│   │   │       └── SynologyImportProvider.ts ✅
│   │   ├── plugins/
│   │   │   ├── PluginRegistry.ts
│   │   │   └── initializeProviders.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── validation.ts
│   │   │   └── htmlToTiptap.ts ✅
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── uploads/          # Hochgeladene Dateien
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/                     ✅ Implementiert
│   │   │   ├── client.ts           # Axios-Client mit Auth-Interceptor
│   │   │   ├── notes.ts            # Notizen-API-Service
│   │   │   ├── folders.ts          # Ordner-API-Service ✅
│   │   │   ├── images.ts           # Bild-Upload-API-Service ✅
│   │   │   └── shares.ts           # Sharing-API-Service ✅
│   │   ├── components/              ✅ Implementiert
│   │   │   ├── TipTapEditor.vue    # Rich-Text-Editor mit Toolbar ✅
│   │   │   ├── FolderTree.vue      # Ordner-Baum Sidebar ✅
│   │   │   ├── FolderTreeItem.vue  # Rekursives Ordner-Item ✅
│   │   │   ├── FolderDialog.vue    # Ordner erstellen/umbenennen ✅
│   │   │   ├── ConfirmDialog.vue   # Bestätigungs-Dialog ✅
│   │   │   ├── NoteSidebar.vue     # Notiz-Metadaten & Anhänge ✅
│   │   │   ├── ShareDialog.vue     # Freigabe-Dialog ✅
│   │   │   └── admin/              # Admin-Komponenten ✅
│   │   │       ├── DashboardView.vue
│   │   │       └── UserManagementView.vue
│   │   ├── layouts/
│   │   │   └── MainLayout.vue      # Haupt-Layout mit Sidebar ✅
│   │   ├── views/                   ✅ Implementiert
│   │   │   ├── SetupView.vue       # Ersteinrichtung
│   │   │   ├── LoginView.vue       # Login-Seite
│   │   │   ├── NotesView.vue       # Notizen-Liste
│   │   │   ├── NoteEditorView.vue  # Notiz bearbeiten
│   │   │   └── ImportView.vue      # Synology Import ✅
│   │   ├── router/                  ✅ Implementiert
│   │   │   └── index.ts            # Vue Router mit Auth-Guards
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── style.css
│   ├── public/
│   │   └── favicon.ico
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker-compose.yml    # Für lokale Entwicklung
└── README.md
```

## Deployment auf Proxmox LXC

### 1. LXC Container erstellen
```bash
# In Proxmox UI:
# - Container erstellen mit Ubuntu 24.04 template
# - 2 CPU cores, 4GB RAM, 20GB Storage
# - Netzwerk: Bridge zu vmbr0, statische IP oder DHCP
```

### 2. Container vorbereiten
```bash
# Im LXC Container:
apt update && apt upgrade -y
apt install -y curl git nginx postgresql-16

# Node.js 20 installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2 global installieren
npm install -g pm2
```

### 3. PostgreSQL einrichten
```bash
# PostgreSQL konfigurieren
sudo -u postgres psql

CREATE DATABASE noter;
CREATE USER noter_user WITH PASSWORD 'sicheres_passwort';
GRANT ALL PRIVILEGES ON DATABASE noter TO noter_user;
\q
```

### 4. Anwendung deployen
```bash
# Repository klonen
cd /opt
git clone <repository-url> noter
cd noter

# Backend setup
cd backend
npm install
cp .env.example .env
# .env editieren mit DB-Credentials

# Prisma migrations
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# Frontend setup
cd ../frontend
npm install
# .env mit API-URL konfigurieren
npm run build

# Frontend Build nach Nginx kopieren
sudo cp -r dist/* /var/www/noter/
```

### 5. PM2 konfigurieren
```bash
# Backend mit PM2 starten
cd /opt/noter/backend
pm2 start npm --name "noter-api" -- start
pm2 save
pm2 startup
```

### 6. Nginx konfigurieren
```nginx
# /etc/nginx/sites-available/noter
server {
    listen 80;
    server_name noter.local;  # Oder deine Domain

    # Frontend
    location / {
        root /var/www/noter;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Uploads
    location /uploads {
        alias /opt/noter/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 50M;
}
```

```bash
# Nginx aktivieren
ln -s /etc/nginx/sites-available/noter /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 7. Firewall (optional)
```bash
apt install -y ufw
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

### 8. Backup-Script
```bash
# /opt/noter/backup.sh
#!/bin/bash
BACKUP_DIR="/opt/noter/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Datenbank Backup
pg_dump -U noter_user noter > "$BACKUP_DIR/db_$DATE.sql"

# Uploads Backup
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /opt/noter/backend/uploads

# Alte Backups löschen (älter als 30 Tage)
find $BACKUP_DIR -type f -mtime +30 -delete
```

```bash
# Cronjob für tägliches Backup
crontab -e
# Hinzufügen:
0 2 * * * /opt/noter/backup.sh
```

## Entwicklungs-Roadmap

### Sprint 1 (Woche 1-2): Grundgerüst
- Projekt-Setup (Backend + Frontend)
- Datenbank-Schema mit Prisma
- Authentifizierung (Register/Login)
- Grundlegendes UI-Layout

### Sprint 2 (Woche 3-4): Kern-Funktionalität
- CRUD-Operationen für Notizen
- TipTap-Editor-Integration
- Basis-Formatierung (Text, Listen, Links)
- Ordner-Verwaltung

### Sprint 3 (Woche 5-6): Erweiterte Formatierung
- [x] Tabellen ✅
- [x] Bilder hochladen und einbetten ✅
- [x] Code-Blöcke mit Syntax-Highlighting ✅
- [ ] Dateianhänge (Backend fertig, UI pending)

### Sprint 4 (Woche 7-8): Freigabe-Funktionen
- Notizen teilen
- Ordner teilen
- Berechtigungssystem
- UI für Freigabe-Verwaltung

### Sprint 5 (Woche 9-10): Polish & Deployment
- Suchfunktion
- Tags
- Export-Funktionen
- LXC-Deployment
- Testing & Bugfixes

## Umgebungsvariablen

### Backend (.env)
```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL="postgresql://noter_user:password@localhost:5432/noter"

# JWT
JWT_SECRET=<generiere-sicheren-random-string>
JWT_EXPIRES_IN=7d

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB
```

### Frontend (.env)
```env
VITE_API_URL=http://noter.local/api
```

## Sicherheitsüberlegungen

1. **Passwörter**: bcrypt mit mind. 10 Rounds
2. **JWT**: HTTP-only Cookies für Tokens (XSS-Schutz)
3. **CORS**: Nur spezifische Origins erlauben
4. **Rate Limiting**: Fastify-Rate-Limit für API
5. **Input Validation**: Zod für alle API-Inputs
6. **SQL Injection**: Prisma ORM (parameterisierte Queries)
7. **File Uploads**: MIME-Type-Validierung, Größenbegrenzung
8. **HTTPS**: In Produktion mit Let's Encrypt
9. **Permissions**: Strenge Prüfung bei jedem Zugriff

## Nächste Schritte

**Priorität 1 - Kern-Features vervollständigen:**
1. **Freigabe-UI vervollständigen**
   - [x] ShareDialog Komponente ✅
   - [x] Share-Button in NoteSidebar ✅
   - [ ] Share-Button in Note Toolbar
   - [ ] Share-Option im FolderTree Kontextmenü
   - [ ] "Mit mir geteilt" View aktualisieren
   - [ ] Visuelle Badges für geteilte Items

2. **Tags-UI implementieren**
   - Tag-Auswahl beim Bearbeiten
   - Filterung nach Tags in der Sidebar
   - Tag-Verwaltung (erstellen/löschen)

**Priorität 2 - Admin & Management:**
3. **Admin-Panel** ✅
   - [x] User-Verwaltung (CRUD) ✅
   - [x] System-Statistiken ✅
   - [x] Admin-only Zugriff ✅

4. **Export-Funktionen**
   - Markdown Export
   - HTML Export
   - PDF Export (mit puppeteer)
   - ZIP-Download mit Attachments

**Priorität 3 - Deployment & Production:**
5. **Automatisiertes LXC Deployment**
   - One-Click Install Script
   - Automatische Konfiguration (DB, ENV, Nginx)
   - Let's Encrypt SSL Integration
   - PM2 Setup & Monitoring
   - Backup-Automatisierung

**Priorität 4 - Erweiterte Features:**
6. **Erweiterte Editor-Features**
   - Embed-Funktionen (YouTube, iFrames, etc.)
   - Latex/Math-Support
   - Mermaid Diagramme
   - Kollaboratives Editing (CRDT/Y.js)

7. **Suchfunktion verbessern**
   - Volltextsuche über Content
   - Filter nach Tags, Ordnern, Datum
   - Suche in geteilten Notizen

8. **Versionshistorie**
   - Automatisches Versioning bei Änderungen
   - Diff-Ansicht zwischen Versionen
   - Restore zu alter Version

**Deployment:**
1. Production Build konfigurieren
2. LXC Container aufsetzen
3. Nginx mit SSL/TLS (Let's Encrypt)
4. PM2 Prozess-Management
5. Backup-Automatisierung (Cron Jobs)

## Hilfreiche Ressourcen

- TipTap Dokumentation: https://tiptap.dev
- Prisma Dokumentation: https://www.prisma.io/docs
- Fastify Dokumentation: https://www.fastify.io
- Vue 3 Dokumentation: https://vuejs.org
- Pinia Dokumentation: https://pinia.vuejs.org
