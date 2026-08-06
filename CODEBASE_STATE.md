# SPARK Quest — Codebase State Document

Generated: 2026-06-06. Updated: 2026-08-05. Reflects actual code, not the original spec.

---

## Tech Stack & Dependencies

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.10 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Database/Backend | Supabase (Postgres + Storage + Realtime) | @supabase/supabase-js 2.105.3 |
| Auth hashing | bcryptjs | 3.0.3 |
| AI avatar | Replicate SDK | ^1.4.0 |
| Confetti | canvas-confetti | 1.9.4 |
| Fonts | @fontsource/space-grotesk | 5.2.10 |
| Hosting | Vercel (Pro plan required) | — |

### Key conventions
- **Tailwind v4**: No `tailwind.config.ts`. All design tokens defined in `app/globals.css` inside `@theme inline {}`. CSS variable colors (e.g. `--color-accent`) are referenced directly with Tailwind's arbitrary-value syntax (`bg-[--color-accent]`).
- **Fonts**: Space Grotesk (body) via `@fontsource`. Barlow Condensed (headings/display) via `next/font/google`, exposed as `--font-barlow` CSS variable and `.font-barlow` utility.
- **No edge runtime on any route that imports `bcryptjs`** — bcrypt requires Node.js runtime. This is a hard constraint.
- **AGENTS.md**: Present in repo root. Notes that Next.js 16 has breaking changes from training data — read `node_modules/next/dist/docs/` before writing Next.js code.

---

## Database Schema

Supabase project name: `sparkquest`. Migrations in `supabase/migrations/`. Run in order: 001–007, 009, 010, 013, 014, 015, 016, 017, 018 (both files, see note below). (008 is optional sample data; 011, 012 are data-only seeds.)

**⚠️ Migration numbering collision**: two files both claim `018` — `018_quest_featured.sql` (adds `quests.is_featured`, part of the 2026-06-07 scroll redesign) and `018_lock_down_rls.sql` (2026-07-08 security fix). They touch disjoint tables/columns so order between them doesn't matter, but both must be run; the shared prefix is a footgun for anyone assuming one `018` supersedes the other. Consider renumbering `018_lock_down_rls.sql` → `019` to resolve.

**`018_lock_down_rls.sql` applied to production on 2026-08-06** via the Supabase SQL Editor. The RLS gap it fixes (see Authentication section) is closed.

### `kids`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `name_handle` | text UNIQUE NOT NULL | Display name / handle |
| `total_points_earned` | integer DEFAULT 0 | Lifetime XP, never decremented |
| `available_points` | integer DEFAULT 0 | Spendable balance |
| `avatar_url` | text | Supabase Storage public URL |
| `created_at` | timestamptz DEFAULT now() | — |
| `body_points` | integer DEFAULT 0 | Domain bucket (migration 010) |
| `brain_points` | integer DEFAULT 0 | Domain bucket (migration 010) |
| `heart_points` | integer DEFAULT 0 | Domain bucket (migration 010) |
| `hands_points` | integer DEFAULT 0 | Domain bucket (migration 010) |
| `team_points` | integer DEFAULT 0 | Domain bucket (migration 010) |
| `short_term_goal_id` | uuid | Points at a drop or adventure (migration 013) |
| `short_term_goal_type` | text | `'drop'` or `'adventure'` (migration 013) |
| `long_term_goal_id` | uuid | Same pattern (migration 013) |
| `long_term_goal_type` | text | `'drop'` or `'adventure'` (migration 013) |
| `avatar_generation_count` | integer DEFAULT 0 | Lifetime AI gen count; max 10 (migration 014) |
| `show_avatar_in_scroll` | boolean DEFAULT true | Scroll visibility toggle (migration 014) |

No FK constraint on goal columns — same `(id, type)` pattern as redemptions, allowing reference to either table.

---

### `quests`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `title` | text NOT NULL | — |
| `description` | text | — |
| `category` | text NOT NULL | Legacy from 001; superseded by `domain_tags`. Still in DB, not used in UI. |
| `point_value` | integer DEFAULT 10 | Points awarded for completion |
| `repeatable` | boolean DEFAULT false | If false, one completion per kid |
| `expires_at` | timestamptz | Optional expiry |
| `is_active` | boolean DEFAULT true | Controls visibility |
| `created_at` | timestamptz DEFAULT now() | — |
| `created_by` | text | Staff name (migration 009) |
| `domain_tags` | text[] DEFAULT '{}' | Array of domain keys (migration 010) |
| `is_grit_quest` | boolean DEFAULT false | Shows 🔥 badge (migration 010) |
| `grit_powerup_description` | text | Optional; shown after initials step (migration 010) |
| `grit_powerup_points` | integer | Bonus points if powerup claimed (migration 010) |
| `image_url` | text | Supabase Storage URL for card/scroll image (migration 016) |
| `quest_type` | text DEFAULT 'standard' | `'standard'` or `'record_chase'` (migration 017) |
| `score_unit` | text | e.g. `'reps'`, `'seconds'` (migration 017) |
| `score_direction` | text DEFAULT 'higher' | `'higher'` or `'lower'` (migration 017) |
| `record_set_points` | integer DEFAULT 0 | Points awarded on first (record-setting) attempt (migration 017) |
| `is_featured` | boolean NOT NULL DEFAULT false | Highlights quest on `/scroll`; max 4 concurrently (migration 018) |

---

### `quest_completions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `kid_id` | uuid FK → kids(id) CASCADE | — |
| `quest_id` | uuid FK → quests(id) CASCADE | — |
| `completed_at` | timestamptz DEFAULT now() | — |
| `verified_by_initials` | text | Staff initials (1–3 chars) |
| `points_awarded` | integer NOT NULL | Actual points after cap |
| `powerup_claimed` | boolean DEFAULT false | Whether grit powerup was taken (migration 010) |
| `score_value` | numeric | For record chase quests (migration 017) |

---

### `drops`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `title` | text NOT NULL | — |
| `description` | text | — |
| `point_cost` | integer NOT NULL | — |
| `quantity_available` | integer | null = unlimited |
| `is_active` | boolean DEFAULT true | — |
| `created_at` | timestamptz DEFAULT now() | — |
| `domain_requirements` | jsonb DEFAULT '{}' | e.g. `{"body": 20, "team": 10}` (migration 010) |
| `is_featured` | boolean DEFAULT false | Only one reward across drops+adventures can be featured at a time (migration 010) |
| `image_url` | text | Card/scroll image (migration 016) |

---

### `adventures`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `title` | text NOT NULL | — |
| `description` | text | — |
| `point_cost_per_kid` | integer NOT NULL | Per-kid contribution amount |
| `kids_threshold` | integer NOT NULL | Number of kids needed to unlock |
| `stays_open_after_unlock` | boolean DEFAULT false | Allow more contributions post-unlock |
| `is_active` | boolean DEFAULT true | — |
| `is_unlocked` | boolean DEFAULT false | Set by `redeem_reward` RPC |
| `unlocked_at` | timestamptz | — |
| `created_at` | timestamptz DEFAULT now() | — |
| `domain_requirements` | jsonb DEFAULT '{}' | Same pattern as drops (migration 010) |
| `is_featured` | boolean DEFAULT false | Global across both tables (migration 010) |
| `image_url` | text | Card/scroll image (migration 016) |

---

### `redemptions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `kid_id` | uuid FK → kids(id) CASCADE | — |
| `reward_type` | text NOT NULL | `'drop'` or `'adventure'` |
| `reward_id` | uuid NOT NULL | No FK — cross-table reference |
| `points_spent` | integer NOT NULL | — |
| `redeemed_at` | timestamptz DEFAULT now() | — |

---

### `staff_config`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK DEFAULT 1 | Singleton row |
| `passcode_hash` | text NOT NULL | bcrypt hash of 8-digit PIN |
| `updated_at` | timestamptz DEFAULT now() | — |

---

## Supabase RPC Functions

### `award_quest_points` (current version: migration 017)

```sql
award_quest_points(
  p_kid_id          uuid,
  p_quest_id        uuid,
  p_points          integer,
  p_initials        text,
  p_powerup_claimed boolean DEFAULT false,
  p_score_value     numeric DEFAULT NULL
) RETURNS integer
```

Behavior:
1. Fetches `domain_tags` and `grit_powerup_points` from the quest.
2. Computes total = `p_points` + powerup bonus if `p_powerup_claimed`.
3. **Special case**: if `v_total = 0` (record-setting first attempt), inserts completion with score and returns 0 — skips daily cap logic.
4. Sums today's `points_awarded` for this kid where `completed_at AT TIME ZONE 'America/Chicago'` matches today's CT date.
5. Raises `daily_limit_reached` exception if `remaining <= 0`.
6. Caps actual award at `LEAST(v_total, v_remaining)`.
7. Inserts into `quest_completions` with `score_value`.
8. Atomically updates `kids`: increments `total_points_earned`, `available_points`, and whichever domain buckets match `domain_tags`.
9. Returns actual points awarded (may be less than requested due to cap).

Daily cap: **40 points per kid per CT calendar day**.

---

### `redeem_reward` (migration 006, unchanged)

```sql
redeem_reward(
  p_kid_id     uuid,
  p_reward_type text,
  p_reward_id  uuid,
  p_points     integer
) RETURNS void
```

Behavior:
1. Deducts `available_points` atomically. Raises `insufficient_points` if balance < cost.
2. If `reward_type = 'drop'`: decrements `quantity_available` (no-op if null).
3. Inserts into `redemptions`.
4. If `reward_type = 'adventure'`: checks redemption count vs `kids_threshold` and sets `is_unlocked = true` if threshold is now met.

Note: domain eligibility is checked **server-side in the API route** before calling this RPC — the RPC itself does not enforce domain requirements.

---

## Storage Buckets

| Bucket | Access | Path pattern | Purpose |
|---|---|---|---|
| `avatars` | Public | `{kid_id}_v{count}.webp` | AI-generated avatars |
| `avatars` | Public | `{kid_id}_photo.webp` | Device photo uploads (no count increment) |
| `card-images` | Public | `{quest\|drop\|adventure}/{entity_id}.webp` | Card images for scroll display |

Both buckets must be created manually in Supabase Dashboard → Storage.

---

## Authentication & Session Model

### Kid auth (no accounts)
- Login stores `spark_kid_id`, `spark_kid_handle`, `spark_kid_avatar` in `localStorage`.
- Registration: `POST /api/kids` with `name_handle`. Returns 409 if name taken, at which point the "Is this you?" claim flow lets the kid adopt that account.
- Guard in `(kid)/layout.tsx`: checks `localStorage.getItem('spark_kid_id')` on mount; redirects to `/` if missing.
- No server-side session for kids. Any kid can call any kid-facing API with any `kid_id` — there is no server-side ownership check on kid endpoints.

### Staff PIN auth
- An 8-digit PIN is stored as a bcrypt hash in `staff_config` (singleton row, id=1).
- Staff enter PIN via `PinEntry` component (custom keypad, `PIN_LENGTH = 8`).
- Every quest completion and reward redemption requires the PIN to be submitted to the server and bcrypt-compared there. The PIN is never stored client-side.
- **Never on edge runtime** — bcrypt requires Node.js.

### Admin session
- Flow: `POST /api/admin/auth` validates PIN → returns HMAC-signed token.
- Token format: `base64(JSON payload) + '.' + base64(HMAC-SHA256 signature)`.
- Payload: `{ exp: Date.now() + 8*60*60*1000 }` (8-hour expiry).
- Token stored in `sessionStorage` as `spark_admin_token`.
- All `/api/admin/*` routes require `x-admin-token` header, verified via `lib/adminAuth.ts → verifyAdminToken()`.
- `ADMIN_SESSION_SECRET` env var is the HMAC key.

---

## All Routes & Pages

### Kid-facing pages

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Login/registration. Three states: `returning` (localStorage found), `new` (registration form), `claim` ("Is this you?" after 409). |
| `/onboarding/avatar` | `app/onboarding/avatar/page.tsx` | Avatar setup: camera capture or device photo → gender/vibe picker → AI generation or direct upload → side-by-side compare screen. Shows `show_avatar_in_scroll` toggle and remaining AI attempts. |
| `/home` | `app/(kid)/home/page.tsx` | Dashboard: avatar + points header, top 3 active quests, featured reward card, quick links to Rewards and Progress. |
| `/quests` | `app/(kid)/quests/page.tsx` | Quest browser with keyword search (title + description, client-side substring match, added 2026-08-05), domain filter tabs, and staff filter. Shows daily cap warning at 30+ pts. Quest detail in a bottom sheet; tapping "I Did This!" opens `QuestVerifyOverlay`. |
| `/rewards` | `app/(kid)/rewards/page.tsx` | Drops and adventures tabs. Domain requirement bars on each card. Redeem flow via `RedeemDialog` (requires staff PIN). |
| `/progress-station` | `app/(kid)/progress-station/page.tsx` | Personal progress: domain dot visualization, short/long-term goal cards with `DomainProgressBar`, domain breakdown bars, last 5 completions. Goal picker sheet for setting/changing goals. |
| `/leaderboard` | `app/(kid)/leaderboard/page.tsx` | Redirects to `/progress-station`. |
| `/scroll` | `app/scroll/page.tsx` | TV ambient display — no auth, no nav. See TV Scroll section below. |

**Kid layout** (`app/(kid)/layout.tsx`): auth guard + `BottomNav` + `PointsToastContainer` + goal prompt bottom sheet (shown once per session via `sessionStorage.goals_prompt_dismissed` if either goal slot is empty).

---

### Admin pages (navigate directly; not linked from kid UI)

| Route | File | Purpose |
|---|---|---|
| `/admin` | `app/admin/page.tsx` | Staff PIN login → issues HMAC token to `sessionStorage`. |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | At-a-glance stats: total kids, completions, redemptions, total XP awarded, XP available, points this week, completions this week. |
| `/admin/kids` | `app/admin/kids/page.tsx` | All kids sorted by total XP. Search, manually adjust `available_points` / `total_points_earned` / `name_handle`, delete kid. |
| `/admin/quests` | `app/admin/quests/page.tsx` | Quest CRUD. Domain + staff filters. Full form including grit fields and record chase fields. Image upload (edit mode only — ID required). `🖼` indicator in list when `image_url` set. |
| `/admin/rewards` | `app/admin/rewards/page.tsx` | Drop and adventure CRUD tabs. Adventure tab shows per-adventure contribution progress and contributor list. "⭐ Feature" button (clears all other featured flags globally). Image upload. Manual unlock button for adventures. |
| `/admin/completions` | `app/admin/completions/page.tsx` | Completion log: kid name, quest title, points, staff initials, timestamp. |
| `/admin/redemptions` | `app/admin/redemptions/page.tsx` | Redemption log: kid name, reward, points spent, timestamp. |
| `/admin/settings` | `app/admin/settings/page.tsx` | Change staff passcode (requires current passcode, bcrypt-hashes new one). |

**Admin layout** (`app/admin/layout.tsx`): token check on mount → redirect to `/admin` if missing/expired. Renders `AdminNav`.

---

## API Routes

### Kid-facing (no auth required)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/kids` | Register new kid. Returns 409 with existing kid data if handle taken (triggers claim flow). |
| GET | `/api/kids/[id]` | Fetch kid row + computed `daily_points_today` (Central Time). |
| PATCH | `/api/kids/[id]` | Update allowed fields only: `avatar_url`, `short_term_goal_id`, `short_term_goal_type`, `long_term_goal_id`, `long_term_goal_type`, `show_avatar_in_scroll`. `available_points` removed from the allowlist in the 2026-07-08 security fix — this route has no ownership check, so exposing it let anyone grant themselves unlimited points via a direct request with any kid UUID. |
| GET | `/api/kids/[id]/completions` | Last 5 completions with quest title, domain_tags, point_value. |
| GET | `/api/quests` | All active quests, ordered by `created_at DESC`. |
| GET | `/api/quests/record` | Personal best for a record chase quest. Params: `kid_id`, `quest_id`. Returns `{ best_score, attempts }`. |
| POST | `/api/quests/verify-pin` | Validates PIN + optionally checks if non-repeatable quest already completed. Returns 401 (bad PIN), 409 (already done), or 200. |
| POST | `/api/quests/complete` | Awards points. Accepts `kid_id`, `quest_id`, `passcode`, `staff_initials`, `powerup_claimed`, `score_value`. Re-validates PIN server-side. Calls `award_quest_points` RPC. Returns `{ points_awarded, daily_remaining, daily_total }`. Handles `daily_limit_reached` (403) and `Quest already completed` (409). |
| GET | `/api/drops` | All active drops. |
| GET | `/api/adventures` | All active adventures with `points_contributed` and `contributors_count` computed. |
| GET | `/api/featured-reward` | Featured drop or adventure. Fallback: highest-tier active adventure if none featured. |
| POST | `/api/rewards/redeem` | Redeems a reward. Re-validates PIN. Checks domain eligibility server-side (returns 403 with `unmet` and `suggestedQuests` if failed). Calls `redeem_reward` RPC. Auto-clears matching goal slot on success. |
| POST | `/api/avatar/generate` | AI avatar via Replicate. Accepts `kid_id`, `image` (base64 JPEG), `gender`, `vibe`. Checks 10-gen limit (403 if reached). Returns `{ avatar_url, generation_count, previous_avatar_url }`. `maxDuration = 60` (requires Vercel Pro). |
| POST | `/api/avatar/upload` | Direct device photo upload (no AI). Saves to `{kid_id}_photo.webp`, does not increment `avatar_generation_count`. |
| GET | `/api/scroll` | All data for TV display: enriched kids (A–Z), last 20 completions, featured adventure progress, active rewards, top 8 active quests by point_value. |
| GET | `/api/leaderboard` | Exists (file present) but `/leaderboard` page redirects to `/progress-station`. |

### Admin (require `x-admin-token` header)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/admin/auth` | Validates PIN, issues HMAC-signed session token. |
| GET | `/api/admin/dashboard` | Aggregate stats. |
| GET | `/api/admin/kids` | All kids sorted by total XP desc. |
| PATCH | `/api/admin/kids` | Update `available_points`, `total_points_earned`, or `name_handle`. |
| DELETE | `/api/admin/kids` | Delete a kid (cascades completions and redemptions). |
| GET | `/api/admin/quests` | All quests, newest first. |
| POST | `/api/admin/quests` | Create quest. |
| PATCH | `/api/admin/quests` | Update quest. Clears powerup fields when `is_grit_quest` set to false. |
| GET | `/api/admin/rewards?type=drop\|adventure` | All rewards of given type. Adventures include `points_contributed` and `contributors` array. |
| POST | `/api/admin/rewards?type=drop\|adventure` | Create reward. |
| PATCH | `/api/admin/rewards?type=drop\|adventure` | Update reward. When `is_featured=true`, clears `is_featured` on all other drops AND adventures globally. |
| GET | `/api/admin/completions` | All completions with kid + quest names. |
| GET | `/api/admin/redemptions` | All redemptions. |
| GET | `/api/admin/passcode` | (if present) — passcode management. |
| POST | `/api/admin/upload-card-image` | Upload image for quest/drop/adventure. Body: `{ base64, entity_type, entity_id }`. Stores to `card-images/{type}/{id}.webp`, updates `image_url` in DB. **⚠️ Bug: auth check calls `verifyAdminToken()` without `await` — the Promise is always truthy, so this route is effectively unprotected.** |

---

## Component Structure

```
components/
├── layout/
│   ├── AdminNav.tsx          Top nav bar for admin pages (links to all admin sections)
│   └── BottomNav.tsx         4-tab bottom nav for kids: Home / Quests / Rewards / Progress
├── quests/
│   ├── QuestCard.tsx         Card with domain color, grit badge, point value
│   └── QuestVerifyOverlay.tsx Multi-step bottom sheet: score → pin → initials → powerup → handoff → success
├── rewards/
│   └── RedeemDialog.tsx      Redemption flow with PIN entry
└── ui/
    ├── Avatar.tsx             Circle avatar; shows initials if no URL
    ├── Button.tsx             Primary / secondary / ghost variants; loading spinner state
    ├── Card.tsx               Surface card wrapper (rounded, border, bg)
    ├── ConfettiLayer.tsx      canvas-confetti integration; exported as fireConfetti()
    ├── DomainProgressBar.tsx  Multicolor segmented bar: shows domain point progress toward a goal cost
    ├── LoadingSpinner.tsx     Spinner + FullPageSpinner
    ├── PinEntry.tsx           Custom 8-digit keypad; PIN_LENGTH = 8; status prop: idle/checking/success/error
    ├── PointsBadge.tsx        Displays earned or available point count
    ├── PointsToast.tsx        Toast notification after points award; showPointsToast() exported
    └── Sheet.tsx              Bottom drawer sheet (title + children, close button)
```

---

## TV Scroll Display (`/scroll`)

Landscape ambient display intended for a physical TV in the program space. No auth, no nav.

- **Data source**: `GET /api/scroll` — polled every 5 minutes. Also subscribes to Supabase Realtime on `kids` table `UPDATE` events for live point updates.
- **Layout**: Fixed 80px header → two-column parallax scroll body → fixed 110px ticker.
- **Header**: SPARK Quest wordmark + member count + featured adventure progress bar.
- **Two-column parallax**: Left col at 46 px/s, right col at 38 px/s (CSS keyframe animation, duration computed from content height). Content is doubled for seamless infinite loop.
- **Content interleaved per column**: Splash panels → groups of 3 kids → alternating quest/reward cards.
- **Splash panels** (800px tall each): `scroll-logo.png`, `scroll-motivational.png`, `scroll-qr.png` (from `/public`).
- **Kid cards** (500px): Blue bg `#e6f4ff`, 170px avatar, name, total XP, long-term goal name, domain progress bar. Kids with `daily_points_today > 0` get pulsing yellow glow and "+N today ⚡" badge.
- **Quest cards** (280px): Domain-colored bg or full-bleed image with gradient overlay. Shows domain emoji, title, point value.
- **Reward cards** (560px): Amber (drop) or blue (adventure) bg or full-bleed image. Shows icon, title, cost.
- **Ticker** (110px, 46px Barlow Condensed): Scrolling recent quest completions.
- `show_avatar_in_scroll = false` → API masks `avatar_url` to null; Avatar component falls back to initials.

---

## Quest Verify Flow (QuestVerifyOverlay)

Multi-step overlay state machine:

1. **`score`** (record_chase only): Shows current personal best, score input with live record comparison (green/red border).
2. **`pin`**: Staff enters 8-digit PIN via custom keypad. Calls `POST /api/quests/verify-pin`. 401→shake+reset, 409→`already_done`, success→`initials`.
3. **`initials`**: Staff types 1–3 char initials. If grit quest with powerup → `powerup` state; otherwise submits directly.
4. **`powerup`**: Shows grit powerup description. Staff taps "Yes" or "Not this time". Both paths call `POST /api/quests/complete`.
5. **`handoff`**: "Quest approved! Hand the phone back." + 3-second countdown. After `HANDOFF_DELAY = 2800ms` → `success` + confetti + points toast + sound.
6. **`success`**: Shows points awarded, new record if applicable, daily remaining warning.
7. **`already_done`** / **`daily_limit`**: Error states with explanatory text.

Sound effects: `/public/sounds/victory.mp3` (powerup claimed) and `/public/sounds/great-success.mp3` (standard).

---

## Domain System

Five domains defined in `lib/types.ts`:

| Domain | Color | Emoji | Card tint |
|---|---|---|---|
| `body` | `#ff9933` orange | 💪 | `#fff4e6` |
| `brain` | `#ffcc33` yellow | 🧠 | `#fffde6` |
| `heart` | `#993399` purple | ❤️ | `#f8e6f8` |
| `hands` | `#33cc00` green | 🙌 | `#eefee6` |
| `team` | `#3399cc` blue | 🤝 | `#e6f4ff` |

- Quests have `domain_tags: Domain[]`. First tag wins for card color.
- Domain buckets on `kids` track domain-specific XP. The `award_quest_points` RPC increments all matching buckets atomically (a multi-domain quest credits all of them).
- `DomainProgressBar`: multicolor segmented bar. Segments colored by domain. Shows progress of `kidPoints` toward `targetCost`.
- Rewards have `domain_requirements: DomainRequirements` (JSONB). Eligibility checked client-side (progress bars) and server-side at redemption (`/api/rewards/redeem`). On domain failure, response includes `unmet` array and `suggestedQuests`.

---

## Record Chase Quest Type (migration 017)

A special quest type for competitive personal bests (e.g. most push-ups, fastest mile).

- `quest_type = 'record_chase'`, `score_unit` (label), `score_direction` (`higher` or `lower`), `record_set_points` (pts for first attempt).
- First attempt: `score_value` is recorded, `record_set_points` (often 0) awarded — no daily cap check for 0-point completions.
- Subsequent attempts: earn `point_value` pts only if new score beats personal best. Staff verify both first-set and beat-record attempts.
- Personal best fetched via `GET /api/quests/record?kid_id=&quest_id=` — returns `{ best_score, attempts }`.
- Live comparison while typing in overlay (green = new record, red = doesn't beat).

---

## Grit Mechanic

- Quests with `is_grit_quest = true` display a 🔥 badge.
- `grit_powerup_description`: optional challenge shown after the base quest.
- `grit_powerup_points`: bonus awarded if staff confirms the kid did the extra challenge.
- Single PIN entry covers both the base quest and the powerup decision.
- `quest_completions.powerup_claimed` records whether the bonus was taken.
- The `award_quest_points` RPC adds powerup points to the total before daily cap calculation.

---

## Featured Reward System

- `is_featured boolean` on both `drops` and `adventures`. Only one row across both tables should be featured at a time.
- Enforced in `PATCH /api/admin/rewards`: when `is_featured=true`, the API clears `is_featured` on all other rows in both tables.
- `GET /api/featured-reward`: returns the featured item; fallback is the highest-tier active adventure (by `point_cost_per_kid`).
- Used on `/home` to display the "Featured Drop" or "Group Adventure" card.
- Also used in `/scroll` header for adventure progress bar.

---

## Featured Quests (migration 018, added 2026-06-07)

Separate from the Featured Reward system above — this is a `quests.is_featured` flag, not a drop/adventure.

- Staff toggle via a star button in `/admin/quests`; featured quests sort to the top of the admin list.
- **Cap of 4 concurrent** featured quests, enforced server-side in `PATCH /api/admin/quests` (counts existing featured rows excluding the one being updated; returns `400 featured_quest_limit` if already at 4). No FK/exclusivity constraint in the DB — enforcement is app-level only.
- Despite the "weekly" naming in the migration comment, there is no time-based reset — it's a manually maintained rotation, capped at 4 at a time.
- `GET /api/scroll` fetches up to 4 featured, active quests (ordered by `point_value` desc) and `/scroll` renders them in a dedicated "⭐ Featured Quest" section (`app/scroll/page.tsx`).

---

## Goal System

- Kids have `short_term_goal_id/type` (≤75 pt rewards) and `long_term_goal_id/type` (≥76 pt rewards).
- No FK — same `(uuid, text)` cross-table reference pattern as redemptions.
- Set/changed via `PATCH /api/kids/[id]` with the appropriate fields.
- Auto-cleared by `POST /api/rewards/redeem` when the redeemed reward matches a goal slot.
- Goal prompt shown in `(kid)/layout.tsx` once per browser session (sessionStorage flag) if either slot is empty.
- Displayed on `/progress-station` as goal cards with `DomainProgressBar`.
- TV scroll: each kid card shows their long-term goal name (if set) and progress bar toward it.

---

## Third-Party Integrations

### Replicate (avatar generation)
- Model: `fofr/face-to-sticker:764d4827...` — produces sticker/cartoon art.
- Inputs: `image` (base64 JPEG selfie), `gender` (neutral/boy/girl), `vibe` (bold/cool/cute/fierce).
- Critical params: `prompt_strength: 8` (default 7 ignores gender/vibe), `instant_id_strength: 1`.
- `maxDuration = 60` on the route — requires Vercel Pro plan.
- Env var: `REPLICATE_API_TOKEN`.

### Supabase
- Postgres: all data storage.
- Storage: `avatars` and `card-images` buckets (both Public; must be created manually in Dashboard).
- Realtime: `kids` table, used by `/scroll` for live updates. Must be enabled in Dashboard → Database → Replication.
- `getServiceSupabase()` used in all API routes (service role key, bypasses RLS).
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Vercel
- Pro plan required for `maxDuration = 60` on the avatar generation route.
- Standard Next.js deployment otherwise.

---

## Design System Summary

```css
/* Color palette (defined in app/globals.css @theme inline {}) */
--color-bg:           #ffffff
--color-surface:      #f4f4f4
--color-border:       #dddddd
--color-text:         #111111
--color-muted:        #666666
--color-accent:       #3399cc   /* SPARK blue */
--color-accent-light: #1a7aaa
--color-accent-dark:  #0d5a80
--color-grit:         #cc3333   /* red */
```

- Primary button: `bg-[--color-accent]` + `text-[--color-text]` (black, 6.4:1 contrast). On hover: `text-white` on `--color-accent-dark`. Do **not** use `text-white` directly on `--color-accent` — fails WCAG AA (3:1 ratio).
- `PinEntry` keypad uses `bg-[#e8e8e8] border border-[#bbbbbb]` — `--color-surface` is nearly invisible on white.
- CSS variable colors with opacity modifiers (`bg-[--color-accent]/20`) don't work reliably in Tailwind v4. Use explicit hex or border+indicator patterns instead.

---

## Known Issues / Bugs

### ~~`POST /api/admin/upload-card-image` — missing `await` on auth check~~ — Fixed 2026-07-08

Was: `if (!verifyAdminToken(token))` — unawaited async always truthy, auth check never fired. Fixed in commit `110bef4` by adding the `await`.

### ~~RLS policies open to the anon key~~ — Fixed 2026-08-06

`002_rls.sql` created insert/update policies on `kids`, `quest_completions`, `redemptions`, and the `avatars` storage bucket with `using (true)`/`with check (true)` and no `to` clause — which applies them to `PUBLIC`, i.e. the anon key, not just the app's service role. That let anyone holding `NEXT_PUBLIC_SUPABASE_ANON_KEY` write directly via the Supabase REST API, bypassing the app's auth checks and point-mutation RPCs entirely (e.g. patch `kids.available_points` to any value, forge completions/redemptions). Fixed by `018_lock_down_rls.sql`, restricting those policies to `service_role`. Applied to production via the Supabase SQL Editor on 2026-08-06.

### Migration numbering collision: two files named `018`

`018_quest_featured.sql` and `018_lock_down_rls.sql` both exist. See note in Database section above.

---

## Notable Differences From Original Spec

1. **Next.js version**: `package.json` shows 16.2.10, not 15 as in CLAUDE.md.
2. **Record Chase quest type** (migration 017): Not in original design — allows personal-best tracking quests.
3. **40-point daily cap** (migration 015): Not in original design — enforced in Postgres RPC using Central Time day boundary.
4. **`category` column** on `quests`: Present from migration 001, superseded by `domain_tags` (migration 010). Still exists in DB, not exposed in UI or TypeScript types.
5. **`/leaderboard` replaced**: Route exists but redirects to `/progress-station`. Leaderboard concept was dropped in favor of personal progress.
6. **Admin: DELETE kid**: Added to `/api/admin/kids` — allows full kid removal (cascades completions/redemptions).
7. **Scroll includes quest cards**: Original spec showed only kid + reward cards; current scroll interleaves quest highlight cards.
8. **Avatar compare screen**: If a kid already has an avatar, AI generation goes to a side-by-side previous vs. new comparison. "Previous" triggers a PATCH to restore old URL.
9. **Device photo upload**: `POST /api/avatar/upload` — saves photo directly without AI; doesn't count against the 10-generation limit.
10. **Sound effects**: `victory.mp3` and `great-success.mp3` in `/public/sounds/` — played after quest completion.
11. **Goal prompt**: Shown once per browser session (sessionStorage), not persisted across logins.
12. **Scroll data includes quests**: `GET /api/scroll` returns top 8 active quests by point value for the scroll display.
13. **`score_value` on quest_completions**: numeric column added in 017 for record chase; otherwise null.
