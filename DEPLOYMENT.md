# Noter - LXC Deployment Guide

Vollständige Anleitung zur Installation von Noter in einem LXC Container auf Proxmox.

## 📋 Voraussetzungen

### LXC Container
- **OS**: Ubuntu 24.04 LTS
- **CPU**: 2 Cores (min)
- **RAM**: 4 GB (min)
- **Storage**: 20 GB (min)
- **Netzwerk**: Bridge zu vmbr0, statische IP oder DHCP

### Domain/DNS
- Eine konfigurierte Domain oder Subdomain (z.B. `noter.yourdomain.com`)
- DNS A-Record zeigt auf die LXC-Container IP

### Repository
- Git-Repository mit Noter-Code (GitHub, GitLab, etc.)

## 🚀 Automatische Installation

### Schritt 1: Container erstellen

1. In Proxmox UI: **Create CT**
2. Template wählen: **Ubuntu 24.04**
3. Ressourcen:
   - CPU: 2 Cores
   - RAM: 4 GB
   - Storage: 20 GB
4. Netzwerk: Bridge, statische IP konfigurieren

### Schritt 2: In Container einloggen

```bash
# In Proxmox Host
pct enter <CONTAINER_ID>

# Oder via SSH
ssh root@<CONTAINER_IP>
```

### Schritt 3: Repository klonen

```bash
cd /tmp
git clone <YOUR_NOTER_REPO_URL> noter-deploy
cd noter-deploy
```

### Schritt 4: Deployment-Script ausführen

```bash
chmod +x deploy-lxc.sh
./deploy-lxc.sh
```

Das Script führt Sie durch die Installation und fragt:
- **Domain**: Ihre Noter-Domain (z.B. `noter.example.com`)
- **Datenbank**: SQLite oder PostgreSQL
- **SSL**: Let's Encrypt Zertifikat

### Schritt 5: Setup Wizard

Nach erfolgreicher Installation:
1. Öffne `https://noter.yourdomain.com` im Browser
2. Erstelle deinen Admin-Account
3. Fertig! 🎉

## 🛠️ Manuelle Installation

Falls das automatische Script nicht funktioniert oder du mehr Kontrolle möchtest:

### 1. System vorbereiten

```bash
# System aktualisieren
apt update && apt upgrade -y

# Dependencies installieren
apt install -y curl git nginx postgresql-16 python3-certbot-nginx

# Node.js 20 LTS installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2 global installieren
npm install -g pm2
```

### 2. PostgreSQL einrichten

```bash
# PostgreSQL starten
systemctl start postgresql
systemctl enable postgresql

# Datenbank erstellen
sudo -u postgres psql <<EOF
CREATE DATABASE noter;
CREATE USER noter_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE noter TO noter_user;
\q
EOF
```

### 3. Application installieren

```bash
# Repository klonen
mkdir -p /opt/noter
cd /opt/noter
git clone <YOUR_REPO_URL> .

# Backend setup
cd backend
npm install --production

# .env erstellen (siehe .env.production.example)
cp .env.production.example .env
nano .env  # Anpassen!

# Prisma Migrationen
npx prisma generate
npx prisma migrate deploy

# Build
npm run build

# Directories erstellen
mkdir -p uploads backups

# Frontend setup
cd ../frontend
npm install

# .env erstellen
cp .env.production.example .env
nano .env  # Anpassen!

# Build
npm run build

# Nach Nginx kopieren
mkdir -p /var/www/noter
cp -r dist/* /var/www/noter/
```

### 4. PM2 konfigurieren

```bash
cd /opt/noter/backend

# App starten
pm2 start npm --name "noter-api" -- start
pm2 save
pm2 startup systemd -u root --hp /root

# Logs anzeigen
pm2 logs noter-api
```

### 5. Nginx konfigurieren

```bash
# Nginx Config erstellen
nano /etc/nginx/sites-available/noter
```

Füge ein:

```nginx
server {
    listen 80;
    server_name noter.yourdomain.com;

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
        proxy_set_header X-Forwarded-Proto $scheme;
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
# Site aktivieren
ln -sf /etc/nginx/sites-available/noter /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Nginx testen und neustarten
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### 6. SSL/TLS mit Let's Encrypt

```bash
# Zertifikat holen
certbot --nginx -d noter.yourdomain.com

# Auto-Renewal testen
certbot renew --dry-run
```

### 7. Firewall

```bash
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

## 🔐 Umgebungsvariablen

### Backend (.env)

**Kritische Variablen (MUSS gesetzt sein):**

```env
NODE_ENV=production
DATABASE_URL="postgresql://noter_user:password@localhost:5432/noter"
JWT_SECRET=<32+ Zeichen Random String>
CORS_ORIGIN=https://noter.yourdomain.com
UPLOAD_BASE_URL=https://noter.yourdomain.com/uploads
```

**Optionale Variablen:**

```env
PORT=3000
HOST=0.0.0.0
UPLOAD_DIR=/opt/noter/backend/uploads
BACKUP_DIR=/opt/noter/backend/backups
MAX_FILE_SIZE=52428800
RATE_LIMIT_MAX=100
```

### Frontend (.env)

```env
VITE_API_URL=https://noter.yourdomain.com/api
```

## 📁 Verzeichnisstruktur

```
/opt/noter/
├── backend/
│   ├── src/
│   ├── prisma/
│   │   └── noter.db        # SQLite (falls verwendet)
│   ├── uploads/            # Hochgeladene Dateien
│   ├── backups/            # Backup-Dateien
│   ├── .env                # Backend-Konfiguration
│   └── package.json
├── frontend/
│   ├── dist/               # Build-Output
│   └── .env                # Frontend-Konfiguration
└── CREDENTIALS.txt         # Automatisch generierte Zugangsdaten

/var/www/noter/             # Nginx Static Files (Frontend)
```

## 🔄 Wartung & Updates

### Application Update

```bash
cd /opt/noter

# Änderungen pullen
git pull

# Backend Update
cd backend
npm install
npx prisma migrate deploy
npm run build
pm2 restart noter-api

# Frontend Update
cd ../frontend
npm install
npm run build
cp -r dist/* /var/www/noter/
```

### Backup erstellen

**Manuell:**

```bash
# Via API (als Admin)
curl -X POST https://noter.yourdomain.com/api/backups \
  -H "Authorization: Bearer YOUR_TOKEN"

# Oder via Admin-Panel: Backups → "Neues Backup"
```

**Automatisch:**

1. Admin-Panel öffnen
2. Backups-Tab
3. "Automatische Backups aktivieren"
4. Zeitplan wählen (z.B. täglich um 2 Uhr)

### Logs anzeigen

```bash
# PM2 Logs
pm2 logs noter-api

# Nginx Logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# System Logs
journalctl -u nginx
```

### Service Neustarten

```bash
# Backend (PM2)
pm2 restart noter-api

# Nginx
systemctl restart nginx

# PostgreSQL
systemctl restart postgresql
```

## 🐛 Troubleshooting

### Problem: Frontend kann Backend nicht erreichen

**Ursache:** CORS oder API-URL falsch konfiguriert

**Lösung:**
```bash
# Backend .env prüfen
grep CORS_ORIGIN /opt/noter/backend/.env
# Sollte: CORS_ORIGIN=https://noter.yourdomain.com

# Frontend .env prüfen
grep VITE_API_URL /opt/noter/frontend/.env
# Sollte: VITE_API_URL=https://noter.yourdomain.com/api

# Nach Änderungen neu bauen!
```

### Problem: Uploads funktionieren nicht

**Ursache:** UPLOAD_BASE_URL falsch oder Verzeichnis-Permissions

**Lösung:**
```bash
# UPLOAD_BASE_URL prüfen
grep UPLOAD_BASE_URL /opt/noter/backend/.env
# Sollte: UPLOAD_BASE_URL=https://noter.yourdomain.com/uploads

# Permissions prüfen
chown -R root:root /opt/noter/backend/uploads
chmod -R 755 /opt/noter/backend/uploads
```

### Problem: Database connection failed

**Ursache:** PostgreSQL nicht gestartet oder falsches Password

**Lösung:**
```bash
# PostgreSQL Status
systemctl status postgresql

# Connection testen
psql -U noter_user -d noter -h localhost

# DATABASE_URL in .env prüfen
```

### Problem: 502 Bad Gateway

**Ursache:** Backend nicht gestartet oder PM2 läuft nicht

**Lösung:**
```bash
# PM2 Status
pm2 status

# Backend neu starten
pm2 restart noter-api

# Falls nicht vorhanden, neu starten:
cd /opt/noter/backend
pm2 start npm --name "noter-api" -- start
pm2 save
```

## 🔒 Sicherheit

### Empfohlene Maßnahmen

1. **Firewall aktiv halten**
   ```bash
   ufw status
   ```

2. **SSL/TLS verwenden** (Let's Encrypt)
   ```bash
   certbot certificates
   ```

3. **Regelmäßige Updates**
   ```bash
   apt update && apt upgrade
   ```

4. **Backups testen**
   - Regelmäßig Backups herunterladen
   - Restore-Prozess testen

5. **Starke Passwörter**
   - JWT_SECRET: Min. 32 Zeichen
   - Datenbank-Password: Min. 16 Zeichen
   - Admin-Account: Starkes Passwort

6. **Rate Limiting**
   - Ist standardmäßig aktiviert (100 req/min)
   - In .env anpassbar

## 📊 Performance-Tuning

### Für hohe Last

```env
# Backend .env
RATE_LIMIT_MAX=500
RATE_LIMIT_TIMEWINDOW=60000
```

### Nginx Caching

```nginx
# In /etc/nginx/sites-available/noter

# Static Asset Caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    root /var/www/noter;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### PostgreSQL Tuning

```bash
# /etc/postgresql/16/main/postgresql.conf
nano /etc/postgresql/16/main/postgresql.conf

# Empfohlene Werte für 4GB RAM:
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 16MB
maintenance_work_mem = 256MB
```

## 📞 Support

Bei Problemen:
1. Logs prüfen (`pm2 logs noter-api`)
2. GitHub Issues: `<YOUR_REPO_URL>/issues`
3. Dokumentation: `CLAUDE.md` im Repository

## 📝 Checkliste für Go-Live

- [ ] Domain DNS konfiguriert
- [ ] LXC Container erstellt und erreichbar
- [ ] SSL-Zertifikat installiert (Let's Encrypt)
- [ ] Backend .env korrekt konfiguriert
- [ ] Frontend .env korrekt konfiguriert
- [ ] Datenbank-Migrationen durchgeführt
- [ ] PM2 läuft und startet automatisch
- [ ] Nginx konfiguriert und läuft
- [ ] Firewall aktiviert (Ports 22, 80, 443)
- [ ] Admin-Account erstellt
- [ ] Automatische Backups konfiguriert
- [ ] Erste Backup-Wiederherstellung getestet
- [ ] Credentials gesichert (CREDENTIALS.txt)

---

**Installation erfolgreich?** Viel Spaß mit Noter! 🎉
