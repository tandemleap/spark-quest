@AGENTS.md

# SPARK Quest

Gamified afterschool youth program app for SPARK (Ashland WI). Kids complete Quests to earn Points, spend on Drops (physical rewards) or contribute toward Adventures (group unlocks).

Live at: https://spark-quest-theta.vercel.app/

## Stack
- Next.js 15, App Router, TypeScript
- Tailwind CSS v4 — tokens in `app/globals.css` inside `@theme inline {}`, NO `tailwind.config.ts`
- Supabase (Postgres + Storage + Realtime) — project: sparkquest
- Replicate API — avatar generation (`fofr/face-to-sticker` model, version `764d4827...`)
- Hosted on Vercel

## Auth
- Kids: localStorage only (`spark_kid_id`, `spark_kid_handle`, `spark_kid_avatar`) — no accounts
- Staff: bcrypt passcode stored in `staff_config` table, compared server-side only
- Admin session: HMAC-signed token stored in `sessionStorage`, verified in `lib/adminAuth.ts`

## Key Rules
- Never put `export const runtime = 'edge'` on any route that uses `bcryptjs`
- All point mutations go through Postgres RPCs (`award_quest_points`, `redeem_reward`) — never read-modify-write from client
- Staff passcode verified via `PinEntry` component — custom keypad, `PIN_LENGTH = 8`
- Supabase Realtime must be enabled on `kids` table in Dashboard > Database > Replication
- Avatar generation: `export const maxDuration = 60` on the route (Vercel Pro required)
- CSS variable colors with opacity (`bg-[--color-accent]/20`) don't work reliably in Tailwind v4 — use `border-2` + explicit checkmark indicators for selected states instead

## Quest Categories
Valid values: `physical`, `mental`, `emotional`, `social`, `creative`, `challenge`
Colors and labels defined in `lib/types.ts` (`CATEGORY_COLORS`, `CATEGORY_TEXT_COLORS`, `CATEGORY_LABELS`).
Card/QuestCard components fall back to `var(--color-surface)` for unrecognized categories.
If quests exist with old category names, fix with:
```sql
update quests set category = 'creative'  where category = 'creativity';
update quests set category = 'physical'  where category = 'movement';
update quests set category = 'mental'    where category = 'learning';
update quests set category = 'social'    where category = 'community';
```

## Avatar Generation
- Model: `fofr/face-to-sticker` — always produces sticker/cartoon art regardless of style prompts
- Inputs: `gender` (neutral/boy/girl) + `vibe` (bold/cool/cute/fierce) — these affect the prompt
- `prompt_strength: 8` — critical, default is 7; lower values cause gender/vibe to be ignored
- First generation saves to `{kid_id}.webp`, retry saves to `{kid_id}_v2.webp` (preserves v1 for compare)
- After retry, user sees side-by-side compare screen and picks Avatar 1 or Avatar 2
- Picking v2 triggers `PATCH /api/kids/[id]` to update `avatar_url`; v1 needs no DB change
- `force: true` bypasses the "already has avatar" early return (used when replacing existing avatar)
- Retry is tracked per React session only (not localStorage) — one retry per page visit

## Routes
### Kid-facing
- `/` — login/registration with returning-user detection and "Is this you?" claim flow
- `/onboarding/avatar` — camera selfie → gender/vibe picker → Replicate → compare screen → Supabase Storage
- `/home`, `/quests`, `/rewards`, `/leaderboard` — route group `(kid)`, auth guard in layout
- Avatar thumbnail on `/home` is clickable — links to `/onboarding/avatar` to add/change

### Admin (not linked in kid UI — navigate to `/admin` directly)
- `/admin` — staff passcode login (default passcode set in `007_seed_staff_config.sql`)
- `/admin/dashboard` — at-a-glance stats (kids, completions, points, redemptions)
- `/admin/kids` — view all kids, search, manually adjust points
- `/admin/quests` — CRUD quests; category filter + staff filter; "Posted by" field
- `/admin/rewards` — CRUD drops and adventures; adventure tab shows contribution progress, contributor list, manual unlock button
- `/admin/completions` — log of all quest completions with staff initials
- `/admin/redemptions` — log of all reward redemptions
- `/admin/settings` — change staff passcode

### API
- `POST /api/kids` — register (returns existing kid data on 409 for claim flow)
- `PATCH /api/kids/[id]` — update `avatar_url` or `available_points`
- `POST /api/quests/verify-pin` — check passcode + already-completed in one step
- `POST /api/quests/complete` — award points via `award_quest_points` RPC
- `POST /api/rewards/redeem` — deduct points via `redeem_reward` RPC
- `POST /api/avatar/generate` — generate sticker avatar via Replicate; accepts `gender`, `vibe`, `force`, `isRetry`
- All `/api/admin/*` routes require `x-admin-token` header

## Database
Migrations in `supabase/migrations/` — run 001–007 in order, then 009. (008 is optional sample data.)
Key tables: `kids`, `quests`, `quest_completions`, `drops`, `adventures`, `redemptions`, `staff_config`
`quests` has a `created_by` column (staff name) added in migration 009.

## Home Page Order
1. Header (avatar, name, points)
2. Welcome message
3. Active Quests (3 featured)
4. Group Adventure card (if one is active and unlocked)
5. Quick links (Rewards, Leaderboard)

## Supabase Gotchas
- After creating or replacing Postgres functions, run `NOTIFY pgrst, 'reload schema';` in the SQL editor if RPCs return PGRST202 errors.
- Realtime must be enabled per-table in Dashboard > Database > Replication (not via SQL).
- Storage bucket `avatars` must be created manually and set to Public.
