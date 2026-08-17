# Free-tier deployment notes

## Verified constraints

Supabase Free currently includes two free projects, 50,000 monthly active users, 500 MB database size per project, 1 GB file storage, 5 GB egress, 2 million Realtime messages, 200 peak Realtime connections, and 500,000 Edge Function invocations. Free projects can pause after one week of inactivity. These limits are plan-level quotas and may change; consult the official pricing and billing pages before launch.

Vercel Hobby is free for personal projects and currently includes up to 1,000,000 edge requests per month, subject to Hobby fair-use and personal-use restrictions. The frontend should remain a static Vite build, avoid Vercel Functions unless strictly necessary, and use Supabase directly for data, Auth, Realtime, Storage, and Edge Functions.

## Architecture implication

The current ChatPlay Node/tRPC server is not Supabase-only. A complete option-B migration must replace its auth/session cookie bridge, protected tRPC procedures, storage proxy behavior, and developer operations with Supabase Auth sessions, RLS-protected tables/RPCs, private Storage policies, and narrowly scoped Supabase Edge Functions for privileged operations. The Vercel frontend should never receive service-role or secret keys.

## Official references

- [Supabase pricing](https://supabase.com/pricing)
- [Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase Edge Functions pricing](https://supabase.com/docs/guides/functions/pricing)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
