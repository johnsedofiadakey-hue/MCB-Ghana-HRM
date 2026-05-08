# Nexus HR Platform — Render Deployment Guide

## Prerequisites
- Render account (render.com)
- Your PostgreSQL DATABASE_URL from Render (or Supabase/Neon)
- SMTP credentials for email (Gmail App Password recommended)
- This codebase pushed to GitHub

---

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Nexus HR Platform v5 - Production Ready"
git remote add origin https://github.com/YOUR_USERNAME/nexus-hr-platform.git
git push -u origin main
```

---

## Step 2: Create PostgreSQL Database on Render

1. Render Dashboard → **New** → **PostgreSQL**
2. Name: `nexus-hr-platform-db`
3. Plan: Free (for testing) or Starter (production)
4. Copy the **Internal Database URL** — you'll need it in Step 3

---

## Step 3: Deploy Backend API

1. Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `nexus-hr-platform-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma db push --accept-data-loss && node dist/app.js`
4. Environment Variables (set in Render dashboard):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Render PostgreSQL Internal URL |
| `JWT_SECRET` | Click "Generate" in Render |
| `JWT_REFRESH_SECRET` | Click "Generate" in Render |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `FRONTEND_URL` | Your frontend URL (set after Step 4) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your-email@gmail.com |
| `SMTP_PASS` | Your Gmail App Password |
| `SMTP_FROM` | noreply@yourcompany.com |

---

## Step 4: Deploy Frontend

1. Render Dashboard → **New** → **Static Site**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `nexus-hr-platform-client`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Environment Variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://nexus-hr-platform-api.onrender.com/api` |

5. Under **Redirects/Rewrites**, add:
   - Source: `/*` → Destination: `/index.html` → Type: **Rewrite**

---

## Step 5: Run First-Time Setup

After your backend deploys successfully, run the setup script to create all default accounts:

```bash
# SSH into Render shell, or run locally with production DATABASE_URL:
DATABASE_URL="your-postgres-url" npx ts-node src/scripts/setup.ts
```

Or add it as a one-time job in Render → **Jobs** → **One-Off Job**.

---

## Step 6: Update FRONTEND_URL

Once your frontend URL is known (e.g. `https://nexus-hr-platform-client.onrender.com`):
1. Go to your **API service** in Render
2. Update `FRONTEND_URL` environment variable
3. Redeploy

---

## Default Login Accounts

| Role | Email | Password |
|---|---|---|
| DEV | dev@nexus-system.com | DevMaster@2025! |
| MD | md@nexus.com | MD@Nexus2025! |
| Director | director@nexus.com | Director@Nexus2025! |
| Manager | manager@nexus.com | Manager@Nexus2025! |
| Team Lead | mid@nexus.com | Mid@Nexus2025! |
| Staff | staff@nexus.com | Staff@Nexus2025! |
| Casual | casual@nexus.com | Casual@Nexus2025! |

> ⚠️ **Change all passwords immediately after first login.**

---

## Production Checklist

- [ ] PostgreSQL database created and URL set
- [ ] JWT_SECRET set (minimum 64 chars)
- [ ] SMTP configured and tested
- [ ] FRONTEND_URL set to deployed frontend
- [ ] Setup script run (default accounts created)
- [ ] Passwords changed on all default accounts
- [ ] Custom domain configured (optional)

---

## Monitoring

- Health check: `GET /api/health`
- Logs: Render Dashboard → Your API service → **Logs**
- Database: Render PostgreSQL Dashboard

## Local Development

```bash
# Install all dependencies
npm run install:all   # from root, or:
cd server && npm install
cd client && npm install

# Setup database
cd server
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET

# Run migrations
npx prisma migrate dev

# Create accounts
npx ts-node src/scripts/setup.ts

# Start dev servers
cd ..
npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:5000/api
