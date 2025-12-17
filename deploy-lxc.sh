#!/bin/bash

# ==============================================
# Noter - Automated LXC Deployment Script
# ==============================================
# This script deploys Noter to a fresh Ubuntu 24.04 LXC container
#
# Usage:
#   chmod +x deploy-lxc.sh
#   sudo ./deploy-lxc.sh
#
# Prerequisites:
#   - Fresh Ubuntu 24.04 LXC container
#   - Root access
#   - Internet connection
# ==============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/noter"
GIT_REPO="https://github.com/PierrePetite/Noter.git"
DOMAIN=""
USE_POSTGRES=false
DB_PASSWORD=""
JWT_SECRET=""
ADMIN_EMAIL=""
ADMIN_USERNAME=""
ADMIN_PASSWORD=""

# ==============================================
# Helper Functions
# ==============================================

print_header() {
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

generate_random_string() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# ==============================================
# Interactive Configuration
# ==============================================

configure_deployment() {
    print_header "Noter Deployment Configuration"

    # Ask for Domain or IP
    print_info ""
    print_info "Access Method:"
    print_info "  1) Domain name (e.g., noter.yourdomain.com) - Requires DNS setup"
    print_info "  2) IP address (e.g., 192.168.1.100) - Works immediately"
    echo ""
    read -p "Choose [1 for domain, 2 for IP]: " ACCESS_CHOICE

    if [ "$ACCESS_CHOICE" = "1" ]; then
        read -p "Enter your domain (e.g., noter.yourdomain.com): " DOMAIN
        if [ -z "$DOMAIN" ]; then
            print_error "Domain is required"
            exit 1
        fi
        USE_DOMAIN=true
        BASE_URL="https://$DOMAIN"
        print_info "Using domain: $DOMAIN"
    elif [ "$ACCESS_CHOICE" = "2" ]; then
        # Auto-detect IP address
        SERVER_IP=$(hostname -I | awk '{print $1}')
        print_info "Detected IP address: $SERVER_IP"
        read -p "Use this IP? [Y/n]: " USE_IP_CONFIRM
        if [[ "$USE_IP_CONFIRM" =~ ^[Nn]$ ]]; then
            read -p "Enter IP address: " SERVER_IP
        fi
        DOMAIN="$SERVER_IP"
        USE_DOMAIN=false
        BASE_URL="http://$SERVER_IP"
        print_info "Using IP address: $SERVER_IP"
    else
        print_error "Invalid choice"
        exit 1
    fi

    # Database choice - Auto-select PostgreSQL
    print_info ""
    print_info "Using PostgreSQL (recommended for production)"
    USE_POSTGRES=true
    DB_PASSWORD=$(generate_random_string)

    # JWT Secret
    JWT_SECRET=$(generate_random_string)

    # Admin Account
    print_info ""
    print_info "Admin Account Setup:"
    read -p "Admin Email: " ADMIN_EMAIL
    if [ -z "$ADMIN_EMAIL" ]; then
        print_error "Admin email is required"
        exit 1
    fi

    read -p "Admin Username: " ADMIN_USERNAME
    if [ -z "$ADMIN_USERNAME" ]; then
        print_error "Admin username is required"
        exit 1
    fi

    read -s -p "Admin Password: " ADMIN_PASSWORD
    echo ""
    if [ -z "$ADMIN_PASSWORD" ]; then
        print_error "Admin password is required"
        exit 1
    fi

    read -s -p "Confirm Admin Password: " ADMIN_PASSWORD_CONFIRM
    echo ""
    if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
        print_error "Passwords do not match"
        exit 1
    fi

    # Confirmation
    echo ""
    print_header "Configuration Summary"
    echo "Access URL: $BASE_URL"
    echo "Database: PostgreSQL"
    echo "Admin Email: $ADMIN_EMAIL"
    echo "Admin Username: $ADMIN_USERNAME"
    echo ""
    read -p "Proceed with installation? [y/N]: " confirm

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_error "Installation cancelled."
        exit 0
    fi
}

# ==============================================
# System Preparation
# ==============================================

prepare_system() {
    print_header "Preparing System"

    # Update system
    print_info "Updating system packages..."
    apt update && apt upgrade -y
    print_success "System updated"

    # Install dependencies
    print_info "Installing dependencies..."
    apt install -y curl git nginx python3-certbot-nginx dnsutils
    print_success "Dependencies installed"

    # Install Node.js 20
    print_info "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js $(node --version) installed"

    # Install PM2
    print_info "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed"

    # Install PostgreSQL if needed
    if [ "$USE_POSTGRES" = true ]; then
        print_info "Installing PostgreSQL 16..."
        apt install -y postgresql-16 postgresql-client-16
        systemctl start postgresql
        systemctl enable postgresql
        print_success "PostgreSQL installed"
    fi
}

# ==============================================
# Database Setup
# ==============================================

setup_database() {
    print_header "Setting up Database"

    if [ "$USE_POSTGRES" = true ]; then
        print_info "Configuring PostgreSQL..."

        # Configure pg_hba.conf for password authentication FIRST
        PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
        if ! grep -q "local.*noter.*noter_user.*md5" "$PG_HBA"; then
            echo "" >> "$PG_HBA"
            echo "# Noter database" >> "$PG_HBA"
            echo "local   noter           noter_user                              md5" >> "$PG_HBA"
            echo "host    noter           noter_user      127.0.0.1/32            md5" >> "$PG_HBA"
            echo "host    noter           noter_user      ::1/128                 md5" >> "$PG_HBA"
            systemctl reload postgresql
            sleep 2  # Wait for PostgreSQL to reload
            print_success "PostgreSQL authentication configured"
        fi

        # Create database and user
        sudo -u postgres psql <<EOF
CREATE DATABASE noter;
CREATE USER noter_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE noter TO noter_user;
\c noter
GRANT ALL ON SCHEMA public TO noter_user;
\q
EOF

        # Ensure password is set correctly (workaround for authentication issues)
        sudo -u postgres psql -c "ALTER USER noter_user WITH PASSWORD '$DB_PASSWORD';"

        print_success "PostgreSQL database 'noter' created"
        DATABASE_URL="postgresql://noter_user:$DB_PASSWORD@localhost:5432/noter"
    else
        print_info "Using SQLite database..."
        DATABASE_URL="file:$APP_DIR/backend/prisma/noter.db"
    fi
}

# ==============================================
# Application Installation
# ==============================================

install_application() {
    print_header "Installing Noter Application"

    # Create app directory
    print_info "Creating application directory..."
    mkdir -p $APP_DIR
    cd $APP_DIR

    # Clone repository
    print_info "Cloning repository from GitHub..."
    git clone $GIT_REPO .
    print_success "Repository cloned"

    # Backend setup
    print_info "Setting up backend..."
    cd $APP_DIR/backend

    # Install dependencies (including devDependencies for build)
    npm install

    # Install required @types packages for TypeScript build
    npm install --save-dev @types/bcrypt @types/node-cron @types/archiver @types/adm-zip @types/jsdom @types/jsonwebtoken

    # Create .env file
    cat > .env <<EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

CORS_ORIGIN=$BASE_URL
UPLOAD_BASE_URL=$BASE_URL/uploads

DATABASE_URL="$DATABASE_URL"

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

UPLOAD_DIR=$APP_DIR/backend/uploads
MAX_FILE_SIZE=52428800

BACKUP_DIR=$APP_DIR/backend/backups
BACKUP_ENABLED=false

RATE_LIMIT_MAX=100
RATE_LIMIT_TIMEWINDOW=60000

APP_VERSION=1.0.0
EOF

    print_success "Backend .env created"

    # Update Prisma schema for PostgreSQL if needed
    if [ "$USE_POSTGRES" = true ]; then
        print_info "Configuring Prisma for PostgreSQL..."
        sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

        # Push schema directly to PostgreSQL (no migration files needed)
        print_info "Pushing schema to PostgreSQL database..."
        npx prisma db push --accept-data-loss --skip-generate
        npx prisma generate
        print_success "Database schema applied"
    else
        # Run Prisma migrations for SQLite
        print_info "Running database migrations..."
        npx prisma generate
        npx prisma migrate deploy
        print_success "Database migrations complete"
    fi

    # Create necessary directories
    mkdir -p uploads backups

    # Build backend
    print_info "Building backend..."
    npm run build
    print_success "Backend built"

    # Frontend setup
    print_info "Setting up frontend..."
    cd $APP_DIR/frontend

    # Install dependencies
    npm install

    # Create .env file
    cat > .env <<EOF
VITE_API_URL=$BASE_URL/api
EOF

    print_success "Frontend .env created"

    # Build frontend
    print_info "Building frontend..."
    npm run build
    print_success "Frontend built"

    # Copy frontend build to nginx directory
    mkdir -p /var/www/noter
    cp -r dist/* /var/www/noter/
    print_success "Frontend deployed to /var/www/noter"

    # Create admin user
    print_info "Creating admin user..."

    # Hash password with bcrypt (using Node.js)
    cd $APP_DIR/backend
    HASHED_PASSWORD=$(node -e "
const bcrypt = require('bcrypt');
(async () => {
  const hash = await bcrypt.hash('$ADMIN_PASSWORD', 10);
  console.log(hash);
})();
")

    # Wait for PM2 to start backend
    sleep 3

    # Insert admin user directly into database
    sudo -u postgres psql -d noter <<EOF
INSERT INTO users (id, email, username, password_hash, display_name, is_admin, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '$ADMIN_EMAIL',
  '$ADMIN_USERNAME',
  '$HASHED_PASSWORD',
  '$ADMIN_USERNAME',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
EOF

    print_success "Admin user created"
}

# ==============================================
# PM2 Configuration
# ==============================================

setup_pm2() {
    print_header "Configuring PM2"

    cd $APP_DIR/backend

    # Start application with PM2
    pm2 start npm --name "noter-api" -- start
    pm2 save
    pm2 startup systemd -u root --hp /root

    print_success "PM2 configured and application started"
}

# ==============================================
# Nginx Configuration
# ==============================================

setup_nginx() {
    print_header "Configuring Nginx"

    # Create Nginx config
    cat > /etc/nginx/sites-available/noter <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend
    location / {
        root /var/www/noter;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Uploads (Static Files)
    location /uploads {
        alias $APP_DIR/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 50M;
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/noter /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test and restart Nginx
    nginx -t
    systemctl restart nginx
    systemctl enable nginx

    print_success "Nginx configured"
}

# ==============================================
# SSL/TLS Setup
# ==============================================

setup_ssl() {
    print_header "Setting up SSL/TLS"

    # Skip SSL setup if using IP address
    if [ "$USE_DOMAIN" = false ]; then
        print_info "Skipping SSL setup (using IP address)"
        print_info "Access Noter at: http://$DOMAIN"
        return 0
    fi

    print_info "Obtaining SSL certificate from Let's Encrypt..."
    print_warning "Make sure DNS is properly configured for $DOMAIN"

    # Auto-detect if domain resolves to this server
    DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
    SERVER_IP=$(hostname -I | awk '{print $1}')

    if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
        print_success "DNS resolves correctly to this server"
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email
        print_success "SSL certificate obtained"
    else
        print_warning "DNS does not resolve to this server yet"
        print_warning "Domain IP: $DOMAIN_IP"
        print_warning "Server IP: $SERVER_IP"
        print_warning "Skipping SSL. Run 'certbot --nginx -d $DOMAIN' manually after DNS propagation."
    fi
}

# ==============================================
# Firewall Configuration
# ==============================================

setup_firewall() {
    print_header "Configuring Firewall"

    print_info "Setting up UFW..."
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw reload

    print_success "Firewall configured"
}

# ==============================================
# Post-Installation
# ==============================================

post_installation() {
    print_header "Installation Complete!"

    echo ""
    print_success "Noter has been successfully installed!"
    echo ""
    echo "Access your Noter instance at:"
    echo "  $BASE_URL"
    echo ""
    echo "Important Information:"
    echo "  - Application directory: $APP_DIR"
    echo "  - Backend logs: pm2 logs noter-api"
    echo "  - Database: PostgreSQL (noter database)"
    echo "  - Database password: $DB_PASSWORD"
    echo "  - JWT Secret: $JWT_SECRET"
    echo ""
    echo "Admin Account:"
    echo "  - Email: $ADMIN_EMAIL"
    echo "  - Username: $ADMIN_USERNAME"
    echo "  - Password: [as entered]"
    echo ""
    echo "Next Steps:"
    echo "  1. Visit $BASE_URL"
    echo "  2. Login with your admin credentials"
    echo "  3. Configure automatic backups in the admin panel"
    echo ""
    print_warning "IMPORTANT: Save the database password and JWT secret in a secure location!"

    # Save credentials to file
    cat > $APP_DIR/CREDENTIALS.txt <<EOF
Noter Installation Credentials
==============================
Generated: $(date)

Access URL: $BASE_URL

Database: PostgreSQL
Database Password: $DB_PASSWORD
JWT Secret: $JWT_SECRET

Admin Account:
  Email: $ADMIN_EMAIL
  Username: $ADMIN_USERNAME
  Password: [as entered during setup]

Application Directory: $APP_DIR

IMPORTANT: Keep this file secure and delete it after backing up the credentials!
EOF

    chmod 600 $APP_DIR/CREDENTIALS.txt
    print_success "Credentials saved to $APP_DIR/CREDENTIALS.txt"
}

# ==============================================
# Main Execution
# ==============================================

main() {
    clear

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run as root (use sudo)"
        exit 1
    fi

    print_header "Noter - LXC Deployment Script"
    echo ""

    # Run installation steps
    configure_deployment
    prepare_system
    setup_database
    install_application
    setup_pm2
    setup_nginx
    setup_ssl
    setup_firewall
    post_installation
}

# Run main function
main
