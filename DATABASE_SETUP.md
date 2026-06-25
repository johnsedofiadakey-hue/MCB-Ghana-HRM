# Database Setup Guide

The MCB Ghana HRM requires **PostgreSQL** (not SQLite). Choose one of these options:

## Option 1: Docker (Fastest - If Docker Installed)

```bash
# Pull and run PostgreSQL container
docker run --name mcb-postgres \
  -e POSTGRES_USER=mcbuser \
  -e POSTGRES_PASSWORD=mcbpassword \
  -e POSTGRES_DB=mcb_hrm \
  -p 5432:5432 \
  -d postgres:15

# Connection string for .env:
DATABASE_URL="postgresql://mcbuser:mcbpassword@localhost:5432/mcb_hrm"
```

---

## Option 2: Free Cloud Database (Recommended - No Installation)

### Using **Neon** (Fastest Setup)

1. Go to: https://neon.tech
2. Sign up (free account)
3. Create a new project
4. Copy the connection string (looks like: `postgresql://user:password@ep-xxx.us-east-2.neon.tech/dbname`)
5. Add to `server/.env`:
   ```
   DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.neon.tech/dbname"
   ```

### Alternative: **Railway** (Also Free)

1. Go to: https://railway.app
2. Sign up with GitHub
3. Create new PostgreSQL database
4. Copy connection URL
5. Add to `server/.env`

---

## Option 3: Local PostgreSQL (macOS)

```bash
# Install PostgreSQL with Homebrew
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb mcb_hrm

# Create user
psql postgres -c "CREATE USER mcbuser WITH PASSWORD 'mcbpassword';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE mcb_hrm TO mcbuser;"

# Connection string:
DATABASE_URL="postgresql://mcbuser:mcbpassword@localhost:5432/mcb_hrm"
```

---

## Quick Setup for Testing

**I recommend Neon** (Option 2) because:
- ✅ Free tier (5 GB)
- ✅ No installation needed
- ✅ Works immediately
- ✅ Automatic backups
- ✅ Can access from anywhere

1. Create free Neon account
2. Copy connection string
3. Paste into `server/.env` as `DATABASE_URL`
4. Run: `npx prisma db push`
5. Done! ✅

---

Once you have a DATABASE_URL set up, run:

```bash
cd /Users/truth/Developer/MCB-Ghana-HRM/server
npx prisma db push
npm run db:seed  # Optional: Add sample data
```

Then start the app:
```bash
npm run dev
```
