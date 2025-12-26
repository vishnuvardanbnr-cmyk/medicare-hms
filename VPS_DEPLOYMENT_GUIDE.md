# MediCare HMS - VPS Deployment Guide

Complete guide to deploy the Hospital Management System on a VPS (Virtual Private Server) with PostgreSQL database.

## Prerequisites

- VPS with Ubuntu 22.04 LTS (recommended: 2GB RAM, 2 vCPU)
- Domain name (optional but recommended)
- SSH access to your server
- Basic command line knowledge

## Step 1: Initial Server Setup

### 1.1 Connect to your VPS
```bash
ssh root@your-server-ip
```

### 1.2 Update system packages
```bash
apt update && apt upgrade -y
```

### 1.3 Create a non-root user (recommended)
```bash
adduser medicare
usermod -aG sudo medicare
su - medicare
```

## Step 2: Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

## Step 3: Install and Configure PostgreSQL

### 3.1 Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
```

### 3.2 Start PostgreSQL service
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.3 Create database and user
```bash
sudo -u postgres psql
```

In the PostgreSQL prompt:
```sql
-- Create database
CREATE DATABASE medicare_hms;

-- Create user with password (change 'your_secure_password')
CREATE USER medicare_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE medicare_hms TO medicare_user;

-- Connect to the database and grant schema permissions
\c medicare_hms
GRANT ALL ON SCHEMA public TO medicare_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO medicare_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO medicare_user;

-- Exit
\q
```

### 3.4 Configure PostgreSQL for local connections
Edit `/etc/postgresql/14/main/pg_hba.conf`:
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Find and modify the local connection line:
```
local   all             all                                     md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## Step 4: Clone and Setup the Application

### 4.1 Install Git
```bash
sudo apt install -y git
```

### 4.2 Clone the repository
```bash
cd /home/medicare
git clone https://github.com/YOUR_USERNAME/medicare-hms.git
cd medicare-hms
```

### 4.3 Install dependencies
```bash
npm install
```

### 4.4 Create environment file
```bash
nano .env
```

Add the following content:
```env
# Database
DATABASE_URL=postgresql://medicare_user:your_secure_password@localhost:5432/medicare_hms

# Session
SESSION_SECRET=your_random_session_secret_min_32_chars

# Server
NODE_ENV=production
PORT=5000
```

Generate a random session secret:
```bash
openssl rand -base64 32
```

### 4.5 Build the application
```bash
npm run build
```

### 4.6 Push database schema
```bash
npm run db:push
```

## Step 5: Setup Process Manager (PM2)

### 5.1 Install PM2 globally
```bash
sudo npm install -g pm2
```

### 5.2 Start the application
```bash
pm2 start npm --name "medicare-hms" -- start
```

### 5.3 Configure PM2 to start on boot
```bash
pm2 startup systemd
# Copy and run the command it outputs
pm2 save
```

### 5.4 Useful PM2 commands
```bash
pm2 status          # Check status
pm2 logs            # View logs
pm2 restart all     # Restart application
pm2 stop all        # Stop application
pm2 monit           # Monitor resources
```

## Step 6: Setup Nginx as Reverse Proxy

### 6.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 6.2 Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/medicare-hms
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # If no domain, use: server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### 6.3 Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/medicare-hms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 7: Setup SSL with Let's Encrypt (Optional but Recommended)

### 7.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2 Obtain SSL certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 7.3 Auto-renewal test
```bash
sudo certbot renew --dry-run
```

## Step 8: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## Step 9: Create Admin User

Access your application and create an admin account through the signup page, or run this SQL:

```bash
sudo -u postgres psql medicare_hms
```

```sql
-- First, check the users table structure
\d users

-- Insert admin user (password will need to be hashed - use signup instead)
-- Or update an existing user to admin role:
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Updating the Application

When you need to update the application:

```bash
cd /home/medicare/medicare-hms

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild
npm run build

# Update database if needed
npm run db:push

# Restart
pm2 restart medicare-hms
```

## Backup Database

### Create backup
```bash
pg_dump -U medicare_user -h localhost medicare_hms > backup_$(date +%Y%m%d).sql
```

### Restore backup
```bash
psql -U medicare_user -h localhost medicare_hms < backup_file.sql
```

### Automated daily backups
```bash
sudo crontab -e
```
Add:
```
0 2 * * * pg_dump -U medicare_user medicare_hms > /home/medicare/backups/backup_$(date +\%Y\%m\%d).sql
```

## Monitoring and Logs

```bash
# Application logs
pm2 logs medicare-hms

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

## Troubleshooting

### Application not starting
```bash
pm2 logs medicare-hms --lines 100
```

### Database connection issues
```bash
# Test connection
psql -U medicare_user -h localhost -d medicare_hms

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Nginx issues
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Permission issues
```bash
sudo chown -R medicare:medicare /home/medicare/medicare-hms
```

## Security Recommendations

1. **Keep system updated**: Run `apt update && apt upgrade` regularly
2. **Use strong passwords**: For database and session secrets
3. **Enable fail2ban**: Protects against brute force attacks
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```
4. **Regular backups**: Automate database backups
5. **Monitor logs**: Check for suspicious activity
6. **Limit SSH access**: Use SSH keys instead of passwords

## Support

For issues or questions:
- Check application logs: `pm2 logs`
- Check database connectivity
- Verify environment variables are set correctly
- Ensure all services are running: PostgreSQL, Nginx, PM2

---

MediCare HMS - Comprehensive Hospital Management System
