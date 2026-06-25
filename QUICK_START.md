# MCB Ghana HRM - Quick Start Guide

## 🚀 Setup & Login Instructions

### Prerequisites
- Node.js 18+ (check: `node --version`)
- npm 9+ (check: `npm --version`)
- PostgreSQL database (or use existing connection string)

---

## 📋 Step 1: Install Dependencies

```bash
cd /Users/truth/Developer/MCB-Ghana-HRM

# Install all dependencies (both server and client)
npm run install:all

# This runs:
# - cd server && npm install
# - cd client && npm install
```

---

## 🔧 Step 2: Configure Environment Variables

### Server Configuration

```bash
# Copy the example file
cp server/.env.example server/.env

# Edit server/.env with your values:
# Key variables needed:
# - DATABASE_URL: PostgreSQL connection string (REQUIRED)
# - JWT_SECRET: Random 64-char hex string (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - NODE_ENV: "development" (for local)
# - FRONTEND_URL: "http://localhost:5173" (for local dev)
# - PORT: 5000 (optional, default)

# For testing/demo, you can use a simple SQLite database:
# DATABASE_URL="file:./dev.db"
```

### Client Configuration

```bash
# Copy the example file
cp client/.env.example client/.env

# The Firebase config is already provided in the example:
# VITE_API_URL=http://localhost:5000/api
```

---

## 🗄️ Step 3: Setup Database

```bash
# Run migrations
cd server
npx prisma migrate deploy

# (If no migrations exist yet, run this to sync schema)
npx prisma db push

# Optional: Seed demo data
npm run db:seed

# Check database status
npx prisma studio  # Opens interactive DB viewer on http://localhost:5555
```

---

## ▶️ Step 4: Start the Application

### Option A: Run Both Server & Client Together

```bash
cd /Users/truth/Developer/MCB-Ghana-HRM
npm run dev
# This starts both:
# - Backend on http://localhost:5000
# - Frontend on http://localhost:5173
```

### Option B: Run Server & Client Separately (recommended for debugging)

**Terminal 1 - Start Backend:**
```bash
cd /Users/truth/Developer/MCB-Ghana-HRM/server
npm run dev
# Server running on http://localhost:5000
```

**Terminal 2 - Start Frontend:**
```bash
cd /Users/truth/Developer/MCB-Ghana-HRM/client
npm run dev -- --force
# Frontend running on http://localhost:5173
```

---

## 🔐 Step 5: Login Options

You have **3 easy login methods**:

### Option 1: Sandbox Auto-Login (Fastest - No Credentials Needed)

This creates a full demo tenant with sample data automatically.

```bash
# Make a POST request to sandbox endpoint
curl -X POST http://localhost:5000/api/auth/sandbox

# Response:
# {
#   "token": "eyJhbGc...",
#   "refreshToken": "...",
#   "user": {
#     "id": "...",
#     "name": "Sandbox Director",
#     "role": "MD",
#     "organizationId": "sandbox-org-001",
#     "isSandbox": true
#   }
# }
```

Or **via the UI**: 
- Go to http://localhost:5173/login
- Look for "Sandbox" or "Demo" button
- Click to auto-login

---

### Option 2: Demo Role Login (No Credentials)

Login as specific pre-defined roles without needing real user accounts.

**MD (Managing Director):**
```bash
curl -X POST http://localhost:5000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"role": "MD"}'
```

**MANAGER:**
```bash
curl -X POST http://localhost:5000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"role": "MANAGER"}'
```

**STAFF:**
```bash
curl -X POST http://localhost:5000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"role": "STAFF"}'
```

Response includes:
```json
{
  "token": "eyJhbGc...",
  "refreshToken": "abc123...",
  "user": {
    "id": "...",
    "name": "John Mensah",
    "role": "MD",
    "email": "demo.md@nexus-demo.com",
    "isDemo": true
  }
}
```

---

### Option 3: Standard Email/Password Login

If you created a user account in the database:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "YourPassword123!"
  }'
```

---

## 🌐 Access the Application

Once logged in:

1. **Frontend URL:** http://localhost:5173/dashboard
2. Your token will be stored in localStorage
3. All API calls will include the Bearer token automatically

---

## 📊 What to Explore

### If Logged In as **MD** (Managing Director):
- Full platform access
- User management
- Payroll approvals
- All configurations

### If Logged In as **MANAGER**:
- Team management
- KPI tracking
- Leave approvals for team members
- Performance reports

### If Logged In as **STAFF**:
- Personal dashboard
- Leave requests
- View own performance
- Submit goals

---

## 🐛 Troubleshooting

### Error: `JWT_SECRET is not set`
```bash
# Generate a random JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to server/.env
JWT_SECRET=<paste-the-output-here>
```

### Error: `DATABASE_URL connection failed`
```bash
# Check your database connection string
# Format: postgresql://user:password@host:port/dbname

# For SQLite testing:
DATABASE_URL="file:./dev.db"
```

### Error: `CORS error when calling API`
```bash
# Make sure FRONTEND_URL in server/.env matches your frontend URL
FRONTEND_URL="http://localhost:5173"  # for local dev
```

### Frontend shows blank page
```bash
# Clear cache and restart
cd client
npm run dev -- --force  # Force vite to rebuild
```

### Database sync issues
```bash
# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset

# Then seed demo data
npm run db:seed
```

---

## 🔑 Demo Credentials Summary

| Method | Email | Password | Role | How to Use |
|--------|-------|----------|------|-----------|
| **Sandbox** | N/A | N/A | MD | POST `/auth/sandbox` |
| **Demo MD** | demo.md@nexus-demo.com | N/A | MD | POST `/auth/demo-login` with `role: "MD"` |
| **Demo Manager** | demo.manager@nexus-demo.com | N/A | MANAGER | POST `/auth/demo-login` with `role: "MANAGER"` |
| **Demo Staff** | demo.staff@nexus-demo.com | N/A | STAFF | POST `/auth/demo-login` with `role: "STAFF"` |

---

## 📱 Using the UI (Easier)

1. Open http://localhost:5173/login
2. Look for:
   - "Try Demo" button → auto-logs you as MD
   - "Sandbox" button → full demo environment
   - Email/Password form → standard login
3. Click desired option
4. You're in! 🎉

---

## 🚀 Production Build

When ready to deploy:

```bash
# Build both server and client
npm run build

# Server
cd server && npm start

# Client
cd client
npm run build
# Deploy the dist/ folder to Firebase or your hosting
```

---

## 📚 Additional Resources

- **Auth Review:** See `AUTH_REVIEW.md` for security analysis
- **API Routes:** Check `server/src/routes/` for all endpoints
- **Database Schema:** View `server/src/prisma/schema.prisma`
- **Frontend Components:** Check `client/src/pages/` for React components

---

## ✅ Next Steps

1. ✅ Install dependencies → `npm run install:all`
2. ✅ Setup .env files → Copy examples and fill in DATABASE_URL
3. ✅ Migrate database → `cd server && npx prisma db push`
4. ✅ Start app → `npm run dev`
5. ✅ Login → Use sandbox or demo login (no credentials needed!)
6. ✅ Explore → Check out MD, Manager, and Staff dashboards

---

**Questions?** Check the logs in terminal - they're quite verbose and helpful! 🚀
