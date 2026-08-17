# ChatPlay

ChatPlay is a real-time group chat application with public and private rooms, voice notes, secure image attachments, presence, reactions, persistent invitation alerts, and multiplayer Tic-Tac-Toe, Word Scramble, and Trivia Sprint games. The frontend is React/Vite/Tailwind and is being prepared for Vercel; the fresh deployment boundary uses Supabase Auth, Postgres/RLS, Realtime, Storage, and lightweight Edge Functions.

> **Authentication model:** ChatPlay intentionally does not expose Google, Manus, or social login. Users register and sign in with a unique username and password.

## Repository structure

| Path | Purpose |
| --- | --- |
| `client/` | React application, page components, UI primitives, Supabase browser client, and global styles. |
| `server/` | Legacy full-stack compatibility server and tests; it is not required by the fresh Vercel/Supabase frontend path after the migration is complete. |
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
# Create .env from the Vercel/Supabase variable table below.
# The fresh frontend path needs only VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
# and optionally VITE_SUPABASE_OWNER_ID for developer-owner UI.
```

For the fresh Vercel frontend, create `.env.local` with the two public Supabase values. Never put a service-role key, database password, JWT secret, or legacy server credential in Vercel browser variables. The legacy full-stack server variables remain documented only for compatibility runs.

## Environment variables

The browser receives only public `VITE_*` values. Supabase Edge Functions receive their own managed server secrets; never copy those into Vercel client variables. Legacy server-only variables are not needed by the fresh frontend deployment.

| Variable | Required | Used by |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Browser and server Supabase clients. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser Supabase client; use the publishable/anon key only. |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function secret | Supabase-managed server-side authorization and administrative cleanup; never expose to Vercel client code. |
| `SUPABASE_JWT_SECRET` | Recommended | Local Supabase/Auth bridge validation where required by the project configuration. |
| `DATABASE_URL` | Legacy only | Required only for the compatibility Express/tRPC server, not the fresh Supabase-only frontend. |
| `JWT_SECRET` | Legacy only | Required only for the compatibility Express/tRPC server. |
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
| `VITE_SUPABASE_OWNER_ID` | No longer used | Developer access is controlled by the Supabase `profiles.is_developer` flag and the protected `chatplay-admin` Edge Function. |

## Supabase setup

Create a fresh Supabase project, copy its URL and publishable key into `.env.local`, and apply every SQL file in `supabase/migrations/` in lexical order, currently ending with `0012_fresh_developer_controls.sql`. The fresh migrations add username uniqueness, automatic profile creation from Supabase Auth metadata, secure room/invitation RPCs, ChatPlay RLS, Realtime authorization, avatar storage, and the private `chat-images` bucket. Existing legacy Drizzle usernames and passwords are intentionally not migrated.

The image migration creates a **private** Storage bucket. Image objects are room-scoped and can be read only by authenticated room members. Uploaded images are validated in the client and constrained at the database/storage-policy layer to PNG, JPEG, WebP, or GIF files up to 10 MiB. Voice files use the existing voice-storage flow.

After applying migrations, confirm that Supabase Realtime public channel access is disabled for the project. The rationale and manual verification sequence are documented in [`docs/realtime-security-validation.md`](docs/realtime-security-validation.md).

## Run locally

Start the compatibility development server with hot reload:

```bash
pnpm dev
```

For the fresh Vercel/Supabase frontend, run `pnpm dev:frontend` or `pnpm vite --host 0.0.0.0`. Open the printed URL, register a new Supabase username-password account, and verify rooms, chat, voice, images, invitations, presence, games, and developer controls. The browser runtime no longer requires the Express/tRPC server; `pnpm dev` remains available only as a compatibility/local server command.

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
| `pnpm dev` | Start the legacy Vite/Express compatibility server with watch mode. |
| `pnpm check` | Run TypeScript validation without emitting files. |
| `pnpm test` | Run the Vitest suite. |
| `pnpm build:frontend` | Build the Vercel frontend into `dist/public`. |
| `pnpm build` | Build the browser bundle and bundled compatibility server. |
| `pnpm start` | Start the production bundle from `dist/`. |
| `pnpm format` | Format tracked source files with Prettier. |
| `pnpm db:push` | Generate and apply the template Drizzle migrations; use only when working on Drizzle-managed schema. |

## Storage and assets

Runtime user media is uploaded to Supabase Storage through the application and is not stored in the Git repository. The repository should contain only small static configuration files and source code. Do not place user images, voice recordings, secrets, generated build artifacts, or local Supabase deployment payloads under `client/public/` or commit them to GitHub.

The temporary QA image used during development is not a product asset and is excluded from the repository. If a future product illustration, logo, or static image is needed, keep the original outside the source tree, upload it through the deployment/storage workflow, and reference the returned durable URL rather than committing large binaries.

## Testing checklist

Before pushing changes, run `pnpm check`, `pnpm test`, and `pnpm build`. For changes affecting Supabase, apply the corresponding migration to a disposable project or staging database, then verify RLS behavior with at least two local accounts. For media changes, verify upload, room-member-only access, persistence after reload, and cleanup on account or message deletion.

## Security notes

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, database credentials, or platform API keys in browser code, Vercel client variables, screenshots, issue reports, or Git history. The browser should use only the Supabase URL and publishable key. Developer authorization is enforced by Supabase profile data, RLS, and the Edge Function; it is never inferred from a client-side secret.
Private room and image access is enforced by Supabase RLS/Storage policies; UI hiding is not an authorization boundary.

## Vercel deployment

Set the Vercel project root to the repository root. Use the `vercel.json` configuration, which runs `pnpm install --frozen-lockfile`, executes `pnpm build:frontend`, publishes `dist/public`, and rewrites SPA routes to `index.html`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as Vercel environment variables for Preview and Production. Configure Supabase Auth redirect URLs for the Vercel production domain and local development URL. Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel client environment variables.

The migration is complete for independent frontend deployment: authentication, room/game RPCs, Realtime, Storage, cleanup, moderation, and developer deletion are handled by Supabase, with `chatplay-auth` and `chatplay-admin` deployed as Edge Functions. Legacy server files remain only as compatibility source and are not required by Vercel.

Supabase Auth URL Configuration must include the Vercel production URL, its preview URL pattern if previews are used, and the local development URL. Keep Edge Function secrets such as `SUPABASE_SERVICE_ROLE_KEY` inside Supabase only. The fresh account reset intentionally does not migrate legacy Drizzle users; create new username-password accounts in the Supabase project.

## References

- [Supabase database migrations](https://supabase.com/docs/guides/database/overview)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)
- [pnpm documentation](https://pnpm.io/)
