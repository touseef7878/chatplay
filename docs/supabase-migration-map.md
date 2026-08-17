# ChatPlay Supabase Migration Map

ChatPlay’s browser runtime is now Supabase-only. The legacy Express/tRPC files remain in the repository solely as compatibility source for local tooling; Vercel does not execute them.

| Former responsibility | Supabase boundary | Frontend entry point | Security boundary |
| --- | --- | --- | --- |
| Session bootstrap, registration, and username/password login | Supabase Auth plus `chatplay-auth` Edge Function | `useSupabaseAuth`, `supabase-auth.ts` | Auth-issued ES256 tokens, JWKS verification, server-only service key inside Edge Function |
| Profile creation and profile edits | `profiles` table, trigger, RLS, Storage policies | `useSupabaseAuth`, `ChatPlay.tsx` | Authenticated owner checks and profile RLS |
| Room listing and room creation | Postgres tables/RLS and `create_room` RPC | `supabase-api.ts`, `ChatPlay.tsx` | Authenticated user and room membership policies |
| Public joining and private invitation acceptance | Protected Postgres RPCs | `supabase-api.ts` | RPC authorization checks plus `room_members` RLS |
| Room invitations and moderation | Postgres RPCs and membership RLS | `supabase-api.ts`, `ChatPlay.tsx` | Owner/admin checks, kick enforcement, private-room membership policies |
| Messages, reactions, presence, and game state | Supabase Postgres tables with private Realtime channels | `ChatPlay.tsx` | Table RLS and Realtime private-channel authorization |
| Voice notes and images | Supabase Storage with signed URLs and room-scoped policies | `media-utils.ts`, `ChatPlay.tsx` | Authenticated room-member storage policies; no public bucket access |
| Personal cleanup and room deletion | Postgres RPCs plus Storage object cleanup | `supabase-api.ts`, `ChatPlay.tsx` | Current-user, room-owner, and bounded-batch authorization |
| Developer user listing, deletion, and audit history | `chatplay-admin` Edge Function and developer-controls migration | `supabase-admin.ts`, developer panel | `profiles.is_developer`, JWT identity, service-role key held only by Supabase |
| AI component contract | Parent-provided callback; optional authenticated `chatplay-ai` Edge Function | `AIChatBox.tsx` | Never place an LLM/service credential in Vercel browser variables |

## Deployment status

The fresh-account migrations through `0012_fresh_developer_controls.sql` are applied to the linked Supabase project. The `chatplay-auth` and `chatplay-admin` Edge Functions are deployed with JWT verification enabled for the administrative function. Legacy Drizzle users are intentionally not migrated.

## Deliberate direct-client model

Chat messages, reactions, presence, and multiplayer state do not require a bespoke Edge Function for every write. They use the Supabase browser client directly because the database and Realtime policies are the authorization boundary. This is intentional: RLS checks the authenticated subject and room membership server-side, while Realtime private-channel authorization prevents unauthorized subscriptions. The frontend never treats UI visibility as authorization.
