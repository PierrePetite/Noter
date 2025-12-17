# Noter

A modern, self-hosted note-taking application with rich text editing, folder organization, and collaborative features.

## Features

### ✅ Core Features
- **Rich Text Editor** powered by TipTap
  - Text formatting (bold, italic, strikethrough, code, highlight)
  - Headings (H1-H3)
  - Lists (bullet, numbered, task lists)
  - Code blocks with syntax highlighting
  - Blockquotes, links, and horizontal rules
  - Inline images with drag & drop support
  - Paste images from clipboard

- **Organization**
  - Hierarchical folder structure
  - Tags for categorization
  - Favorites/starred notes
  - Full-text search

- **Collaboration**
  - Share notes and folders with other users
  - Granular permissions (READ/WRITE)
  - "Shared with me" view

- **Import/Export**
  - Import notes from various sources
  - HTML to TipTap JSON conversion
  - Preserve folder structure and attachments
  - Markdown export (planned)
  - PDF export (planned)

### 🏗️ Architecture

- **Modular Plugin System** - Extensible provider pattern for storage, backup, and import/export
- **Provider-based Design** - Easy to add new storage backends, backup solutions, or import formats
- **RESTful API** - Clean, well-documented API endpoints
- **JWT Authentication** - Secure token-based authentication
- **Role-based Access** - Fine-grained permission system

## Tech Stack

### Frontend
- **Vue 3** with TypeScript
- **Vite** for fast development
- **TipTap** rich text editor
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Vue Router** for navigation

### Backend
- **Node.js 20 LTS**
- **Fastify** web framework
- **TypeScript**
- **Prisma** ORM
- **JWT** authentication
- **bcrypt** password hashing
- **PostgreSQL/SQLite** database

## Quick Start

### Prerequisites
- Node.js 20 or higher
- npm or yarn
- PostgreSQL (or SQLite for development)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/PierrePetite/Noter.git
cd Noter
```

2. **Backend Setup**
```bash
cd backend
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Make sure to set a secure JWT_SECRET!

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

On first visit, you'll be redirected to the setup page where you can create an admin account.

## Configuration

### Backend Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/noter"

# Security
JWT_SECRET=<generate-a-secure-random-string>
JWT_EXPIRES_IN=7d

# Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB

# Backup
BACKUP_ENABLED=true
BACKUP_DIR=./backups
BACKUP_SCHEDULE=0 2 * * *
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:3000/api
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user

### Notes
- `GET /api/notes` - List all notes
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/favorite` - Toggle favorite

### Folders
- `GET /api/folders` - List all folders
- `GET /api/folders/tree` - Get folder hierarchy
- `POST /api/folders` - Create folder
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Sharing
- `POST /api/shares/notes/:id/share` - Share note
- `POST /api/shares/folders/:id/share` - Share folder
- `GET /api/shares/with-me` - Get shared content

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/notes/:id/tags` - Add tags to note

### Import
- `POST /api/import/synology` - Import from backup file
- `GET /api/import/formats` - List supported import formats

## Development

### Backend Development
```bash
cd backend
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run start        # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Database Operations
```bash
cd backend

# Create migration
npx prisma migrate dev --name migration_name

# Reset database (caution!)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## Production Deployment

### Using PM2

1. **Build the applications**
```bash
# Backend
cd backend
npm install --production
npm run build

# Frontend
cd frontend
npm install
npm run build
```

2. **Start with PM2**
```bash
# Backend
cd backend
pm2 start npm --name "noter-api" -- start

# Serve frontend with nginx or similar
```

### Docker (Coming Soon)
Docker and docker-compose configurations are planned for easier deployment.

## Security Considerations

- Always use a strong, randomly generated `JWT_SECRET` in production
- Use HTTPS in production (configure reverse proxy like nginx)
- Set secure CORS origins
- Enable rate limiting (configured in .env)
- Regularly update dependencies
- Back up your database regularly

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Roadmap

### Near Term
- [ ] Tags UI implementation
- [ ] Sharing UI with permission management
- [ ] File attachments UI
- [ ] Admin panel for user management
- [ ] Markdown export
- [ ] PDF export

### Future Features
- [ ] Version history
- [ ] Public sharing links
- [ ] Real-time collaboration
- [ ] Mobile apps
- [ ] Desktop apps (Electron)
- [ ] Browser extension
- [ ] API webhooks
- [ ] Third-party integrations

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Built with ❤️ using Vue, Fastify, and TipTap
