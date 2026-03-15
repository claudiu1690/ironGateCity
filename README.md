# Irongate City — Local Development Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x | https://nodejs.org |
| Docker Desktop | latest | https://docker.com |
| npm | 10.x (ships with Node 20) | — |

---

## First-time Setup

Do this once, the first time you clone the project.

### 1. Start the databases

```powershell
docker compose up -d
```

This starts PostgreSQL on port **5432** and Redis on port **6379**.  
Wait a few seconds, then verify both are healthy:

```powershell
docker compose ps
```

Both services should show `(healthy)`.

---

### 2. Install all dependencies

From the **project root**:

```powershell
npm install
```

---

### 3. Run database migrations

```powershell
npm run db:migrate
```

This creates all tables in PostgreSQL.  
When prompted for a migration name, type something like `init` and press Enter.

---

### 4. Seed the database

```powershell
npm run db:seed
```

This populates cities, missions, items, jobs, and NPC templates.

---

### 5. Configure environment

The API and web environments are pre-configured for local development.  
Verify the files exist:

- `apps/api/.env` — database, Redis, JWT secrets
- `apps/web/.env.local` — API URL

> **Stripe:** The Store page requires Stripe keys. If you don't have them,  
> leave the Stripe values as `replace_me` — everything else in the game works  
> without them.

---

## Daily Startup

Once set up, every time you want to develop:

```powershell
# 1. Start the databases (if Docker isn't already running them)
docker compose up -d

# 2. Start both servers in one terminal
npm run dev
```

This starts:
- **API** → http://localhost:3001
- **Web** → http://localhost:3000

Or run them in separate terminals for cleaner logs:

```powershell
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Web
npm run dev:web
```

---

## App URLs

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Next.js web app |
| API | http://localhost:3001 | Express REST API |
| Health check | http://localhost:3001/api/health | DB + Redis status |
| API base | http://localhost:3001/api/v1 | All game endpoints |
| Prisma Studio | http://localhost:5555 | Visual DB browser (see below) |

---

## Verifying Everything Works

After `npm run dev`, open your browser to:

**http://localhost:3001/api/health**

You should see:
```json
{ "status": "healthy", "checks": { "api": "ok", "database": "ok", "redis": "ok" } }
```

Then go to **http://localhost:3000** — you should see the landing page.

---

## Viewing the Database

### Option A — Prisma Studio (GUI)

In a separate terminal:

```powershell
npm run db:studio
```

Opens a browser UI at **http://localhost:5555** where you can browse and edit all tables.

### Option B — psql in Docker

```powershell
docker exec -it irongate_postgres psql -U irongate -d irongate
```

Useful queries inside psql:

```sql
-- List all tables
\dt

-- View cities and their influence
SELECT c.name, ci."fascistPct", ci."communistPct", ci."democratPct"
FROM "City" c JOIN "CityInfluence" ci ON ci."cityId" = c.id;

-- View all users
SELECT id, username, email, "isPremium", "createdAt" FROM "User";

-- View characters
SELECT c.name, c.faction, c.level, c."factionRank", c."ironMarks"
FROM "Character" c;

-- View missions (first 10)
SELECT slug, title, type, "energyCost", "xpReward" FROM "Mission" LIMIT 10;

-- View items (first 10)
SELECT name, slot, tier, "buyCost" FROM "Item" LIMIT 10;

-- Exit psql
\q
```

### Option C — Redis CLI

```powershell
docker exec -it irongate_redis redis-cli
```

Useful commands inside redis-cli:

```
# Check all energy keys
KEYS energy:*

# Read a character's energy state
HGETALL energy:<characterId>

# Check all rate-limit keys
KEYS rl:*

# Flush all Redis data (resets energy + rate limits)
FLUSHALL

# Exit
quit
```

---

## Common Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start API (watch) + Web together |
| `npm run dev:api` | Start only the API (watch mode — auto-reloads on save) |
| `npm run dev:web` | Start only the web |
| `npm run db:migrate` | Create/apply DB migrations |
| `npm run db:seed` | Seed static game data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `docker compose up -d` | Start Postgres + Redis in background |
| `docker compose down` | Stop Postgres + Redis |
| `docker compose down -v` | Stop + delete all DB data (full reset) |

---

## Full Reset (Start From Scratch)

If you want to wipe the database and start fresh:

```powershell
# Stop and delete all Docker volumes (wipes all data)
docker compose down -v

# Restart fresh containers
docker compose up -d

# Re-apply migrations
npm run db:migrate

# Re-seed
npm run db:seed
```

---

## Registering Your First Account

1. Go to **http://localhost:3000**
2. Click **Create Account**
3. Fill in username, email, password
4. You'll be taken through the **Origin Story** — answer the 4 dialogue questions and pick your faction
5. You'll land on the **Dashboard**

---

## Known Limitations (Local Dev)

| Feature | Status | Notes |
|---------|--------|-------|
| Energy regeneration | Works | BullMQ worker runs every 1 minute |
| Background jobs | Works | All 12 BullMQ workers start with the API |
| WebSockets | Works | `/world` and `/player` namespaces active |
| Stripe / Store page | Disabled | Set real Stripe keys in `apps/api/.env` to enable |
| Email verification | Not built | No email service for MVP |

---

## Project Structure

```
ironGateCity/
├── apps/
│   ├── api/                   # Express + Prisma backend
│   │   ├── prisma/            # Schema + migrations + seed
│   │   └── src/
│   │       ├── routes/        # REST route handlers
│   │       ├── services/      # Business logic
│   │       ├── jobs/          # BullMQ workers
│   │       ├── socket/        # Socket.io namespaces
│   │       └── middleware/    # Auth, rate limiting, errors
│   └── web/                   # Next.js 14 frontend
│       ├── app/               # App Router pages
│       ├── components/        # Reusable UI components
│       ├── store/             # Zustand state stores
│       ├── hooks/             # Socket + auth hooks
│       └── lib/               # API client + token utils
├── docker-compose.yml         # Local Postgres + Redis
└── package.json               # Monorepo workspace root
```
