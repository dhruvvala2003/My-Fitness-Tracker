-- ════════════════════════════════════════════════════════════════
-- FitTrack — migration v2
--
-- Run ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is "if not exists" / "drop if exists".
--
-- What this adds:
--   1. Profile fields on user_settings (height, age, sex, activity,
--      goal, target weight, water goal, rest timer) → daily calorie target
--   2. water_entries table (daily water glasses)
--   3. video_permissions table — admin grants per-user upload / edit /
--      delete rights for the shared exercise video library
--   4. Row-level-security on exercise_videos + the storage bucket so the
--      permissions are enforced by the database, not only by the UI
-- ════════════════════════════════════════════════════════════════


-- ── 1. Profile / settings columns ─────────────────────────────────
alter table if exists public.user_settings
  add column if not exists height_cm              numeric(5,1),
  add column if not exists birth_year             integer,
  add column if not exists sex                    text check (sex in ('male','female','other')),
  add column if not exists activity_level         text not null default 'moderate'
                                                  check (activity_level in ('sedentary','light','moderate','active','very_active')),
  add column if not exists goal                   text not null default 'maintain'
                                                  check (goal in ('lose','maintain','gain')),
  add column if not exists target_weight_kg       numeric(5,1),
  add column if not exists calorie_target_override integer check (calorie_target_override is null or calorie_target_override between 800 and 10000),
  add column if not exists water_goal             integer not null default 8,
  add column if not exists rest_seconds           integer not null default 90;


-- ── 2. Water intake (one row per user per day) ────────────────────
create table if not exists public.water_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  date    date not null,
  glasses integer not null default 0 check (glasses >= 0 and glasses <= 50),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.water_entries enable row level security;
drop policy if exists "Users manage own water entries" on public.water_entries;
create policy "Users manage own water entries" on public.water_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 3. Helper functions used by the policies below ────────────────
-- The admin is identified by the e-mail in the JWT (same address as
-- ADMIN_EMAIL in src/context/AuthContext.tsx).
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'dkvala2003@gmail.com';
$$;

-- Per-user video rights granted from the Admin page.
create table if not exists public.video_permissions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  can_upload boolean not null default false,
  can_edit   boolean not null default false,
  can_delete boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.video_permissions enable row level security;

drop policy if exists "Users read own video permissions" on public.video_permissions;
create policy "Users read own video permissions" on public.video_permissions
  for select using (auth.uid() = user_id);

drop policy if exists "Admin manages video permissions" on public.video_permissions;
create policy "Admin manages video permissions" on public.video_permissions
  for all using (public.is_admin()) with check (public.is_admin());

-- security definer so the check works from inside other tables' policies
create or replace function public.has_video_permission(p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
     or coalesce((
          select case p_action
                   when 'upload' then can_upload
                   when 'edit'   then can_edit
                   when 'delete' then can_delete
                   else false
                 end
          from public.video_permissions
          where user_id = auth.uid()
        ), false);
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.has_video_permission(text) to anon, authenticated;


-- ── 4. exercise_videos: enforce the permissions in the database ───
-- Drops EVERY existing policy on exercise_videos first, otherwise an old
-- permissive policy ("anyone can insert") would still let people through.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'exercise_videos'
  loop
    execute format('drop policy if exists %I on public.exercise_videos', p.policyname);
  end loop;
end $$;

alter table public.exercise_videos enable row level security;

-- Everyone (even signed-out visitors) can browse the shared library.
create policy "Videos are readable by everyone" on public.exercise_videos
  for select using (true);

-- Upload: must be signed in, own the row, and have the upload right.
create policy "Permitted users upload videos" on public.exercise_videos
  for insert with check (auth.uid() = uploaded_by and public.has_video_permission('upload'));

-- Edit: admin edits anything; others edit their own uploads if permitted.
create policy "Permitted users edit videos" on public.exercise_videos
  for update
  using  (public.is_admin() or (auth.uid() = uploaded_by and public.has_video_permission('edit')))
  with check (public.is_admin() or (auth.uid() = uploaded_by and public.has_video_permission('edit')));

-- Delete: admin deletes anything; others delete their own uploads if permitted.
create policy "Permitted users delete videos" on public.exercise_videos
  for delete
  using (public.is_admin() or (auth.uid() = uploaded_by and public.has_video_permission('delete')));


-- ── 5. Storage bucket "exercise-videos": same rules for the files ─
-- Drops only the storage policies that mention this bucket.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%exercise-videos%' or coalesce(with_check, '') ilike '%exercise-videos%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "exercise-videos: public read" on storage.objects
  for select using (bucket_id = 'exercise-videos');

-- files are stored as <user_id>/<video_id>
create policy "exercise-videos: permitted upload" on storage.objects
  for insert with check (
    bucket_id = 'exercise-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_video_permission('upload')
  );

create policy "exercise-videos: permitted delete" on storage.objects
  for delete using (
    bucket_id = 'exercise-videos'
    and (public.is_admin()
         or ((storage.foldername(name))[1] = auth.uid()::text and public.has_video_permission('delete')))
  );


-- ── 6. Admin can read the approvals list for the e-mail lookup ────
-- (the Admin page already reads user_approvals; this only makes sure the
--  admin policy exists under a known name.)
drop policy if exists "Admin reads all approvals" on public.user_approvals;
create policy "Admin reads all approvals" on public.user_approvals
  for select using (public.is_admin() or auth.uid() = user_id);
