@AGENTS.md

# SPARK Quest

Gamified afterschool youth program app for SPARK (Ashland WI). Kids complete Quests to earn Points, spend on Drops (physical rewards) or contribute toward Adventures (group unlocks).

## Stack
- Next.js 16, App Router, TypeScript
- Tailwind CSS v4 — tokens in `app/globals.css` inside `@theme inline {}`, NO `tailwind.config.ts`
- Supabase (Postgres + Storage + Realtime) — project: sparkquest
- Replicate API — avatar generation (`fofr/face-to-sticker` model)
- Hosted on Vercel

## Auth
- Kids: localStorage only (`spark_kid_id`, `spark_kid_handle`, `spark_kid_avatar`) — no accounts
- Staff: bcrypt passcode stored in `staff_config` table, compared server-side only
- Admin session: HMAC-signed token stored in `sessionStorage`, verified in `lib/adminAuth.ts`

## Key Rules
- Never put `export const runtime = 'edge'` on any route that uses `bcryptjs`
- All point mutations go through Postgres RPCs (`award_quest_points`, `redeem_reward`) — never read-modify-write from client
- Staff passcode is 8 digits — `PinEntry` component `PIN_LENGTH = 8`
- Supabase Realtime must be enabled on `kids` table in Dashboard > Database > Replication
- Avatar generation: `export const maxDuration = 60` on the route (Vercel Pro required)

## Routes
### Kid-facing
- `/` — login/registration with returning-user detection and "Is this you?" claim flow
- `/onboarding/avatar` — camera selfie → Replicate → Supabase Storage
- `/home`, `/quests`, `/rewards`, `/leaderboard` — route group `(kid)`, auth guard in layout

### Admin (not linked in kid UI)
- `/admin` — staff passcode login
- `/admin/quests`, `/admin/rewards`, `/admin/settings` — CRUD + passcode change

### API
- `POST /api/kids` — register (returns existing kid data on 409 for claim flow)
- `POST /api/quests/verify-pin` — check passcode + already-completed in one step
- `POST /api/quests/complete` — award points via `award_quest_points` RPC
- `POST /api/rewards/redeem` — deduct points via `redeem_reward` RPC
- All `/api/admin/*` routes require `x-admin-token` header

## Database
Migrations in `supabase/migrations/` — run 001–007 in order, 008 is optional sample data.
Key tables: `kids`, `quests`, `quest_completions`, `drops`, `adventures`, `redemptions`, `staff_config`

## Supabase Gotcha
After creating or replacing Postgres functions, run `NOTIFY pgrst, 'reload schema';` in the SQL editor if RPCs return PGRST202 errors.
