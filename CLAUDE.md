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
- **Switch User:** "SWITCH" item in `BottomNav` (5th tab, action button not a route) opens a confirm sheet in `(kid)/layout.tsx` → clears the three `spark_kid_*` localStorage keys + `goals_prompt_dismissed` sessionStorage flag → routes to `/`. Lets staff hand a shared device to the next kid without a real logout system.

## Key Rules
- Never put `export const runtime = 'edge'` on any route that uses `bcryptjs`
- All point mutations go through Postgres RPCs (`award_quest_points`, `redeem_reward`) — never read-modify-write from client
- Staff passcode verified via `PinEntry` component — custom keypad, `PIN_LENGTH = 8`
- Supabase Realtime must be enabled on `kids` table in Dashboard > Database > Replication
- Avatar generation: `export const maxDuration = 60` on the route (Vercel Pro required)
- CSS variable colors with opacity (`bg-[--color-accent]/20`) don't work reliably in Tailwind v4 — use `border-2` + explicit checkmark indicators for selected states instead

## Design System
- **Fonts:** Space Grotesk (body), Barlow Condensed (display/headings) via `next/font/google`
- Barlow Condensed exposed as `--font-barlow` CSS variable and `.font-barlow` Tailwind utility
- **Aesthetic:** White background, bold condensed ALL CAPS labels, vivid SPARK brand accent colors
- **Color palette** (defined in `app/globals.css` `@theme inline {}`):
  - `--color-bg: #ffffff`, `--color-surface: #f4f4f4`, `--color-border: #dddddd`
  - `--color-accent: #3399cc` (blue), `--color-accent-light: #1a7aaa`, `--color-accent-dark: #0d5a80`
  - `--color-text: #111111`, `--color-muted: #666666`, `--color-grit: #cc3333`
  - Brand colors: Blue `#3399cc`, Yellow `#ffcc33`, Orange `#ff9933`, Red `#cc3333`, Purple `#993399`, Green `#33cc00`
- **Button contrast:** Primary button uses `text-[--color-text]` (black on blue = 6.4:1), switches to `text-white` on hover (white on dark blue = passes). `text-white` directly on `--color-accent` blue fails WCAG AA (3:1) — don't do it.
- **PinEntry keypad:** Uses `bg-[#e8e8e8] border border-[#bbbbbb]` for keypad buttons — the Tailwind surface color (#f4f4f4) is nearly invisible on white; always use explicit hex grays here.
- Domain card tint colors defined in `lib/types.ts` as `DOMAIN_CARD_COLORS` (light tints) with `DOMAIN_TEXT_COLORS` all `#111111`

## Domain System
Five domains: `body` (terracotta), `brain` (amber), `heart` (mauve/lavender), `hands` (mint), `team` (violet).
Defined in `lib/types.ts`: `DOMAIN_COLORS`, `DOMAIN_TEXT_COLORS`, `DOMAIN_LABELS`, `DOMAIN_EMOJIS`, `ALL_DOMAINS`.
- Quests have `domain_tags: Domain[]` (multi-select, first tag wins for card color)
- Kids have `body_points`, `brain_points`, `heart_points`, `hands_points`, `team_points` columns
- Drops/Adventures have `domain_requirements: DomainRequirements` (JSONB, e.g. `{ "body": 20, "team": 10 }`)
- `award_quest_points` RPC atomically increments domain columns when awarding points
- Domain eligibility checked client-side (progress bars on reward cards) and server-side at redemption
- `DomainProgressBar` component (`components/ui/DomainProgressBar.tsx`) — multicolor segmented bar showing progress toward a goal cost

## Grit Mechanic
- Quests have `is_grit_quest: boolean` — shows 🔥 flame badge on card
- Grit quests have `grit_powerup_description` and `grit_powerup_points` fields
- After PIN + initials in QuestVerifyOverlay, a powerup screen appears: "Did you also do X? (+Y pts)"
- Staff taps "Yes" or "Not this time" — one PIN entry covers both; `powerup_claimed` sent to `/api/quests/complete`
- `quest_completions` has `powerup_claimed boolean` to track this

## Featured Reward
- One reward (drop or adventure) can be `is_featured = true` at a time
- Admin enables via "⭐ Feature" button in `/admin/rewards` — API auto-clears all other featured flags
- Home page fetches `/api/featured-reward` — returns featured item, fallback to highest-tier active adventure
- `FeaturedReward` type in `lib/types.ts` = `{ type: 'adventure' | 'drop' } & (Adventure | Drop)`

## Goal System
Kids can set a short-term goal and a long-term goal — each points at either a Drop or an Adventure.
- `kids` table: `short_term_goal_id uuid`, `short_term_goal_type text`, `long_term_goal_id uuid`, `long_term_goal_type text`
- No FK constraint — supports both drops and adventures in same columns (same pattern as redemptions)
- Goal detail fetched at display time via bulk lookup (not joined on kids table)
- `DomainProgressBar` renders goal progress using `kidPoints`, `totalEarned`, `targetCost`, `availablePoints`
- When a reward is redeemed (`/api/rewards/redeem`), the API auto-clears whichever goal slot matches
- **Goal prompt:** `(kid)/layout.tsx` fetches kid on mount; if either goal is missing and `sessionStorage.goals_prompt_dismissed` is not set, shows a bottom-sheet overlay prompting goal setup. Dismissed via sessionStorage so it reappears on next login.

## Avatar
- Model: `fofr/face-to-sticker` — always produces sticker/cartoon art regardless of style prompts
- Inputs: `gender` (neutral/boy/girl) + `vibe` (bold/cool/cute/fierce) — these affect the prompt
- `prompt_strength: 8` — critical, default is 7; lower values cause gender/vibe to be ignored
- **Lifetime limit:** 10 AI generations per kid, tracked in `kids.avatar_generation_count`
- Each AI generation saves to `{kid_id}_v{count}.webp` (unique filename prevents CDN cache collisions)
- API always updates `avatar_url` + `avatar_generation_count` on success; returns `previous_avatar_url`
- If `previous_avatar_url` is non-null, page goes to side-by-side compare screen (previous vs new)
- Picking "previous" triggers `PATCH /api/kids/[id]` to restore old URL; picking "new" needs no DB change
- **Device photo upload:** `POST /api/avatar/upload` — saves to `{kid_id}_photo.webp`, does NOT increment count, no AI
- **Scroll visibility:** kids can toggle `show_avatar_in_scroll` — scroll API masks `avatar_url` to null when false

## TV Scroll Display (`/scroll`)
Landscape ambient display for the program TV — no auth, no nav, auto-scrolling infinite loop.
- Fetches via `GET /api/scroll` — returns kids (A–Z), recent completions, featured adventure progress, active rewards; includes `daily_points_today` per kid (CT timezone)
- Content order: 3 full-width splash image panels → groups of 8 kids (2 rows of 4) → reward highlight card → repeat
- **Splash panels:** 3 separate 800px-tall full-width sections, each showing one image vertically centered
  - `public/scroll-logo.png` — SPARK Quest graffiti logo (purple glow)
  - `public/scroll-motivational.png` — motivational text, fills full width
  - `public/scroll-qr.png` — QR code to join, white background, "Scan to join" label
- **Reward highlight cards:** full-width, 560px tall, amber (drops) or violet (adventures); shown every 8 kids, cycles through active rewards; full-bleed image when `image_url` is set
- **Speed:** two-column parallax — left column `46 px/s`, right column `38 px/s`; seamless loop via doubled content with `-b` uid suffix
- **Ticker:** 110px tall, 46px Barlow Condensed bold — scrolling recent quest completions
- **Kid cards:** blue background (`#e6f4ff`), blue border (`2px solid #3399cc`), 170px centered avatar; kids with `daily_points_today > 0` get a pulsing yellow glow (`yellow-pulse` keyframe in globals.css)
- **Quest/Reward cards with images:** full-bleed image background with dark gradient overlay for text legibility
- `show_avatar_in_scroll = false` → avatar_url masked to null in API, Avatar component shows initials instead

## Routes
### Kid-facing
- `/` — login/registration with returning-user detection and "Is this you?" claim flow
- `/onboarding/avatar` — camera selfie or device photo upload → gender/vibe picker → AI or direct upload → compare screen → Supabase Storage; shows scroll visibility toggle and remaining AI attempts
- `/home` — dashboard: avatar, points, active quests, featured reward, quick links
- `/quests` — quest browser with domain filter tabs, quest detail sheet, verify overlay
- `/rewards` — drops + adventures with domain eligibility bars, redeem flow
- `/progress-station` — personal progress: domain balance, short + long-term goal cards, goal picker, recent activity; `/leaderboard` redirects here
- `/scroll` — TV ambient display (no auth, navigate directly)

### Admin (not linked in kid UI — navigate to `/admin` directly)
- `/admin` — staff passcode login
- `/admin/dashboard` — at-a-glance stats
- `/admin/kids` — view all kids, search, manually adjust points
- `/admin/quests` — CRUD quests; domain filter + staff filter; "Posted by" field
- `/admin/rewards` — CRUD drops and adventures; adventure tab shows contribution progress, contributor list, manual unlock button
- `/admin/completions` — log of all quest completions with staff initials
- `/admin/redemptions` — log of all reward redemptions
- `/admin/settings` — change staff passcode

### API
- `POST /api/kids` — register (returns existing kid data on 409 for claim flow)
- `PATCH /api/kids/[id]` — allowed fields: `avatar_url`, `available_points`, `short_term_goal_id`, `short_term_goal_type`, `long_term_goal_id`, `long_term_goal_type`, `show_avatar_in_scroll`
- `GET /api/kids/[id]/completions` — last 5 completions with quest title, domain_tags, point_value
- `GET /api/scroll` — all kids A–Z with domain+goal data, recent completions, featured adventure progress, active rewards
- `GET /api/featured-reward` — featured drop or adventure for home page
- `POST /api/quests/verify-pin` — check passcode + already-completed in one step
- `POST /api/quests/complete` — award points via `award_quest_points` RPC
- `POST /api/rewards/redeem` — deduct points via `redeem_reward` RPC, auto-clears matching goal slot
- `POST /api/avatar/generate` — AI sticker avatar via Replicate; accepts `gender`, `vibe`; returns `avatar_url`, `generation_count`, `previous_avatar_url`; 403 if 10-generation limit reached
- `POST /api/avatar/upload` — save device photo directly (no AI, no count increment)
- `POST /api/admin/upload-card-image` — upload image for a quest/drop/adventure; body: `{ type, id, imageBase64 }`; stores to `card-images/{type}/{id}.webp` in Supabase Storage, updates `image_url` in DB
- All `/api/admin/*` routes require `x-admin-token` header

## Database
Migrations in `supabase/migrations/` — run in order: 001–007, 009, 013, 014, 016. (008 is optional sample data.)
Key tables: `kids`, `quests`, `quest_completions`, `drops`, `adventures`, `redemptions`, `staff_config`

Key `kids` columns added post-initial-schema:
- `body_points`, `brain_points`, `heart_points`, `hands_points`, `team_points` — domain point breakdown
- `short_term_goal_id`, `short_term_goal_type`, `long_term_goal_id`, `long_term_goal_type` — goal refs (migration 013)
- `avatar_generation_count integer DEFAULT 0` — lifetime AI generation count (migration 014)
- `show_avatar_in_scroll boolean DEFAULT true` — scroll visibility toggle (migration 014)

Key columns added to `quests`, `drops`, `adventures` (migration 016):
- `image_url text` — optional card image; displayed full-bleed on TV scroll; uploaded via admin edit forms

## Card Images
- Admin can upload an image when editing an existing quest, drop, or adventure (not on create — ID required for storage path)
- Upload UI in `/admin/quests` and `/admin/rewards` — shows thumbnail preview; `🖼` indicator in list when image exists
- Images stored in Supabase Storage bucket `card-images` (must be created as Public)
- Path pattern: `card-images/{quest|drop|adventure}/{id}.webp`

## Supabase Gotchas
- After creating or replacing Postgres functions, run `NOTIFY pgrst, 'reload schema';` in the SQL editor if RPCs return PGRST202 errors.
- Realtime must be enabled per-table in Dashboard > Database > Replication (not via SQL).
- Storage bucket `avatars` must be created manually and set to Public.
- Storage bucket `card-images` must be created manually and set to Public (for quest/reward card images).
