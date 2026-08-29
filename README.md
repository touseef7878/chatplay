<div align="center">

<!-- Animated wave banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0d9488,6366f1&height=200&section=header&text=ChatPlay&fontSize=72&fontColor=ffffff&fontAlignY=38&desc=Real-time%20chat%20%C2%B7%20Voice%20%C2%B7%20Games%20%C2%B7%20Presence&descAlignY=58&descSize=18&animation=fadeIn" width="100%" />

<!-- Animated typing SVG -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=20&pause=1000&color=2DD4BF&center=true&vCenter=true&width=600&lines=Real-time+group+chat+%F0%9F%92%AC;Voice+notes+%2B+image+attachments+%F0%9F%8E%99%EF%B8%8F;Multiplayer+games+inside+rooms+%F0%9F%8E%AE;Built+on+React+19+%2B+Supabase+%E2%9A%A1;Deployed+on+Vercel+%F0%9F%9A%80" alt="Typing SVG" />
</a>

<br/>

<!-- Badges -->
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

<br/>

> **ChatPlay** is a full-featured, real-time chat platform where users join rooms, share voice notes and images, react to messages, and challenge each other to multiplayer games — all powered by Supabase and deployed on Vercel.

</div>

<br/>

<!-- Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## ✨ What's inside

<div align="center">

|  | Feature | Details |
|--|---------|---------|
| 🔐 | **Auth** | Username + password only — no OAuth. Auto-profile via Postgres trigger |
| 🏠 | **Rooms** | Public & private rooms up to 100 members; invitation-only access for private |
| 💬 | **Messaging** | Optimistic send · 120-message history · inline images (PNG/JPEG/WebP/GIF, 10 MiB) |
| 🎙️ | **Voice notes** | Browser-mic WebM recording up to 60 s · Supabase Storage · inline playback |
| 🔥 | **Reactions** | 🔥 😂 👏 💚 with live counts and per-user toggle |
| 👁️ | **Presence** | Real-time online list per room via Supabase Realtime presence |
| 🔔 | **Notifications** | Persistent alerts for room invites & game challenges over private channels |
| 🛡️ | **Moderation** | Owner / admin / member roles · kick members · role-change notifications |
| 🎮 | **Games** | Tic-Tac-Toe · Word Scramble · Trivia Sprint (live leaderboard) |
| 🧑‍💻 | **Dev panel** | List accounts · audit log · delete users via protected Edge Function |
| 🧹 | **Data cleanup** | Bulk-delete your own messages, voice files, and images |
| 🌙 | **Themes** | Dark (default) and light — switchable at runtime |

</div>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## 🛠️ Tech stack

<div align="center">

### Frontend

<img src="https://skillicons.dev/icons?i=react,typescript,vite,tailwind,html,css&theme=dark&perline=6" />

| Library | Role |
|---------|------|
| **React 19 + TypeScript** | Core UI framework |
| **Vite 7** | Build tool and dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **Radix UI + shadcn primitives** | 53 accessible UI components in `client/src/components/ui/` |
| **Framer Motion** | Animated sidebar and spring transitions |
| **Wouter** | Lightweight client-side routing |
| **Sonner** | Toast notifications |
| **React Hook Form + Zod** | Type-safe form validation |
| **Lucide React** | Icon set |

<br/>

### Backend & Infrastructure

<img src="https://skillicons.dev/icons?i=supabase,postgres,vercel,nodejs&theme=dark&perline=6" />

| Service | Role |
|---------|------|
| **Supabase Auth** | Session management; username stored in `profiles` table |
| **Supabase Postgres + RLS** | All data behind row-level security policies |
| **Supabase Realtime** | Private channels for messages, presence, notifications, game state |
| **Supabase Storage** | Buckets: `voice-messages` · `chat-images` (private) · `avatars` |
| **Edge Functions** | `chatplay-auth` (register/login) · `chatplay-admin` (dev management + audit) |
| **Vercel** | Frontend hosting with SPA rewrites |
| **pnpm 10** | Package manager |
| **Vitest** | Unit test runner |

</div>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## 📂 Project structure

```bash
chatplay/
│
├── 📁 client/                     # React SPA (Vite root)
│   └── src/
│       ├── 📄 pages/ChatPlay.tsx  # Entire authenticated workspace
│       ├── 📁 components/ui/      # 53 Radix/shadcn UI primitives
│       ├── 📁 _core/hooks/        # useSupabaseAuth — session management
│       └── 📁 lib/                # Supabase clients, RPCs, game utils, media utils
│
├── 📁 server/                     # Legacy Express/tRPC server (not needed for Vercel)
├── 📁 shared/                     # Types and constants shared across client/server
│
├── 📁 supabase/
│   ├── 📁 migrations/             # 14 ordered SQL files (schema, RLS, Realtime, Storage)
│   └── 📁 functions/
│       ├── chatplay-auth/         # Register + login Edge Function
│       └── chatplay-admin/        # Developer user management + audit Edge Function
│
├── 📁 drizzle/                    # Legacy Drizzle schema (scaffold only)
├── 📁 docs/                       # Security and deployment notes
├── 📄 vercel.json                 # Vercel deployment config
└── 📄 package.json
```

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## 🚀 Getting started

### Prerequisites

```
Node.js  ≥ 20
pnpm     ≥ 10
A Supabase project (free tier works)
```

<br/>

### Step 1 — Clone and install

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL> chatplay
cd chatplay
pnpm install
```

### Step 2 — Configure environment variables

Create `.env.local` at the repository root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

> ⚠️ **Never put `SUPABASE_SERVICE_ROLE_KEY` or any server secret in a Vercel browser variable.** Edge Functions manage their own secrets inside the Supabase dashboard.

### Step 3 — Apply database migrations

```bash
# Verify order before applying
ls supabase/migrations/*.sql | sort

# Apply 0001 → 0012 via Supabase SQL Editor or CLI
```

After applying, disable public Realtime channel access in your Supabase project. See [`docs/realtime-security-validation.md`](docs/realtime-security-validation.md).

### Step 4 — Deploy Edge Functions

```bash
supabase functions deploy chatplay-auth
supabase functions deploy chatplay-admin
```

### Step 5 — Run locally

```bash
# ✅ Recommended — fresh Supabase/Vercel path
pnpm dev:frontend

# Legacy Express + Vite compatibility server
pnpm dev
```

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## 🔑 Environment variables

<details>
<summary><b>🟢 Required — Browser (Vercel + local)</b></summary>
<br/>

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (safe for the browser) |

</details>

<details>
<summary><b>🔴 Secrets — Supabase dashboard only (never in Vercel)</b></summary>
<br/>

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin operations in `chatplay-admin` |
| `SUPABASE_JWT_SECRET` | Auth bridge JWT validation |

</details>

<details>
<summary><b>⚪ Legacy — not needed for the Vercel fresh path</b></summary>
<br/>

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection for the legacy Express/Drizzle server |
| `JWT_SECRET` | Legacy server JWT signing secret |
| `PORT` | Server port; defaults to the platform-provided value |
| `NODE_ENV` | `development` or `production` |

</details>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## 💻 Development commands

<div align="center">

| Command | Description |
|---------|-------------|
| `pnpm dev:frontend` | ⚡ Start the Vite dev server (Supabase-only path) |
| `pnpm dev` | Start the legacy Express + Vite compatibility server |
| `pnpm check` | 🔍 TypeScript type-check without emitting |
| `pnpm test` | 🧪 Run the Vitest suite |
| `pnpm build:frontend` | 📦 Build SPA → `dist/public` for Vercel |
| `pnpm build` | Build browser bundle + bundled compatibility server |
| `pnpm start` | ▶️ Start the production bundle from `dist/` |
| `pnpm format` | 🎨 Format source files with Prettier |
| `pnpm db:push` | Generate and apply Drizzle migrations (legacy only) |

</div>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## ☁️ Deploying to Vercel

The `vercel.json` is already wired up:

| Setting | Value |
|---------|-------|
| Build command | `pnpm build:frontend` |
| Output directory | `dist/public` |
| Install command | `pnpm install --frozen-lockfile` |
| Routes | All paths rewrite to `index.html` |

Set these two variables in **Vercel → Project Settings → Environment Variables** for Preview and Production:

```
VITE_SUPABASE_URL              → https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY  → <anon-key>
```

In **Supabase Dashboard → Auth → URL Configuration** add:
- Your Vercel production URL
- `https://*.vercel.app` for preview deployments

Full checklist → [`docs/vercel-supabase-runbook.md`](docs/vercel-supabase-runbook.md)

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## ✅ Pre-release checklist

```bash
pnpm check          # type-check
pnpm test           # run tests
pnpm build:frontend # Vercel bundle
pnpm build          # full bundle
```

> For schema changes: apply to a staging project, verify RLS with two separate accounts, then promote to production.

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## 🔒 Security notes

<div align="center">

```
╔════════════════════════════════════════════════════════════════╗
║  NEVER expose SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET,          ║
║  SUPABASE_JWT_SECRET, or database credentials in browser       ║
║  code, Vercel client variables, or Git history.                ║
╚════════════════════════════════════════════════════════════════╝
```

</div>

- The browser only receives `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. All secrets live exclusively in the Supabase Edge Function environment.
- Authorization is enforced by Postgres RLS policies and `SECURITY DEFINER` functions. UI-level hiding is **not** an authorization boundary.
- Private room and image access is enforced by Supabase Storage policies regardless of client state.
- Developer privileges are governed by `profiles.is_developer`, validated server-side in the `chatplay-admin` Edge Function.

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

<br/>

## 📚 References

<div align="center">

[![Supabase Docs](https://img.shields.io/badge/Supabase-Database_Migrations-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/docs/guides/database/overview)
[![RLS](https://img.shields.io/badge/Supabase-Row_Level_Security-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/docs/guides/database/postgres/row-level-security)
[![Storage](https://img.shields.io/badge/Supabase-Storage_Access-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/docs/guides/storage/security/access-control)
[![Realtime](https://img.shields.io/badge/Supabase-Realtime_Auth-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/docs/guides/realtime/authorization)
[![Edge Functions](https://img.shields.io/badge/Supabase-Edge_Functions-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/docs/guides/functions)
[![Vercel Vite](https://img.shields.io/badge/Vercel-Vite_Deployment-000000?style=for-the-badge&logo=vercel)](https://vercel.com/docs/frameworks/frontend/vite)
[![pnpm](https://img.shields.io/badge/pnpm-Docs-f69220?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

</div>

<br/>

<!-- Animated footer wave -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0d9488,6366f1&height=120&section=footer&animation=fadeIn" width="100%" />

<div align="center">
  <sub>MIT License · Built with ❤️ using React, Vite, and Supabase</sub>
</div>
