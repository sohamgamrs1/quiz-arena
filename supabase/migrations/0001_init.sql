-- 0001_init.sql — Quiz Arena core schema
-- The answer key lives in public.questions and is never client-readable (R7).

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'player',
  avatar_emoji text not null default '🙂',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  cover_emoji text not null default '🎯',
  status      text not null default 'draft' check (status in ('draft', 'published')),
  share_slug  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.questions (
  id                uuid primary key default gen_random_uuid(),
  quiz_id           uuid not null references public.quizzes(id) on delete cascade,
  position          int not null check (position > 0),
  prompt            text not null,
  options           jsonb not null,        -- [{"id":"a","text":"..."}, ...] 2..6 items
  correct_option_id text not null,         -- THE ANSWER KEY: never client-readable
  time_limit_ms     int not null default 20000 check (time_limit_ms between 5000 and 60000),
  points_base       int not null default 1000 check (points_base between 0 and 5000),
  explanation       text,
  unique (quiz_id, position),
  constraint questions_options_shape check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 6
  )
);

create table public.rooms (
  id                  uuid primary key default gen_random_uuid(),
  quiz_id             uuid not null references public.quizzes(id) on delete cascade,
  host_id             uuid not null references auth.users(id) on delete cascade,
  code                text not null unique,   -- 6 chars, no 0/O/1/I
  mode                text not null default 'live' check (mode in ('live', 'solo', 'async')),
  status              text not null default 'lobby'
                      check (status in ('lobby', 'question', 'reveal', 'finished', 'abandoned')),
  current_index       int not null default -1,
  question_started_at timestamptz,
  question_ends_at    timestamptz,
  created_at          timestamptz not null default now(),
  finished_at         timestamptz,
  constraint rooms_code_shape check (code ~ '^[A-HJ-NP-Z2-9]{6}$')
);

create table public.players (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  display_name    text not null,
  avatar_emoji    text not null default '🙂',
  score           int not null default 0 check (score >= 0),
  streak          int not null default 0 check (streak >= 0),
  last_correct_at timestamptz,          -- deterministic tie-break
  prev_rank       int,                  -- for rank deltas on the leaderboard
  is_host         boolean not null default false,
  joined_at       timestamptz not null default now(),
  unique (room_id, user_id)             -- one seat per user per room
);

create table public.answers (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  option_id   text,
  status      text not null check (status in ('correct', 'wrong', 'timeout', 'rejected_late')),
  elapsed_ms  int,
  points      int not null default 0 check (points >= 0),
  answered_at timestamptz not null default now(),
  unique (room_id, question_id, player_id)   -- R4, enforced by the database
);

create table public.reveals (
  room_id           uuid not null references public.rooms(id) on delete cascade,
  question_id       uuid not null references public.questions(id) on delete cascade,
  correct_option_id text not null,
  distribution      jsonb not null,
  revealed_at       timestamptz not null default now(),
  primary key (room_id, question_id)
);

-- Append-only event log. Broadcast is the fast path; this is the reconciliation path
-- a client replays after a reconnect (phone locked, tab backgrounded, tunnel dropped).
create table public.room_events (
  seq      bigserial primary key,
  room_id  uuid not null references public.rooms(id) on delete cascade,
  event    text not null,
  payload  jsonb not null default '{}'::jsonb,
  at       timestamptz not null default now()
);

create index players_room_idx        on public.players (room_id, score desc);
create index answers_room_q_idx      on public.answers (room_id, question_id);
create index questions_quiz_idx      on public.questions (quiz_id, position);
create index room_events_room_idx    on public.room_events (room_id, seq);
create index quizzes_owner_idx       on public.quizzes (owner_id, created_at desc);

alter table public.profiles    enable row level security;
alter table public.quizzes     enable row level security;
alter table public.questions   enable row level security;
alter table public.rooms       enable row level security;
alter table public.players     enable row level security;
alter table public.answers     enable row level security;
alter table public.reveals     enable row level security;
alter table public.room_events enable row level security;
