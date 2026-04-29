# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

校园食堂 — a campus canteen UGC community and SaaS management platform. Students browse/discover food stalls, write reviews, and favorite stalls. Merchants manage their stalls, dishes, and respond to reviews.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, React Compiler enabled)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style, zinc base, CSS variables)
- **API**: Hono on Vercel edge (catch-all route `[[...route]]/route.ts` with side-effect imports for route registration)
- **Auth**: next-auth v5 (Credentials provider, JWT sessions) — `student` and `merchant` roles
- **Database**: Drizzle ORM with dual provider support — Neon PostgreSQL (production) and better-sqlite3 (local dev)
- **State**: @tanstack/react-query (60s stale time, no refetch on window focus), zustand
- **Package manager**: Bun (bun.lock)
- **UI**: lucide-react icons, framer-motion, embla-carousel-react, recharts

## Commands

```bash
bun dev                 # Start dev server (Turbopack disabled, uses --webpack)
bun run dev:local       # Dev server with DB_PROVIDER=local (SQLite)
bun run build           # Production build
bun run lint            # ESLint (Next.js core-web-vitals + typescript configs)
bun run db:generate     # Generate Drizzle migrations
bun run db:migrate      # Run Drizzle migrations
bun run db:push         # Push schema directly to DB
bun run db:seed         # Seed PostgreSQL with test data
bun run db:seed:local   # Seed SQLite with test data
bun run db:studio       # Launch Drizzle Studio
bun run db:sync         # Generate SQLite schema from PostgreSQL schema
bun run db:export       # Export PostgreSQL data to SQLite
bun run db:migrate-to-local  # Migrate from Neon to local SQLite
bun run db:init:local   # Initialize local SQLite database
bun run test:db:local   # Run DB tests (local SQLite)
```

## Architecture

### Database Dual-Provider Pattern

`src/db/index.ts` exports `db` which is either a Neon HTTP Drizzle instance or a better-sqlite3 Drizzle instance, controlled by `DB_PROVIDER` env var (defaults to `neon`). Two parallel schemas exist:

- `src/db/schema.ts` — PostgreSQL (pg-core) schema, used by Drizzle Kit for migrations
- `src/db/schema.sqlite.ts` — SQLite schema, kept in sync manually

SQLite uses integer timestamps (ms since epoch via `Date.now()`); PostgreSQL uses native `timestamp`. The `serializeForJson()` helper in `src/lib/db-utils.ts` normalizes both for JSON responses.

Some route handlers use Drizzle query API (`db.query.xxx.findMany`), while others (especially write operations) use raw SQL via `executeSQL()`/`querySQL()` helpers for SQLite compatibility. The `withRetry()` helper in `src/lib/retry.ts` wraps DB reads with exponential backoff retry (3 attempts, 1s initial delay) for transient connection errors.

### API Route Structure

API uses Hono with a Vercel edge catch-all at `src/app/api/[[...route]]/route.ts`. Individual route files in `src/app/api/routes/` register handlers by importing `app` from `@/lib/hono` and calling methods on it — these are **side-effect imports**, no explicit router composition.

The `src/lib/hono.ts` setup includes a global error handler that returns Chinese-language error messages and detects DB connection errors (returning 503 with code `DB_CONNECTION_ERROR`).

Additional standalone Next.js route handlers exist at:
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js handlers
- `src/app/api/register/route.ts` — Registration endpoint

### Auth

JWT-based auth via next-auth v5 with `CredentialsProvider`. `src/lib/auth.ts` exports `auth`, `signIn`, `signOut`, `handlers`. Session includes `user.id` and `user.role` (`'student' | 'merchant'`). Auth type overrides are in `src/types/next-auth.d.ts`.

Route handlers check auth via `const session = await auth()` and guard by role.

### Page Structure

- `/` — Home: ranked stalls list with cafeteria tab filter, landing redirect on first visit
- `/stalls/[id]` — Stall detail: dishes, reviews, stats
- `/dishes/[id]` — Dish detail with reviews
- `/trending` — Trending stalls
- `/profile` — User profile, favorites, reviews
- `/messages` — User messages
- `/login`, `/register`, `/landing` — Auth pages
- `/merchant/*` — Merchant dashboard (stall management, dishes CRUD, reviews, stats)
- `/settings` — App settings

Mobile-first design with `BottomNav` fixed navigation (首页, 热门, 消息, 我的).

### Frontend Providers

Wrapped in root layout: `AuthProvider` (next-auth SessionProvider) → `QueryProvider` (@tanstack/react-query).

### Key Utilities

- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge), `getDefaultAvatar()` (deterministic avatar from seed string)
- `src/lib/db-utils.ts` — `serializeForJson()` normalizes Date/int timestamps from both DB providers
- `src/lib/retry.ts` — `withRetry()` exponential backoff for DB queries

### File Upload

Images uploaded to `POST /api/upload/image` → stored in local `uploads/` dir → served at `/uploads/:filename` via `GET /api/uploads/:filename`. Max 5MB, JPEG/PNG/WebP only.

### Test Accounts

Seeded accounts (password: `password123`):
- 5 merchants: merchant1–5@example.com
- 5 students: student1–5@example.com

### 回答问题方式

- 所有回复都请使用中文进行回答
