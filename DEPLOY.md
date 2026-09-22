# LifeLink — Deployment Guide

> Deploy the **backend API** on [Render](https://render.com) and the **frontend** on [Vercel](https://vercel.com), both pointing to the live **Supabase PostgreSQL** database.

---

## Architecture

```
┌─────────────────────┐        ┌─────────────────────┐
│   Vercel (Frontend) │───────▶│   Render (Backend)  │
│   apps/web          │  HTTP  │   apps/api           │
│   Next.js 14        │◀───────│   Express + Prisma   │
└─────────────────────┘        └──────────┬──────────┘
                                          │ PostgreSQL
                                          ▼
                               ┌─────────────────────┐
                               │  Supabase (Database) │
                               │  ap-southeast-2      │
                               └─────────────────────┘
```

---

## Prerequisites

- [x] Code pushed to GitHub
- [x] Supabase project created and schema deployed (`pnpm db:push`)
- [x] Database seeded (`pnpm db:seed`)
- [x] GitHub account connected to both Render and Vercel

---

## Step 1 — Deploy Backend on Render

### 1.1 Create a New Web Service

1. Go to [render.com](https://render.com) → Log in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Select **"Build and deploy from a Git repository"**
4. Connect your GitHub account if prompted
5. Find and select your **`Life-Link`** (or `Life-Link-API`) repository
6. Click **"Connect"**

### 1.2 Configure Build Settings

| Field | Value |
|---|---|
| **Name** | `lifelink-api` |
| **Region** | `Singapore (Southeast Asia)` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Root Directory** | *(leave blank)* |
| **Build Command** | `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @lifelink/shared build && pnpm --filter @lifelink/api db:generate && pnpm --filter @lifelink/api build` |
| **Start Command** | `node apps/api/dist/server.js` |
| **Instance Type** | `Free` |

> **Note:** If using the standalone `Life-Link-API` repo, the build command simplifies to:
> `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm build`

### 1.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add the following:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` |
| `JWT_ACCESS_SECRET` | *(generate a strong 32+ char random string)* |
| `JWT_REFRESH_SECRET` | *(generate a different strong 32+ char random string)* |
| `CORS_ORIGIN` | `*` *(update to your Vercel URL after Step 2)* |
| `SMS_PROVIDER` | `mock` |
| `WHATSAPP_PROVIDER` | `mock` |
| `ABDM_PROVIDER` | `mock` |
| `DEMO_OTP_CODE` | `123456` |
| `DEFAULT_ROAD_SPEED_KMPH` | `40` |

> **Supabase DATABASE_URL format:**
> ```
> postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
> ```
> Use the **Session Mode pooler** (port 5432), not the direct connection or transaction pooler.

### 1.4 Deploy

1. Click **"Create Web Service"**
2. Wait for the build to complete (~3–5 minutes)
3. Once the indicator turns green ✅, your API is live
4. Copy your API URL — it looks like: `https://lifelink-api.onrender.com`

### 1.5 Verify Backend is Running

Open in your browser or run in terminal:

```bash
curl https://lifelink-api.onrender.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0",
  "mode": "production"
}
```

---

## Step 2 — Deploy Frontend on Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com) → Log in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Find and select your **`Life-Link`** (or `Life-Link-Web`) repository
4. Click **"Import"**

### 2.2 Configure Project Settings

Vercel auto-detects Next.js. Set these overrides:

| Field | Value |
|---|---|
| **Framework Preset** | `Next.js` *(auto-detected)* |
| **Root Directory** | `apps/web` |
| **Build Command** | *(leave default — Vercel uses `next build`)* |
| **Output Directory** | *(leave default)* |
| **Install Command** | `cd ../.. && npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @lifelink/shared build` |

> **Important:** Setting Root Directory to `apps/web` is required so Vercel builds the Next.js app correctly.
>
> If you're using the standalone `Life-Link-Web` repo, set Root Directory to `apps/web` and Install Command to:
> `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @lifelink/shared build`

### 2.3 Add Environment Variables

Click **"Environment Variables"** and add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://lifelink-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://lifelink-api.onrender.com` |

> Replace `https://lifelink-api.onrender.com` with your actual Render URL from Step 1.4.

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (~2–3 minutes)
3. Once done ✅, your frontend is live at a URL like: `https://life-link.vercel.app`

### 2.5 Verify Frontend is Running

1. Open your Vercel URL in a browser
2. You should see the LifeLink login page
3. Log in with any demo credential, e.g.:
   - **Phone:** `9820011003`
   - **Password:** `demo1234`

---

## Step 3 — Wire Up CORS (Important!)

After both services are deployed, update the backend to only allow requests from your Vercel domain:

1. Go to **Render dashboard** → your `lifelink-api` service
2. Click **"Environment"** tab
3. Update `CORS_ORIGIN`:

   | Key | Value |
   |---|---|
   | `CORS_ORIGIN` | `https://life-link.vercel.app` |

4. Click **"Save Changes"** → Render will auto-redeploy

---

## Demo Credentials

All users use password `demo1234`. OTP code is `123456`.

| Role | Phone | Primary Route |
|---|---|---|
| Facility Admin (NMMC Nerul UHC) | `9820011001` | `/dashboard` |
| Facility Admin (Dr. D.Y. Patil Hospital) | `9820011002` | `/dashboard` |
| Blood Bank Officer (Vashi) | `9820011003` | `/blood` |
| Citizen Blood Donor | `9820011004` | `/donor` |
| Emergency Transport Driver | `9820011005` | `/logistics` |
| Municipal Health Officer | `9820011006` | `/oversight` |
| State Health Administrator | `9820011007` | `/oversight` |
| Facility Admin (CIDCO Kharghar CHC) | `9820011008` | `/dashboard` |
| Blood Bank Officer (Jeevan Jyoti) | `9820011009` | `/blood` |

---

## Final Deployment Checklist

- [ ] Render API build succeeded and `/api/v1/health` returns `"database": "connected"`
- [ ] Vercel frontend build succeeded and login page loads
- [ ] Login with `9820011003` / `demo1234` works end-to-end
- [ ] `CORS_ORIGIN` on Render updated to your Vercel domain
- [ ] Blood matrix, dashboard, and oversight pages load with live data

---

## Re-seeding the Database

If you need to re-seed at any point:

```bash
# From the project root (local)
pnpm db:seed

# Or directly
pnpm --filter @lifelink/api exec tsx prisma/seed.ts
```

> The seed script wipes all existing data and re-inserts the full Navi Mumbai & Mumbai mesh.

---

## Troubleshooting

### API returns `"database": "error"` on Render

- Verify `DATABASE_URL` uses the **Session Pooler** URL (port `5432`), not the direct host
- Ensure the password's `@` is URL-encoded as `%40`
- Example: `Lifelink@40.` → `Lifelink%4040.`

### Vercel build fails: `Cannot find module '@lifelink/shared'`

- Ensure **Root Directory** is set to `apps/web` in Vercel settings
- Ensure the Install Command builds `@lifelink/shared` before `@lifelink/web`

### Login fails on deployed frontend

- Check `NEXT_PUBLIC_API_URL` in Vercel env vars points to your Render URL
- Check `CORS_ORIGIN` on Render is set to your Vercel domain (not `*`)
- Confirm Render API is awake (free tier sleeps after 15 minutes of inactivity — first request takes ~30 seconds)

### Render free tier cold start

Free Render services spin down after 15 minutes of inactivity. The first request after sleep takes ~30–60 seconds. To avoid this, upgrade to a paid plan or use an uptime monitor like [UptimeRobot](https://uptimerobot.com) to ping `/api/v1/health` every 10 minutes.
