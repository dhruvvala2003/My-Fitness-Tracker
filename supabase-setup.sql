-- ════════════════════════════════════════════════════════════════
-- FitTrack — new tables for the Progress & Workout features
-- Run this once in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
-- Until these tables exist, the app still works; the Progress
-- weight log and Workout history simply stay empty.
-- ════════════════════════════════════════════════════════════════

-- ── Body-weight log (one entry per user per day) ──
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 1) not null check (weight_kg > 0 and weight_kg <= 400),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.weight_entries enable row level security;

create policy "Users manage own weight entries"
  on public.weight_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists weight_entries_user_date_idx
  on public.weight_entries (user_id, date);

-- ── Workout sessions (exercises stored as JSON) ──
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  started_at timestamptz not null default now(),
  exercises jsonb not null default '[]'::jsonb,
  total_calories numeric(7, 1) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "Users manage own workout sessions"
  on public.workout_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, date);
