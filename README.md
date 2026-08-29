<div align="center">

# ChatPlay

**Real-time group chat with games, voice, and presence — built on React, Vite, and Supabase**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-f0a500?style=flat-square)](LICENSE)

</div>

---

ChatPlay is a full-featured real-time chat application. Users join public or private rooms, exchange text, images, and voice notes, react to messages with emoji, and challenge each other to in-room multiplayer games — all backed by Supabase Postgres, Realtime, and Storage. The frontend is a React SPA deployed to Vercel.

---

## Features

| Area | Details |
| --- | --- |
| **Auth** | Username and password — no third-party OAuth. Registration triggers an automatic profile via a Postgres function. |
| **Rooms** | Create public or private rooms (up to 100 members). Join public rooms freely; private rooms require an invitation. |
| **Messaging** | Optimistic text send, 120-message history, inline image attachments (PNG / JPEG / WebP / GIF, up to 10 MiB). |
| **Voice notes** | Browser-mic recording (WebM, up to 60 s), uploaded to Supabase Storage, inline playback in chat. |
| **Reactions** | Four quick emoji (🔥 😂 👏 💚) with live counts and per-user toggle. |
| **Presence** | Real-time online list per room via Supabase Realtime presence. |
| **Notifications** | Persistent in-app alerts for room invitations and game invites; delivered over a private Realtime channel. |
| **Moderation** | Owner/admin/member roles. Owners can assign admin rights and remove members; moderated users receive a notification. |
| **Multiplayer games** | **Tic-Tac-Toe** (turn-based), **Word Scramble** (race to unscramble), and **Trivia Sprint** (live leaderboard). |
| **Developer panel** | Privileged users can list all accounts, view an audit log, and delete users through a protected Edge Function. |
| **Data cleanup** | Users can bulk-delete their own messages, voice files, and images in bounded batches. |
| **Themes** | Dark (default) and light — switchable at runtime. |

---

## Tech stack

### Frontend

| | |
| --- | --- |
| **React 19 + TypeScript** | Core UI framework |
| **Vite 7** | Build tool and dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **Radix UI + shadcn-style primitives** | Accessible, unstyled UI components in `client/src/components/ui/` |
| **Framer Motion** | Animated sidebar and spring transitions |
| **Wouter** | Lightweight client-side routing |
| **Sonner** | Toast notifications |
| **React Hook Form + Zod** | Form validation |
| **Lucide React** | Icon set |

### Backend (Supabase)

| | |
| --- | --- |
| **Supabase Auth** | Session management; username stored in user metadata + `profiles` table |
| **Supabase Postgres + RLS** | All application data behind row-level security policies |
| **Supabase Realtime** | Private channel subscriptions for live messages, presence, notifications, and game state |
| **Supabase Storage** | Buckets: `voice-messages`, `chat-images` (private, room-scoped), `avatars` |
| **Edge Functions** | `chatplay-auth` (register / login) · `chatplay-admin` (developer user management + audit) |

### Infrastructure

| | |
| --- | --- |
| **Vercel** | Frontend hosting; SPA rewrites via `vercel.json` |
| **pnpm 10** | Package manager |
| **Vitest** | Unit test runner |
| **Prettier** | Code formatter |

---

## Project structure

```
chatplay/
├── client/                     # React SPA (Vite root)
│   └── src/
│       ├── pages/
│       │   └── ChatPlay.tsx    # Entire authenticated workspace
│       ├── components/
│       │   └── ui/             # 53 Radix/shadcn UI primitives
│       ├── _core/hooks/        # useSupabaseAuth — session management
│       └── lib/                # Supabase clients, RPCs, game utils, media utils
├── server/                     # Legacy Express/tRPC server (not required for Vercel)
├── shared/                     # Types and constants shared by client and server
├── supabase/
│   ├── migrations/             # 14 ordered SQL files (schema, RLS, Realtime, Storage)
│   └── functions/
│       ├── chatplay-auth/      # Register + login Edge Function
│       └── chatplay-admin/     # Developer user management + audit Edge Function
├── drizzle/                    # Legacy Drizzle schema (scaffold compatibility only)
├── docs/                       # Security and deployment notes
├── vercel.json                 # Vercel deployment config
└── package.json
```

---

## Prerequisites

- **Node.js** 20 or newer
- **pnpm** 10 or newer
- A **Supabase** project (free tier is sufficient)

---

## Getting started

### 1 — Clone and install

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL> chatplay
cd chatplay
pnpm install
```

### 2 — Configure environment variables

Create `.env.local` at the repository root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

> **Never put `SUPABASE_SERVICE_ROLE_KEY` or any server secret in a Vercel browser variable.** Edge Functions manage their own secrets inside the Supabase dashboard.

### 3 — Apply database migrations

Apply every SQL file in `supabase/migrations/` in lexical order (currently `0001` → `0012`) through the Supabase SQL Editor or the Supabase CLI:

```bash
# List files to verify order before applying
ls supabase/migrations/*.sql | sort
```

After applying migrations, disable public Realtime channel access in your Supabase project settings. See [`docs/realtime-security-validation.md`](docs/realtime-security-validation.md) for the exact steps.

### 4 — Deploy Edge Functions

Deploy both functions from `supabase/functions/` to your Supabase project:

```bash
supabase functions deploy chatplay-auth
supabase functions deploy chatplay-admin
```

### 5 — Run locally

```bash
# Fresh Supabase/Vercel path (recommended)
pnpm dev:frontend

# Legacy Express + Vite compatibility server
pnpm dev
```

Open the URL printed by Vite, register a username-password account, and verify rooms, chat, voice, images, games, and notifications.

---

## Environment variables

### Required for the browser (Vercel + local)

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (safe to expose to the browser) |

### Edge Function secrets (Supabase dashboard only)

| Variable | Description |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin operations in `chatplay-admin` |
| `SUPABASE_JWT_SECRET` | Auth bridge JWT validation |

### Legacy server (not needed for the Vercel fresh path)

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | MySQL connection string for the legacy Express/Drizzle server |
| `JWT_SECRET` | Legacy server JWT signing secret |
| `PORT` | Server port; defaults to the platform-provided value |
| `NODE_ENV` | `development` or `production` |

---

## Development commands

| Command | Description |
| --- | --- |
| `pnpm dev:frontend` | Start the Vite dev server (recommended for Supabase-only path) |
| `pnpm dev` | Start the legacy Express + Vite compatibility server |
| `pnpm check` | TypeScript type-check without emitting files |
| `pnpm test` | Run the Vitest suite |
| `pnpm build:frontend` | Build the SPA into `dist/public` for Vercel |
| `pnpm build` | Build the browser bundle and the bundled compatibility server |
| `pnpm start` | Start the production bundle from `dist/` |
| `pnpm format` | Format all tracked source files with Prettier |
| `pnpm db:push` | Generate and apply Drizzle migrations (legacy schema only) |

---

## Deploying to Vercel

The `vercel.json` at the repository root is already configured:

- **Build command:** `pnpm build:frontend`
- **Output directory:** `dist/public`
- **Install command:** `pnpm install --frozen-lockfile`
- **SPA rewrites:** all routes rewrite to `index.html`

Add two environment variables in Vercel (Preview and Production):

```
VITE_SUPABASE_URL       → <your Supabase project URL>
VITE_SUPABASE_PUBLISHABLE_KEY → <your Supabase anon key>
```

In **Supabase Dashboard → Authentication → URL Configuration**, add your Vercel production URL and `https://*.vercel.app` for preview deployments.

For the complete deployment checklist, see [`docs/vercel-supabase-runbook.md`](docs/vercel-supabase-runbook.md).

---

## Pre-release checklist

Before shipping any change, run:

```bash
pnpm check
pnpm test
pnpm build:frontend
pnpm build
```

For Supabase schema changes, apply the migration to a staging project and verify RLS behavior with at least two separate test accounts before promoting to production.

---

## Security notes

- The browser only ever receives `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. All server-side secrets live exclusively in the Supabase Edge Function environment.
- Authorization is enforced server-side by Postgres RLS policies and `SECURITY DEFINER` functions. UI-level hiding of features is not a security boundary.
- Private room and image access is enforced by Supabase RLS/Storage policies regardless of client state.
- Developer privileges are governed by the `profiles.is_developer` column validated inside the `chatplay-admin` Edge Function, not by any client-side secret.
- Never commit `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, or any database credential.

---

## References

- [Supabase Database Migrations](https://supabase.com/docs/guides/database/overview)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vercel + Vite Deployment](https://vercel.com/docs/frameworks/frontend/vite)
- [pnpm Documentation](https://pnpm.io/)

---

<div align="center">
MIT License · Built with React, Vite, and Supabase
</div>
