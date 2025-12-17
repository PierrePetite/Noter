# Noter - Quick Install Guide

## 🚀 One-Line Installation

### Prerequisites
- Fresh Ubuntu 24.04 LXC Container
- 2 CPU Cores, 4GB RAM, 20GB Storage
- Root access

### Installation Command

```bash
apt update && apt install -y curl && curl -fsSL https://raw.githubusercontent.com/PierrePetite/Noter/main/deploy-lxc.sh | bash
```

That's it! The script will:
1. ✅ Install all dependencies (Node.js, PostgreSQL, Nginx, etc.)
2. ✅ Clone the repository from GitHub
3. ✅ Build backend and frontend
4. ✅ Configure database with auto-generated password
5. ✅ Create your admin user
6. ✅ Setup SSL/TLS (Let's Encrypt)
7. ✅ Configure firewall
8. ✅ Start the application

### Interactive Setup

The script will ask you:

```
1. Domain: noter.yourdomain.com
2. Admin Email: your@email.com
3. Admin Username: admin
4. Admin Password: [secure-password]
5. Confirm: y
```

**Duration:** ~10 minutes

### After Installation

Open your browser:
```
https://noter.yourdomain.com
```

Login with your admin credentials and you're done! 🎉

---

## 📖 Need More Details?

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Manual installation steps
- Troubleshooting
- Configuration options
- Maintenance guide

## 🆘 Quick Troubleshooting

**Script fails?**
```bash
# Check logs
pm2 logs noter-api
tail -f /var/log/nginx/error.log
```

**Can't access the site?**
```bash
# Check if services are running
pm2 status
systemctl status nginx
systemctl status postgresql
```

**Need to start over?**
```bash
rm -rf /opt/noter
# Run the installation command again
```

---

**Repository:** https://github.com/PierrePetite/Noter
