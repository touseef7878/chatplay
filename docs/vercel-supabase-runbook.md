# Vercel and Supabase Deployment Runbook

This runbook deploys the ChatPlay browser bundle to Vercel Hobby while keeping authentication, Postgres, Realtime, Storage, and protected administrative work in Supabase Free-tier-compatible services.

## 1. Vercel project configuration

Create a Vercel project from the repository root. The checked-in `vercel.json` builds with `pnpm install --frozen-lockfile` and `pnpm build:frontend`, publishes `dist/public`, and rewrites application routes to `index.html` for the Vite SPA.

Set these browser variables in Vercel for **Preview** and **Production**:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | The Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The Supabase publishable/anon key |

Do not add `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`, or any platform API key to Vercel browser variables. Supabase Edge Functions own their server-side secrets.

## 2. Supabase Auth redirects and CORS

In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to the production Vercel URL. Add the local URL used during development and the Vercel preview pattern when preview deployments are required, for example `https://*.vercel.app`. Keep the exact production domain in the allow list rather than relying on a client-side redirect check.

The browser uses the Supabase client origin directly, so no Express proxy or `/api/trpc` rewrite is required. If additional origins are introduced, add them deliberately to the Supabase project’s allowed origins and verify that private Realtime channels remain enabled.

## 3. Apply the fresh schema

Use a linked Supabase project and apply every migration in `supabase/migrations/` in lexical order. The current final migration is `0012_fresh_developer_controls.sql`.

```bash
# review locally before applying
ls supabase/migrations/*.sql | sort

# apply through the Supabase migration workflow used by the project
# then verify tables, policies, storage buckets, and Realtime publication settings
```

The fresh reset creates username/password accounts and automatic profiles. It intentionally does not migrate legacy Drizzle users. Do not reset or delete existing data unless that operation has been explicitly reviewed.

## 4. Deploy Edge Functions

Deploy `chatplay-auth` and `chatplay-admin` from `supabase/functions/`. The admin function must keep JWT verification enabled. The service-role credential is injected into the Supabase function environment only.

```bash
# The exact deployment command depends on the connected Supabase workflow.
# Deploy both functions, then verify their deployed status in Supabase Dashboard.
```

`chatplay-admin` is restricted twice: the caller must have a valid Supabase JWT and the target profile must identify the caller as a developer. User deletion writes a durable audit record and removes the Auth user through the server-only service key.

## 5. Local frontend development

Use the frontend-only Vite command when validating the Vercel path:

```bash
pnpm install --frozen-lockfile
pnpm dev:frontend
```

If the convenience script is unavailable, run `pnpm vite --host 0.0.0.0`. The compatibility `pnpm dev` command may still start the old bundled server, but the ChatPlay browser runtime does not depend on it.

## 6. Validation gate

Before creating a release checkpoint, run the following commands:

```bash
pnpm check
CI=1 pnpm vitest run
pnpm build:frontend
pnpm build
```

Then validate a new username/password account from a clean browser session. Confirm that registration opens the room picker, public rooms and private invitations work, messages/reactions/presence/game state update in Realtime, voice and image attachments persist through reload, cleanup remains authorized, and a developer account can list/delete users through the developer panel. Confirm a non-developer receives a forbidden response from `chatplay-admin`.

## 7. Security-advisor follow-up

The linked project’s security advisor reports warnings for authenticated execution of several intentional `SECURITY DEFINER` RPCs, including room/profile boundaries and the developer predicate. These functions are part of the browser RPC contract and contain explicit authorization checks; review them in Supabase Dashboard before changing grants, because revoking execution would break room flows. The advisor also reports that leaked-password protection is disabled. Enable that Auth setting in the dashboard when the product password policy is approved.

## 8. Free-tier operating boundaries

The design avoids reserved servers, paid queues, paid background workers, and server-side polling. Supabase Realtime and Storage usage remain subject to the project’s current Free plan quotas; large media and high-frequency chat activity can exhaust those quotas, so the application uses bounded cleanup batches, private storage, and no server-side media proxy. Upgrade only if actual usage requires it.

## References

- [Supabase Auth URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite)
