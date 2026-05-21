-- Migration 011: Quest domain data from CSV source of truth
-- Run AFTER 010_domain_system.sql
-- Replaces all existing quest records with the definitive CSV data.
-- Safe to run when no kid completions exist (quest_completions cascade-deletes).

-- Drop the old category column (domains replace it entirely)
ALTER TABLE quests DROP COLUMN IF EXISTS category;

DELETE FROM quest_completions;
DELETE FROM quests;

INSERT INTO quests (title, description, domain_tags, point_value, repeatable, is_active, is_grit_quest, grit_powerup_description, grit_powerup_points) VALUES

-- ── Social / character ────────────────────────────────────────────────────────
(
  'Mama T''s Helper',
  'Do the dishes before anyone asks. No announcement needed. Just do it.',
  ARRAY['team','heart'], 5, true, true, false, NULL, NULL
),
(
  'Good Look',
  'Give a real specific compliment or piece of positive feedback to a peer. ''Nice'' doesn''t count. Make it mean something.',
  ARRAY['heart','team'], 5, true, true, false, NULL, NULL
),
(
  'Random Act',
  'Do something genuinely kind for someone without being asked — and without expecting anything back.',
  ARRAY['heart','team'], 8, true, true, false, NULL, NULL
),

-- ── Physical ──────────────────────────────────────────────────────────────────
(
  'Jump Off',
  'How many consecutive jump rope jumps can you hit without tripping? Post your score. Beat it next time.',
  ARRAY['body'], 5, true, true, true, 'Beat your personal best 3 sessions in a row', 10
),
(
  'Push',
  'Drop and do 10 clean pushups. Staff or a peer verifies form.',
  ARRAY['body'], 5, true, true, true, 'Do 25 pushups without stopping', 10
),
(
  'Court Time',
  'Show up and participate in a 20-minute volleyball drill. Full effort. Phones away.',
  ARRAY['body','team'], 10, true, true, false, NULL, NULL
),
(
  'Stick Work',
  'Show up and give real effort in a 20-minute lacrosse drill. Full effort. Phones away.',
  ARRAY['body','team'], 10, true, true, false, NULL, NULL
),

-- ── Challenges ────────────────────────────────────────────────────────────────
(
  'Dethrone the Director',
  'Challenge Scott to pool or foosball. 5 points for stepping up. Win? That''s 10.',
  ARRAY['team','body'], 5, true, true, false, NULL, NULL
),
(
  'Mentor Challenge',
  'Pick any mentor and challenge them to your game. 5 points for stepping up. Win? That''s 10.',
  ARRAY['team','body'], 5, true, true, false, NULL, NULL
),
(
  'Board Certified',
  'Land a clean ollie on a skateboard. Practice until you get it.',
  ARRAY['body','brain'], 15, false, true, true, 'Land it 10 times in a row without stopping', 25
),
(
  'Catch and Release',
  'Land 3 kendama tricks in a row. Staff verifies.',
  ARRAY['body','hands'], 10, true, true, true, 'Land 5 different tricks in a row', 15
),

-- ── Music ─────────────────────────────────────────────────────────────────────
(
  'Six-String Session',
  'Show up for a 15-minute guitar lesson with a mentor. You don''t have to be good. You just have to show up.',
  ARRAY['brain','hands'], 10, true, true, false, NULL, NULL
),
(
  'Chord Progression',
  'Learn 3 new chords and demonstrate that you can change between them smoothly.',
  ARRAY['brain','hands'], 15, true, true, true, 'Play repeatedly in time to a drum track!', 25
),
(
  'Musician Riz',
  'Perform a song you''ve been working on in front of a small audience.',
  ARRAY['hands','heart'], 15, true, true, false, NULL, NULL
),

-- ── Making / building ─────────────────────────────────────────────────────────
(
  'Art Drop',
  'Complete an original piece and submit it for the SPARK Art Show. Any medium. Any skill level.',
  ARRAY['hands','heart'], 20, false, true, true, NULL, NULL
),
(
  'Build Your Stick',
  'String and complete your own lacrosse stick from start to finish.',
  ARRAY['hands','body'], 20, false, true, true, NULL, NULL
),
(
  'Gifted',
  'Make or find something thoughtful for the Gift Game. It doesn''t have to be expensive. It has to mean something.',
  ARRAY['hands','team'], 15, false, true, false, NULL, NULL
),
(
  'Beading with Grandma Joann',
  'Sit with Grandma Joann and complete a beading project together. This one''s about showing up as much as the craft.',
  ARRAY['hands','team'], 20, false, true, true, NULL, NULL
),
(
  'Build your own 3D design!',
  'Create your own 3D design to print on the 3D printer.',
  ARRAY['brain','hands'], 20, true, true, true, NULL, NULL
),

-- ── Learning / growth ─────────────────────────────────────────────────────────
(
  'New Game Who Dis',
  'Learn the rules of a game you''ve never played before and finish one full round.',
  ARRAY['brain','team'], 8, true, true, false, NULL, NULL
),
(
  'Lock In',
  'Schedule and complete a one-on-one goal-setting session with a mentor. Walk out with at least one written goal.',
  ARRAY['brain','heart'], 10, true, true, false, NULL, NULL
),
(
  'Pass It On',
  'Find a younger kid and teach them something real — a game, a skill, a trick. Pass it on.',
  ARRAY['team','brain'], 10, true, true, false, NULL, NULL
),
(
  'See It Through',
  'Start something at SPARK and finish it — even when it gets boring or hard. No quitting at 80%. Talk to a mentor about your plan.',
  ARRAY['brain','heart'], 10, true, true, true, NULL, NULL
),
(
  'Grow your EQ',
  'Build Emotional Intelligence with an online lesson and worksheet.',
  ARRAY['heart','brain'], 10, true, true, false, NULL, NULL
);
