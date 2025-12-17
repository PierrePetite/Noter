# Noter Backend

Modulares Backend für die Noter Notizen-Anwendung.

## Features

- **Modulare Architektur** mit Provider-System
- **Austauschbare Storage-Provider** (Lokal, S3, etc.)
- **Flexible Backup-Lösungen** (Lokal, Google Drive, S3, etc.)
- **Import/Export** in verschiedenen Formaten (Markdown, PDF, HTML, JSON)
- **JWT-Authentifizierung**
- **PostgreSQL-Datenbank**
- **TypeScript**
- **Fastify** Framework

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
# .env editieren und anpassen
```

### 3. Datenbank einrichten

PostgreSQL muss installiert und gestartet sein:

```bash
# PostgreSQL Datenbank erstellen
createdb noter

# Oder mit psql:
psql -U postgres
CREATE DATABASE noter;
CREATE USER noter_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE noter TO noter_user;
\q
```

### 4. Prisma Migrations ausführen

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Server starten

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Authentifizierung

- `POST /api/auth/register` - Registrierung
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Aktueller Benutzer

### Weitere Endpoints (in Entwicklung)

- `/api/notes` - Notizen-CRUD
- `/api/folders` - Ordner-Verwaltung
- `/api/shares` - Freigaben
- `/api/backups` - Backup-Verwaltung
- `/api/export` - Export-Funktionen
- `/api/import` - Import-Funktionen

## Provider-System

Das Backend verwendet ein modulares Provider-System für:

- **Storage**: Dateispeicherung (lokal, S3, etc.)
- **Backup**: Backup-Lösungen (lokal, Google Drive, etc.)
- **Import/Export**: Verschiedene Formate (Markdown, PDF, etc.)

Neue Provider können einfach hinzugefügt werden, ohne den Core-Code zu ändern.

## Entwicklung

```bash
# Entwicklungsserver mit Hot-Reload
npm run dev

# Prisma Studio (Datenbank UI)
npm run prisma:studio

# TypeScript Build
npm run build
```
