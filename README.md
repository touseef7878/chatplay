# ChatPlay

ChatPlay is a real-time group chat application with public and private rooms, voice notes, secure image attachments, presence, reactions, persistent invitation alerts, and multiplayer Tic-Tac-Toe, Word Scramble, and Trivia Sprint games. The application uses React, Vite, Tailwind CSS, tRPC, Express, Supabase Auth/Database/Realtime/Storage, and local username-password authentication.

> **Authentication model:** ChatPlay intentionally does not expose Google, Manus, or social login. Users register and sign in with a unique username and password.

## Repository structure

| Path | Purpose |
| --- | --- |
| `client/` | React application, page components, UI primitives, Supabase browser client, and global styles. |
| `server/` | Express/tRPC server, authentication bridge, Supabase authorization helpers, storage handling, and server tests. |
| `shared/` | Types and constants shared by the client and server. |
| `supabase/migrations/` | Ordered PostgreSQL, RLS, Realtime, Auth, and Storage migrations. Apply these files in filename order. |
| `drizzle/` | Template database schema and generated Drizzle metadata retained for compatibility with the server scaffold. ChatPlay feature data is defined in the Supabase migrations. |
| `docs/` | Security and operational validation notes. |
| `client/src/components/ui/` | Reusable Radix/shadcn-style UI primitives. |
| `client/src/pages/ChatPlay.tsx` | Main authenticated ChatPlay workspace. |

Generated build output, dependency folders, local environment files, editor state, logs, and investigation request payloads are excluded from source control.

## Prerequisites

Use Node.js 20 or newer, pnpm 10 or newer, and a Supabase project. A local Supabase CLI is optional; the migrations can also be applied through the Supabase SQL Editor. Git, a current browser, and a PostgreSQL-compatible Supabase database connection string are required for a complete local server run.

## Clone and install

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL> chatplay
cd chatplay
pnpm install
cp /path/to/your/local/ChatPlay.env .env
```

Create the local `ChatPlay.env` file from the variable table below, or add the values directly to `.env` using your secret manager. The repository intentionally does not commit an `.env.example` file because even placeholder environment files are easy to copy incorrectly into a deployment. Never commit `.env`, service-role keys, JWT secrets, or storage credentials.

## Environment variables

The browser receives only the two `VITE_SUPABASE_*` values. `SUPABASE_SECRET_KEY`, `JWT_SECRET`, database credentials, and server integration keys must remain server-side.

| Variable | Required | Used by |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Browser and server Supabase clients. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser Supabase client; use the publishable/anon key only. |
| `SUPABASE_SECRET_KEY` | Yes | Server-only administrative Supabase operations and cleanup. |
| `SUPABASE_JWT_SECRET` | Recommended | Local Supabase/Auth bridge validation where required by the project configuration. |
| `DATABASE_URL` | Yes | Server scaffold database connection and Drizzle tooling. |
| `JWT_SECRET` | Yes | Local HTTP session cookie signing. Generate a long random value. |
| `PORT` | No | Server port; defaults to the platform-provided port. |
| `NODE_ENV` | No | Set `development` for `pnpm dev` and `production` for `pnpm start`. |
| `VITE_APP_TITLE` | No | Browser title and platform metadata. |
| `VITE_APP_LOGO` | No | Optional application logo metadata. |
| `BUILT_IN_FORGE_API_URL` | Only if using platform integrations | Server-side platform integration endpoint. |
| `BUILT_IN_FORGE_API_KEY` | Only if using platform integrations | Server-side platform integration credential. |
| `VITE_FRONTEND_FORGE_API_URL` | Only if using platform integrations | Browser-side platform integration endpoint. |
| `VITE_FRONTEND_FORGE_API_KEY` | Only if using platform integrations | Browser-side platform integration credential. |
| `VITE_APP_ID` | Only if using platform OAuth/integrations | Application identifier used by the scaffold. |
| `OAUTH_SERVER_URL` | Only if using platform OAuth/integrations | OAuth server base URL retained by the scaffold. |
| `OWNER_OPEN_ID` | Only if using developer-owner features | Owner identity used by protected developer operations. |

## Supabase setup

Create a Supabase project, copy the project URL and publishable key into `.env`, and obtain the server-only secret key from the project settings. Apply every SQL file in `supabase/migrations/` in lexical order, beginning with `0001_chatplay.sql` and ending with `0009_chat_image_messages.sql`. The migration set creates the ChatPlay tables, indexes, private Realtime authorization helpers, RLS policies, notification flows, room/game permissions, avatar storage, and the private `chat-images` bucket.

The image migration creates a **private** Storage bucket. Image objects are room-scoped and can be read only by authenticated room members. Uploaded images are validated in the client and constrained at the database/storage-policy layer to PNG, JPEG, WebP, or GIF files up to 10 MiB. Voice files use the existing voice-storage flow.

After applying migrations, confirm that Supabase Realtime public channel access is disabled for the project. The rationale and manual verification sequence are documented in [`docs/realtime-security-validation.md`](docs/realtime-security-validation.md).

## Run locally

Start the development server with hot reload:

```bash
pnpm dev
```

Open the URL printed by the server, usually `http://localhost:3000`. Register a disposable username-password account, create or join a room, and verify chat, voice, image attachments, reactions, invitations, presence, and games.

For a production-like local run:

```bash
pnpm check
pnpm test
pnpm build
NODE_ENV=production pnpm start
```

The bundled server serves the built client. Do not hardcode a production port; the server reads the hosting environment's `PORT` value when provided.

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite/Express development server with watch mode. |
| `pnpm check` | Run TypeScript validation without emitting files. |
| `pnpm test` | Run the Vitest suite. |
| `pnpm build` | Build the browser bundle and bundled server. |
| `pnpm start` | Start the production bundle from `dist/`. |
| `pnpm format` | Format tracked source files with Prettier. |
| `pnpm db:push` | Generate and apply the template Drizzle migrations; use only when working on Drizzle-managed schema. |

## Storage and assets

Runtime user media is uploaded to Supabase Storage through the application and is not stored in the Git repository. The repository should contain only small static configuration files and source code. Do not place user images, voice recordings, secrets, or generated build artifacts under `client/public/` or commit them to GitHub.

The temporary QA image used during development is not a product asset and is excluded from the repository. If a future product illustration, logo, or static image is needed, keep the original outside the source tree, upload it through the deployment/storage workflow, and reference the returned durable URL rather than committing large binaries.

## Testing checklist

Before pushing changes, run `pnpm check`, `pnpm test`, and `pnpm build`. For changes affecting Supabase, apply the corresponding migration to a disposable project or staging database, then verify RLS behavior with at least two local accounts. For media changes, verify upload, room-member-only access, persistence after reload, and cleanup on account or message deletion.

## Security notes

Never expose `SUPABASE_SECRET_KEY`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, database credentials, or platform API keys in browser code, `.env.example`, screenshots, issue reports, or Git history. The browser should use only the Supabase URL and publishable key. Private room and image access is enforced server-side and by Supabase RLS/Storage policies; UI hiding is not an authorization boundary.

## References

- [Supabase database migrations](https://supabase.com/docs/guides/database/overview)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)
- [pnpm documentation](https://pnpm.io/)
