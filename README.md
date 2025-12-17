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
  - Import from Synology NoteStation (.nsx files)
  - HTML to TipTap JSON conversion
  - Preserve folder structure and attachments
  - Markdown export
  - Automated backups with scheduling

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
- **PostgreSQL** database

## 🚀 Quick Installation (LXC/Production)

### Automated One-Line Installation

For a fresh **Ubuntu 24.04 LXC Container** (or any Ubuntu 24.04 server):

```bash
apt update && apt install -y curl
curl -fsSL https://raw.githubusercontent.com/PierrePetite/Noter/main/deploy-lxc.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

### Installation Steps

The script will guide you through an interactive setup:

#### Step 1: Choose Access Method
```
Access Method:
  1) Domain name (e.g., noter.yourdomain.com) - Requires DNS setup
  2) IP address (e.g., 192.168.1.100) - Works immediately

Choose [1 for domain, 2 for IP]:
```

**Option 1 - Domain Name:**
- Requires DNS A-record pointing to your server IP
- Automatically sets up SSL/TLS with Let's Encrypt
- Access via: `https://noter.yourdomain.com`
- Best for: Production deployments with public domain

**Option 2 - IP Address:**
- Works immediately without DNS setup
- Auto-detects your server's IP address
- Access via: `http://192.168.x.x`
- Best for: Local networks, home labs, quick testing

#### Step 2: Admin Account Setup
The script will ask for:
- Admin Email
- Admin Username
- Admin Password (entered securely, won't be displayed)

#### Step 3: Automatic Installation
The script automatically:
1. ✅ Installs all dependencies (Node.js 20, PostgreSQL 16, Nginx)
2. ✅ Clones the repository from GitHub
3. ✅ Configures PostgreSQL with secure authentication
4. ✅ Builds backend and frontend
5. ✅ Sets up database schema
6. ✅ Creates admin user account
7. ✅ Configures Nginx reverse proxy
8. ✅ Sets up SSL/TLS (domain mode only)
9. ✅ Configures firewall (UFW)
10. ✅ Starts application with PM2

**Installation time:** ~5-10 minutes

### What Gets Installed

**System Packages:**
- Node.js 20 LTS
- PostgreSQL 16
- Nginx
- PM2 (process manager)
- Certbot (for SSL, domain mode only)
- UFW (firewall)

**Application:**
- Noter backend → `/opt/noter/backend`
- Noter frontend → `/var/www/noter`
- Uploads → `/opt/noter/backend/uploads`
- Backups → `/opt/noter/backend/backups`

**Credentials saved to:** `/opt/noter/CREDENTIALS.txt`

### After Installation

**Access your Noter instance:**
- **Domain mode:** `https://noter.yourdomain.com`
- **IP mode:** `http://192.168.x.x`

**Login with your admin credentials** and start taking notes!

### Management Commands

```bash
# View backend logs
pm2 logs noter-api

# Restart backend
pm2 restart noter-api

# Check status
pm2 status

# View all services
systemctl status nginx
systemctl status postgresql

# Manual backup
curl -X POST http://localhost:3000/api/backups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Development Setup

For local development on your machine:

### Prerequisites
- Node.js 20 or higher
- npm or yarn
- PostgreSQL (or use SQLite for quick testing)

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
NODE_ENV=production
HOST=0.0.0.0

# Access URLs
CORS_ORIGIN=http://192.168.1.100  # or https://noter.yourdomain.com
UPLOAD_BASE_URL=http://192.168.1.100/uploads

# Database
DATABASE_URL="postgresql://noter_user:password@localhost:5432/noter"

# Security
JWT_SECRET=<generate-a-secure-random-string-min-32-chars>
JWT_EXPIRES_IN=7d

# Storage
UPLOAD_DIR=/opt/noter/backend/uploads
MAX_FILE_SIZE=52428800  # 50MB

# Backup
BACKUP_ENABLED=true
BACKUP_DIR=/opt/noter/backend/backups
```

### Frontend Environment Variables

```env
VITE_API_URL=http://192.168.1.100/api
# or for domain: https://noter.yourdomain.com/api
```

## API Documentation

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/setup` - Initial setup (creates first admin user)

### Notes
- `GET /api/notes` - List all notes
- `GET /api/notes/favorites` - List favorite notes
- `GET /api/notes/search?q=query` - Search notes
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/favorite` - Toggle favorite

### Folders
- `GET /api/folders` - List all folders
- `GET /api/folders/tree` - Get folder hierarchy
- `GET /api/folders/:id` - Get folder with notes
- `POST /api/folders` - Create folder
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Sharing
- `POST /api/shares/notes/:id/share` - Share note with user
- `DELETE /api/shares/notes/:id/share/:userId` - Remove note share
- `POST /api/shares/folders/:id/share` - Share folder with user
- `DELETE /api/shares/folders/:id/share/:userId` - Remove folder share
- `GET /api/shares/with-me` - Get content shared with me
- `GET /api/shares/users/search?q=` - Search users for sharing

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `GET /api/tags/:id/notes` - Get notes with tag
- `PUT /api/tags/notes/:id/tags` - Add/update tags on note
- `DELETE /api/tags/notes/:id/tags` - Remove tags from note

### Attachments
- `POST /api/notes/:id/attachments` - Upload file to note
- `GET /api/notes/:id/attachments` - List note attachments
- `GET /api/attachments/:id` - Download attachment
- `DELETE /api/attachments/:id` - Delete attachment
- `POST /api/upload/image` - Upload image for editor

### Import
- `POST /api/import/synology` - Import from Synology NoteStation backup
- `GET /api/import/formats` - List supported import formats

### Backups (Admin only)
- `GET /api/backups` - List all backups
- `POST /api/backups` - Create manual backup
- `GET /api/backups/:id` - Get backup details
- `POST /api/backups/:id/restore` - Restore backup
- `DELETE /api/backups/:id` - Delete backup
- `GET /api/backups/schedule` - Get backup schedule
- `PUT /api/backups/schedule` - Update backup schedule

### Admin (Admin only)
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs noter-api

# Check if PostgreSQL is running
systemctl status postgresql

# Test database connection
psql -U noter_user -d noter -h localhost
```

### Frontend can't reach backend
```bash
# Check Nginx configuration
cat /etc/nginx/sites-available/noter

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Test backend directly
curl http://localhost:3000/health
```

### Database connection failed
```bash
# Check PostgreSQL authentication
grep noter /etc/postgresql/16/main/pg_hba.conf

# Should contain:
# local   noter           noter_user                              md5
# host    noter           noter_user      127.0.0.1/32            md5
# host    noter           noter_user      ::1/128                 md5
```

### Reset installation
```bash
# Stop services
pm2 delete noter-api

# Clean database
sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS noter;
DROP USER IF EXISTS noter_user;
EOF

# Remove files
rm -rf /opt/noter
rm -rf /var/www/noter

# Run installation again
./deploy.sh
```

## Security Considerations

- Always use a strong, randomly generated `JWT_SECRET` in production (min 32 characters)
- Use HTTPS in production with domain name (automatic with deployment script)
- Change default database passwords
- Enable firewall (UFW) - ports 22, 80, 443
- Regularly update dependencies: `npm audit`
- Back up your database regularly (can be automated in admin panel)
- Keep credentials file `/opt/noter/CREDENTIALS.txt` secure and delete after backing up

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions, please open an issue on GitHub:
https://github.com/PierrePetite/Noter/issues

---

Built with ❤️ using Vue 3, Fastify, TipTap, and PostgreSQL
