# LifeLink Deployment & Operations Guide

This guide details the deployment, configuration, and production operational practices for LifeLink.

---

## 1. System Architecture & Prerequisites

### 1.1 Minimum System Requirements
- **CPU:** 2 vCPU cores (4 cores recommended for production)
- **Memory:** 4 GB RAM (8 GB recommended for PostgreSQL + API + Next.js build cache)
- **Disk:** 20 GB SSD storage
- **OS:** Ubuntu 22.04 LTS, Debian 12, or containerized Linux
- **Runtime:** Node.js v20.x, pnpm v9.x, Docker Engine v24+, Docker Compose v2+

### 1.2 Monorepo Deployment Targets
LifeLink packages into three modular components:
1. **`apps/api`:** Express + TypeScript backend running on port `4000`.
2. **`apps/web`:** Next.js 14 App Router frontend running on port `3000`.
3. **`postgres`:** PostgreSQL 15 database instance with connection pooling.

```
       +-------------------------------------------------------------+
       |                  Internet (Cloudflare / TLS)                 |
       +-------------------------------------------------------------+
                                      |
                     [Reverse Proxy: Nginx / Caddy]
                     Port 80/443 (SSL Termination)
                                      |
                 +--------------------+--------------------+
                 |                                         |
     Path: /* except /api/ & /socket.io       Path: /api/* & /socket.io/*
                 |                                         |
                 v                                         v
       +-------------------+                     +-------------------+
       |    apps/web       |                     |    apps/api       |
       |  (Next.js: 3000)  |                     |  (Express: 4000)  |
       +-------------------+                     +-------------------+
                                                           |
                                                           v
                                                 +-------------------+
                                                 |    PostgreSQL     |
                                                 |  (Port: 5432)     |
                                                 +-------------------+
```

---

## 2. Docker Compose Deployment (Recommended)

LifeLink includes a pre-configured `docker-compose.yml` that provisions all three containers with health checks and network isolation.

### 2.1 One-Command Launch
```bash
# 1. Clone repository
git clone https://github.com/pushkar-mhatre/lifelink.git
cd lifelink

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your secrets

# 3. Build images and start all services in detached mode
docker compose up -d --build
```

### 2.2 Database Initialization & Seeding Inside Container
Once containers are running:
```bash
# Push database schema
docker compose exec api npx prisma db push --schema=./prisma/schema.prisma

# Seed realistic Thane District dataset
docker compose exec api npx tsx prisma/seed.ts
```

### 2.3 Inspecting Logs
```bash
# View combined logs
docker compose logs -f

# View API logs specifically
docker compose logs -f api

# Check container health status
docker compose ps
```

---

## 3. Environment Variables Reference

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `PORT` | No | `4000` | Port for Express backend server |
| `NODE_ENV` | Yes | `production` | Node environment (`production` or `development`) |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/lifelink?schema=public` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | *Min 32 random characters* | Secret for signing 15-minute access tokens |
| `JWT_REFRESH_SECRET` | Yes | *Min 32 random characters* | Secret for signing 7-day refresh tokens |
| `CORS_ORIGIN` | Yes | `https://lifelink.health` | Permitted frontend origins for CORS |
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.lifelink.health/api/v1` | Public API endpoint for frontend client |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | `https://api.lifelink.health` | Public WebSocket endpoint for frontend client |
| `SMS_PROVIDER` | No | `mock` | SMS Adapter: `mock` \| `twilio` \| `msg91` |
| `WHATSAPP_PROVIDER` | No | `mock` | WhatsApp Adapter: `mock` \| `live` |
| `ABDM_PROVIDER` | No | `mock` | ABDM ABHA Adapter: `mock` \| `live` |
| `TWILIO_ACCOUNT_SID` | If Twilio | `AC_xxxx` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | If Twilio | `xxxx` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | If Twilio | `+1234567890` | Verified Twilio sender number |
| `MSG91_AUTH_KEY` | If MSG91 | `xxxx` | MSG91 Authentication key |
| `MSG91_SENDER_ID` | If MSG91 | `LIFELK` | 6-character registered DLT Sender ID |
| `DEFAULT_ROAD_SPEED_KMPH` | No | `40` | Speed used for road network ETA calculations |
| `DEMO_OTP_CODE` | Dev only | `123456` | Fixed OTP for sandbox login testing |

---

## 4. Manual / Bare-Metal Deployment (PM2 + Nginx)

For deployment directly on an Ubuntu/Debian server:

### 4.1 System Setup & Dependencies
```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib nginx

# Enable Corepack and install PM2 globally
corepack enable
npm install -g pm2
```

### 4.2 Build Application Packages
```bash
cd /opt/lifelink
pnpm install --frozen-lockfile
pnpm build
```

### 4.3 Configure PM2 Process Manager
Create an `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'lifelink-api',
      cwd: './apps/api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'lifelink-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Start PM2 services:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4.4 Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/lifelink`:

```nginx
server {
    listen 80;
    server_name lifelink.health api.lifelink.health;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lifelink.health;

    ssl_certificate /etc/letsencrypt/live/lifelink.health/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lifelink.health/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.lifelink.health;

    ssl_certificate /etc/letsencrypt/live/api.lifelink.health/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.lifelink.health/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/lifelink /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. Security Checklist for Production

- [x] **Strict No-PII Enforcement:** Request validation prevents patient names, Aadhaar, and phone numbers from entering the database.
- [ ] **HTTPS / TLS:** Always use TLS 1.3 encryption (via Let's Encrypt / Certbot).
- [ ] **Secret Management:** Generate high-entropy 64-character secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` using `openssl rand -base64 48`.
- [ ] **Database Connection Security:** Ensure PostgreSQL enforces SSL (`sslmode=require`) in cloud deployments (AWS RDS, Supabase, Neon).
- [ ] **Rate Limiting:** Production limits (`500 req / 15 min`) prevent denial-of-service attempts.
- [ ] **CORS Isolation:** Restrict `CORS_ORIGIN` to exact production domain(s); do not use wildcard `*` in production.
- [ ] **Database Backups:** Schedule daily pg_dump cron backups to offsite S3-compatible storage.

---

## 6. Health Checks & Monitoring

### 6.1 Liveness Probe
- **URL:** `GET /api/v1/health`
- **Expected Status:** `200 OK`
- **Output:** Checks database connectivity (`SELECT 1`), process uptime, server timestamp, and environment mode.

```bash
curl -f https://api.lifelink.health/api/v1/health || exit 1
```

### 6.2 Database Backups
```bash
# Manual snapshot
pg_dump -U postgres -h localhost -d lifelink -F c -b -v -f "/var/backups/lifelink_$(date +%Y%m%d_%H%M%S).dump"
```
