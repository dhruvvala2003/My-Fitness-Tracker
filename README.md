# FitTrack

Personal fitness tracker — habits, streaks, workouts with calorie-burn estimates, food logging with a daily
calorie target, weight trends, daily insights and a shared exercise-video library.

Built with React 19 + TypeScript + Vite + Tailwind, Supabase (auth, Postgres, storage) and deployed on Vercel.

## Features

| Area | What it does |
| --- | --- |
| Home | Today's habit checklist (one tap to check), calories vs target, burned, water, weight, streaks, 7-day habit chart, quick navigation |
| Habits / Core habits | Monthly check-in table, notes per check, hidden columns, overall %, monthly target forecast |
| Streaks | Day counters with break history and reasons |
| Workout | Exercise catalog with images, MET-based calorie estimate (tempo + rest model for lifts), session builder, history, repeat workout |
| Calories | Food search (Indian + common foods), manual entry, AI photo analysis (server-side), daily target ring, 7-day intake strip |
| Progress | Weight trend with 7-day average and goal line, calories eaten vs burned, workouts per week, habit heat-map (habits or core), streak overview |
| Settings | Profile (height, age, sex, activity, goal) → BMR/TDEE/daily target, target weight, water goal, rest timer, habit columns, popup message, password, data export |
| Admin | Approve / deactivate accounts and grant **Upload / Edit / Delete** video permissions per user |
| Videos | Shared library. Everyone can watch; adding, editing and deleting are controlled by the admin and enforced by database policies |

## Setup

### 1. Supabase

1. Create a project and a **storage bucket** named `exercise-videos` (private).
2. SQL Editor → run `supabase-setup.sql` (first install) and then **`supabase-migration-v2.sql`**.
   The v2 migration adds the profile columns, water tracking, the `video_permissions` table and the
   row-level-security policies for videos. It is safe to re-run.
3. The admin account is the e-mail in `ADMIN_EMAIL` (`src/context/AuthContext.tsx`) **and** in `is_admin()`
   inside `supabase-migration-v2.sql`. Change both if you change the admin.

### 2. Environment variables

Local: create `.env` (never commit it):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Vercel → Project → Settings → Environment Variables:

| Name | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | same as local |
| `VITE_SUPABASE_ANON_KEY` | same as local |
| `GEMINI_API_KEY` | **server-side only** — used by `api/analyze-food.ts` for the food-photo feature. Free key from [Google AI Studio](https://aistudio.google.com/apikey). Do **not** prefix it with `VITE_`; that would ship the key to every visitor's browser. |
| `GEMINI_MODEL` | optional, defaults to `gemini-3.8-flash` |
| `ANTHROPIC_API_KEY` | optional alternative provider (Claude). Used only when `GEMINI_API_KEY` is not set. |

Photo analysis is optional. Without a key the Calories page still works with search and manual entry.

**Getting a Gemini key:** open [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in with your
Google account, click *Create API key*, copy it into Vercel as `GEMINI_API_KEY`, then redeploy.
The free tier has a daily request limit per project (enough for a few food photos a day); a Gemini
app subscription (Google AI Pro / Google One) is separate and does **not** add API quota.

### 3. Run / build

```
npm install
npm run dev          # front-end only (photo analysis needs the API route, see below)
npx vercel dev       # front-end + /api routes, closest to production
npm run build        # type-checks src/ and api/, then builds
```

Deploy by pushing to the connected GitHub repo; Vercel builds `dist/` and the `api/` serverless function automatically.

## Video permissions — how it works

* New accounts are **pending** until the admin approves them on the Admin page.
* Approved users can watch every video, but cannot upload, edit or delete anything by default.
* On the Admin page each approved user has three toggles: **Upload**, **Edit**, **Delete**.
  Edit/Delete apply to the user's own uploads; the admin can always edit or delete any video.
* The same rules live in Postgres (`exercise_videos` and the storage bucket policies), so they hold even if
  someone calls the Supabase API directly.

## Calorie-burn model

`kcal = MET × body-weight(kg) × hours` (Compendium of Physical Activities).

* Cardio / timed moves: the minutes you enter.
* Strength: time under tension = sets × reps × tempo (4 s per rep for lifts, 2.5 s for bodyweight) at the
  exercise MET, plus rest between sets at a light recovery MET. Heavier loads relative to body weight raise
  the intensity. Rest time is configurable (Workout page or Settings).

## Daily calorie target

Mifflin-St Jeor BMR × activity factor = maintenance (TDEE), then −500 kcal (lose), 0 (maintain) or
+300 kcal (gain). A custom target can override the calculation in Settings.
