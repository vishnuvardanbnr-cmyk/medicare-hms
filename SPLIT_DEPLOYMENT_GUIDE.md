# MediCare HMS - Split Deployment Guide

**Backend on VPS + Frontend Running Locally**

This guide explains how to host your backend API on a VPS server while running the frontend locally on your machine.

---

## Part 1: Deploy Backend on VPS

### Step 1: Prepare Your VPS

```bash
# Connect to your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs git

# Verify
node --version
npm --version
```

### Step 2: Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Create database
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE medicare_hms;
CREATE USER medicare_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE medicare_hms TO medicare_user;
\c medicare_hms
GRANT ALL ON SCHEMA public TO medicare_user;
\q
```

### Step 3: Clone and Setup Backend

```bash
# Create app directory
mkdir -p /var/www/medicare-backend
cd /var/www/medicare-backend

# Clone your repository
git clone https://github.com/YOUR_USERNAME/medicare-hms.git .

# Install dependencies
npm install
```

### Step 4: Configure Environment for Backend-Only Mode

Create `.env` file:
```bash
nano .env
```

Add:
```env
DATABASE_URL=postgresql://medicare_user:your_secure_password@localhost:5432/medicare_hms
SESSION_SECRET=your_random_32_char_secret_here
NODE_ENV=production
PORT=5000

# CORS - Allow your local frontend
CORS_ORIGIN=http://localhost:5173
```

### Step 5: Modify Server for CORS (Backend-Only)

Create a file `server/cors-config.ts`:
```bash
nano server/cors-config.ts
```

Add:
```typescript
import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
});
```

Then update `server/index.ts` to add CORS before routes:
```typescript
import { corsMiddleware } from './cors-config';
// Add after creating express app:
app.use(corsMiddleware);
```

### Step 6: Push Database Schema

```bash
npm run db:push
```

### Step 7: Build and Run Backend

```bash
# Build the server
npm run build

# Install PM2
npm install -g pm2

# Start backend only
pm2 start dist/index.js --name "medicare-api"

# Save PM2 config
pm2 save
pm2 startup
```

### Step 8: Setup Nginx (Recommended)

```bash
apt install -y nginx
nano /etc/nginx/sites-available/medicare-api
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your VPS IP

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
ln -s /etc/nginx/sites-available/medicare-api /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### Step 9: Open Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 5000  # If accessing directly without Nginx
ufw enable
```

---

## Part 2: Run Frontend Locally

### Step 1: Clone Repository Locally

On your local machine:
```bash
git clone https://github.com/YOUR_USERNAME/medicare-hms.git
cd medicare-hms
npm install
```

### Step 2: Configure Local Frontend Environment

Create `client/.env.local`:
```bash
# Point to your VPS backend
VITE_API_URL=http://your-vps-ip:5000
# Or if using domain with Nginx:
VITE_API_URL=https://your-domain.com
```

### Step 3: Update Query Client for Remote API

Edit `client/src/lib/queryClient.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const fullUrl = `${API_BASE_URL}${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const fullUrl = `${API_BASE_URL}${queryKey[0]}`;
        const res = await fetch(fullUrl, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }
          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

### Step 4: Build Frontend for Production

```bash
cd client
npm run build
```

This creates a `dist` folder with your static frontend files.

### Step 5: Run Frontend Locally (Development)

For development with hot reload:
```bash
npm run dev
# Frontend runs at http://localhost:5173
```

### Step 6: Serve Built Frontend (Production)

Option A - Using a simple server:
```bash
npm install -g serve
serve -s client/dist -l 3000
# Access at http://localhost:3000
```

Option B - Using Python:
```bash
cd client/dist
python3 -m http.server 3000
```

Option C - Using Node:
```bash
npx http-server client/dist -p 3000
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR LOCAL MACHINE                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Frontend (React/Vite)                        │    │
│  │         http://localhost:5173 or :3000               │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │ API Calls                           │
└────────────────────────┼────────────────────────────────────┘
                         │
                    (Internet)
                         │
┌────────────────────────┼────────────────────────────────────┐
│                    VPS SERVER                                │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Nginx (Port 80/443)                          │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Express Backend (Port 5000)                  │    │
│  │         /api/* endpoints                             │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         PostgreSQL Database                          │    │
│  │         medicare_hms                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Commands Reference

### VPS Backend
```bash
# SSH to VPS
ssh root@your-vps-ip

# Check backend status
pm2 status

# View logs
pm2 logs medicare-api

# Restart backend
pm2 restart medicare-api

# Update backend
cd /var/www/medicare-backend
git pull
npm install
npm run build
pm2 restart medicare-api
```

### Local Frontend
```bash
# Development mode
npm run dev

# Build for production
cd client && npm run build

# Serve production build
serve -s client/dist -l 3000
```

---

## Troubleshooting

### CORS Errors
- Verify `CORS_ORIGIN` in VPS `.env` matches your local URL
- Check browser console for specific CORS error messages
- Ensure credentials are properly configured

### Cannot Connect to Backend
- Check VPS firewall: `ufw status`
- Verify backend is running: `pm2 status`
- Test API directly: `curl http://your-vps-ip:5000/api/health`

### Session/Cookie Issues
- For cross-origin cookies, you may need HTTPS on the backend
- Consider using JWT tokens instead of session cookies for split deployments

---

## SSL for Production (Recommended)

For session cookies to work across origins, your VPS should have HTTPS:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

Then update your local frontend `.env.local`:
```
VITE_API_URL=https://your-domain.com
```
