-- Migration 012: Adventures and Drops from CSV source of truth
-- Clears existing incentive data and inserts the definitive set.
-- Safe when no redemptions exist yet.

DELETE FROM redemptions;
DELETE FROM adventures;
DELETE FROM drops;

-- ── Adventures ────────────────────────────────────────────────────────────────
INSERT INTO adventures (title, description, point_cost_per_kid, kids_threshold, stays_open_after_unlock, is_active, is_unlocked, domain_requirements, is_featured) VALUES

(
  'DELLS Waterpark Day!',
  'Overnight trip to Wisconsin Dells. The water park, slides, lazy river, all of it. The big one. Earn it together.',
  150, 10, false, true, false, '{}', false
),
(
  'Minneapolis Mall of America and Science Museum',
  'Overnight trip to Minneapolis! We''ll stop at Mall of America and the Science Museum.',
  150, 10, false, true, false, '{}', false
),
(
  'Sky Zone Trampoline Park',
  'Trip to the trampoline park. Jump, flip, crash into foam. No skill required.',
  100, 15, false, true, false, '{}', false
),
(
  'Adventure Zone',
  'Adventure Zone trip — games, laser tag, the full experience.',
  100, 15, false, true, false, '{}', false
),
(
  'Aquarium/Mall Trip',
  'Trip to the aquarium and the Mall in Duluth.',
  75, 12, false, true, false, '{}', false
),
(
  'SPARK After Dark',
  'In-house movie night — you pick the snacks and the movie.',
  40, 10, false, true, false, '{}', false
),
(
  'SPARK Overnight Lock-in',
  'A full overnight at SPARK. Your space. Your people. All night.',
  100, 15, false, true, false, '{}', false
);

-- ── Drops ─────────────────────────────────────────────────────────────────────
INSERT INTO drops (title, description, point_cost, quantity_available, is_active, domain_requirements, is_featured) VALUES

(
  'Sweet Drop',
  'Ice cream bar from the freezer.',
  5, NULL, true, '{}', false
),
(
  'Stay Safe Look Fresh',
  'Get your own fresh helmet.',
  25, NULL, true, '{}', false
),
(
  'Power Up',
  'A lacrosse medicine ball. For the ones who are serious.',
  25, NULL, true, '{}', false
),
(
  'Fresh Kicks',
  'A pair of Classic Jordans from the SPARK Collection.',
  100, NULL, true, '{}', false
),
(
  'Board Up',
  'A complete skateboard — deck, trucks, wheels, grip. The whole setup.',
  100, NULL, true, '{}', false
);
