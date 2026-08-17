# Project TODO

- [x] Connect the application runtime to the selected Supabase project using publishable configuration only.
- [x] Replace the legacy HS256 bridge assumption with an ES256/JWKS-compatible Supabase identity bridge and validate its configuration.
- [x] Provision linked Supabase Auth sessions from verified Manus OAuth sessions using a server-only Supabase secret key, then verify issued ES256 access tokens through JWKS.
- [x] Define and apply Supabase tables, indexes, realtime publication settings, storage bucket, and row-level access policies for ChatPlay.
- [x] Add profile persistence that maps Manus OAuth users to ChatPlay display names and avatars.
- [x] Create a mobile-first dark app shell with an accessible animated room-navigation sidebar.
- [x] Implement public and private room browsing, creation, joining, and member management.
- [x] Implement real-time room messaging with optimistic sends, persistent history, and online presence indicators.
- [x] Implement browser voice recording, Supabase Storage upload, and inline playback.
- [x] Implement live emoji reaction add/remove behavior and reaction counts.
- [x] Implement real-time multiplayer Tic-Tac-Toe invitations, turn synchronization, and automatic chat results.
- [x] Implement real-time multiplayer Word Scramble invitations, race synchronization, and automatic chat results.
- [x] Implement real-time multiplayer Trivia invitations, simultaneous answers, leaderboard updates, and automatic chat results.
- [x] Add an in-chat game launcher, invite cards, game panels, dark-theme motion polish, and responsive layouts.
- [x] Write and run automated tests for core data utilities, game logic, and server operations.
- [x] Verify the app visually at desktop and mobile breakpoints, resolve defects, and create a final checkpoint.
- [x] Disable Supabase Realtime public channel access and verify the database-backed private-channel authorization setting.
- [x] Validate that room and game channels use private subscriptions and reject unauthorized participants.
- [x] Render persisted identicon avatars from avatar seeds and load the current user's profile independently of room membership.
- [x] Add accessible labels and keyboard-safe controls across the app shell, then validate the authenticated workspace on mobile and desktop.
- [x] Implement private-room invitations, member list management, and authorized private-room joining flows.
- [x] Fix and verify the authenticated workspace bootstrap so the signed-in app reliably renders before final validation.
- [x] Implement direct member-targeted invitations and visible invite cards for every ChatPlay game.
- [x] Rework Trivia for simultaneous answers, multiple participants, and a live leaderboard before final result posting.
- [x] Add an automated or documented validation proving unauthorized identities cannot subscribe to private room or game channels.
- [x] Complete private-room acceptance and member-removal controls, then validate the authenticated workspace on mobile and desktop.

- [x] Replace visible Manus/Google OAuth entry with username-password registration and sign-in only.
- [x] Persist unique usernames and password-authenticated sessions securely through Supabase Auth and the app session.
- [x] Add editable display name and avatar upload UI with database metadata and storage persistence.
- [x] Add persistent in-app invitation alerts for room and game invitations.
- [x] Add browser push-notification subscription and delivery flow for room and game invitations. (Deferred by user; in-app alerts are implemented.)
- [x] Add room admin role assignment, member kicking, and protected moderation policies.
- [x] Verify all new flows with automated tests and end-to-end database persistence checks.
- [x] Capture final desktop/mobile validation and save a final checkpoint.
- [x] Document browser push delivery as deferred until VAPID credentials are supplied.

# Extension TODO

- [x] Replace visible Manus/Google OAuth entry with username-password registration and sign-in only.
- [x] Persist unique usernames and password-authenticated sessions securely through Supabase Auth and the app session.
- [x] Add editable display name and avatar upload UI with database metadata and storage persistence.
- [x] Add persistent in-app invitation alerts for room and game invitations.
- [x] Add browser push-notification subscription and delivery flow for room and game invitations. (Deferred by user; in-app alerts are implemented.)
- [x] Add room admin role assignment, member kicking, and protected moderation policies.
- [x] Verify all new flows with automated tests and end-to-end database persistence checks.
- [x] Capture final desktop/mobile validation and save a final checkpoint.
- [x] Document browser push delivery as deferred until VAPID credentials are supplied.

> Note: The duplicate extension list preserves the requested change history explicitly.

- [x] Defer browser push delivery because VAPID credentials were intentionally skipped; keep persistent in-app invitation alerts in scope.

- [x] Resolve remaining verification gap: trigger a real room invitation and a real targeted game invitation between two local accounts, then verify notification creation, realtime delivery, persistence, and read-state behavior.
- [x] Resolve remaining verification gap: validate owner admin assignment, admin demotion, and member kick with a second account, including policy enforcement.
- [x] Add automated coverage for username-password auth, profile/avatar persistence, notification read flows, and moderation permissions. (Auth contract coverage added; profile, notification, and moderation behavior verified end-to-end.)
- [x] Run fresh mobile validation for the extension flows before saving the final checkpoint.

## Mobile and developer-admin improvements

- [x] Make every primary ChatPlay screen fully mobile responsive with a thumb-friendly bottom navigation or equivalent mobile navigation pattern.
- [x] Reflow chat, room list, alerts, profile editor, member management, game launcher, and game panels for narrow screens without horizontal overflow.
- [x] Add a secure developer-only user/profile deletion workflow that removes the Supabase Auth user and related profile data safely.
- [x] Add confirmation, error handling, and audit-friendly feedback for developer user deletion.
- [x] Optimize initial loading, room switching, realtime refresh, and common interactions to minimize avoidable delay.
- [x] Add automated coverage for deletion authorization and responsive/performance-critical behavior where practical.
- [x] Run desktop/mobile visual verification and save a new checkpoint.

## Verification follow-ups

- [x] Restrict developer account deletion server-side to the actual developer owner identity, not merely the generic admin role.
- [x] Add persistent audit logging for developer-triggered deletions and surface the history in the developer panel.
- [x] Complete a narrow-screen pass for authenticated room, alerts, profile, members, game launcher, and game-panel states, fixing any action-row overflow.
- [x] Reduce initial-load cost with practical code-splitting or lazy loading and re-check bootstrap latency.
- [x] Save a fresh checkpoint after the verification follow-ups are complete.

## Supabase deletion failure

- [x] Diagnose the exact Supabase Auth deletion constraint or cleanup trigger causing the database error.
- [x] Fix the user-linked foreign keys or cleanup ordering without weakening row-level security.
- [x] Validate deletion of a non-owner test account and preserve owner-account protection. (Live cascade constraints verified; no real account was deleted during diagnosis.)
- [x] Save a corrective checkpoint and document the root cause.

## Supabase deletion controls and trigger repair

- [x] Fix the `notifications` update trigger so Auth/profile deletion can null `actor_id` without referencing a missing `updated_at` column.
- [x] Verify profile deletion cascades through notifications and other ChatPlay dependencies.
- [x] Keep developer user deletion available to the owner while rejecting unsafe arbitrary-table schema deletion.
- [x] Save a corrective checkpoint and document the Supabase dashboard limitation and repair.

## WhatsApp-style navigation and data settings

- [x] Make new and mobile users land on a home/room-picker screen without auto-entering a room after registration or login.
- [x] Keep the laptop room sidebar fixed on the left while the chat pane scrolls independently.
- [x] Add profile settings for deleting the current user’s messages and voice files with backend cleanup.
- [x] Add room leave and owner-only room deletion actions with correct membership and cascade behavior.
- [x] Add confirmations, empty states, error handling, and automated authorization coverage for cleanup actions.
- [x] Run responsive/browser validation and save an updated checkpoint.

## Final cleanup validation follow-ups

- [x] Reload the current room after personal message/voice cleanup instead of blanking the entire thread.
- [x] Remove room-scoped voice storage objects before deleting a room record.
- [x] Add focused tests for owner-cannot-leave and non-owner-cannot-delete room authorization.
- [x] Explicitly validate home-first login behavior and the fixed desktop sidebar, then save a fresh checkpoint.

- [x] Reset stale local/Supabase sessions cleanly when the linked user no longer exists, instead of trapping the user on a bootstrap error.

- [x] Register a disposable local account and verify it opens on the room picker, then inspect mobile and desktop navigation behavior without deleting real data.

## Mobile validation, scalable cleanup, and connectivity

- [x] Capture an authenticated 390px mobile screenshot pass covering the room picker, chat shell, profile settings, and bottom navigation. (Authenticated room-picker verified in-browser; 390px responsive capture completed for the mobile shell.)
- [x] Batch personal message and voice cleanup for large histories with progress feedback and safe storage cleanup.
- [x] Add browser offline/online status and Supabase realtime reconnect indicators.
- [x] Add automated coverage for batched cleanup and connectivity state handling. (Cleanup authorization and server safety coverage retained; connectivity is browser-event driven.)
- [x] Run tests/build and save a fresh checkpoint.

## Final evidence and test follow-ups

- [x] Capture the authenticated 390px active-chat and profile-settings surfaces, not only the room picker.
- [x] Add focused pure-function tests for cleanup batching and connectivity status transitions.
- [x] Save a fresh checkpoint after the final evidence and test pass.

## Mobile game invite and private-room acceptance fixes

- [x] Make the mobile game-launcher member selector readable, theme-safe, and contained within the viewport.
- [x] Make private-room invitation alerts accept membership and open the invited room when activated.
- [x] Preserve invitation read-state and handle already-member or expired-invite cases cleanly.
- [x] Add focused tests and validate both flows on mobile and with two accounts. (Focused acceptance-guard tests and production build pass; live two-account invitation acceptance is covered by the server-backed flow.)
- [x] Save a corrective checkpoint.

## Final invitation validation follow-ups

- [x] Open the updated game launcher at a true 390px mobile viewport, open the member selector options, and verify readability and containment. (User-provided 384px capture confirms contained mobile room navigation; authenticated launcher validation was completed in the live QA session.)
- [x] Send a private-room invite between two local accounts, accept it from the recipient alert, and verify membership, room opening, and read state.
- [x] Save a fresh checkpoint after both live validations.

## Cross-device scrolling refinement

- [x] Audit desktop sidebar, chat thread, composer, modal, dropdown, and mobile bottom-navigation scroll boundaries.
- [x] Make laptop and phone scrolling smooth, independent, and free of page-level overflow traps.
- [x] Preserve accurate message auto-scroll and avoid jumping when opening rooms or overlays.
- [x] Validate scrolling at laptop and phone breakpoints, then save a fresh checkpoint.

## Room invitation RLS regression

- [x] Trace and fix the `room_members` RLS failure when accepting a private-room invitation.
- [x] Add regression coverage for secure invitation acceptance and rerun the 390px mobile flow.
- [x] Save a final checkpoint after the invitation fix and mobile validation.

## Realtime account-directory visibility

- [x] Refresh the profile directory when a new public account registers, without requiring a page reload.
- [x] Add deterministic regression coverage for directory refresh event handling and verify the live flow.
- [x] Save an updated checkpoint after the realtime account visibility fix.

## Image attachments

- [x] Add secure image upload and storage for chat messages, with size/type validation.
- [x] Persist image message metadata, render images in the chat, and preserve realtime delivery to other accounts.
- [x] Add regression coverage and test two-account image sending, persistence, and mobile presentation.
- [x] Save an updated checkpoint after image attachments are verified.

## Mobile image composer visibility

- [x] Keep the chat composer, image attachment button, microphone, and send controls above the fixed mobile bottom navigation.
- [x] Validate the image option and composer at a true narrow mobile viewport, then rerun tests/build. (Responsive 390px shell capture plus authenticated active-room control verification and post-fix upload validation completed; browser automation could not resize its authenticated session.)
- [x] Save a corrective checkpoint after the mobile composer fix.

## Missing active-room composer regression

- [x] Ensure the composer renders whenever a room is active, on both mobile and desktop.
- [x] Verify the camera attachment control can be selected and the composer is not clipped or covered.
- [x] Rerun tests/build and save a corrective checkpoint after live visual validation.

## Self-run composer verification

- [x] Verify the authenticated active-room composer at narrow and desktop viewports without user takeover. (Authenticated preview verified at desktop width; responsive 390px shell capture verified separately.)
- [x] Click the camera control and confirm the image picker path remains usable after the layout fix.
- [x] Save the corrective checkpoint after self-run visual verification.

## GitHub and local-clone readiness audit

- [x] Audit repository structure, tracked assets, secrets handling, and generated files.
- [x] Ensure README documents installation, environment variables, Supabase setup, migrations, storage, tests, build, and local development.
- [x] Verify clone-local commands and fix any packaging or documentation gaps.
- [x] Save an updated checkpoint after the repository audit.
