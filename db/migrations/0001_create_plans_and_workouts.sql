-- Migration: create plans and workouts tables
-- Purpose: store user training plans and their associated workouts.
--
-- Design notes:
--  - `plans` holds a structured plan (JSON) plus optional metadata.
--  - `workouts` holds individual sessions linked to a plan. Deleting
--    a plan cascades to its workouts to keep data consistent.
--  - Numeric unit conventions (distance, duration, pace) are defined
--    by the application layer; the DB stores raw numeric values.
BEGIN;

-- `plans` table: one row per saved training plan belonging to a user.
CREATE TABLE IF NOT EXISTS public.plans (
  -- surrogate primary key, large enough to avoid collisions
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- the owner of the plan (references auth provider UUIDs in app)
  user_id uuid NOT NULL,

  -- human-readable name for the plan
  name text NOT NULL,

  -- structured plan content stored as JSONB so the app can store
  -- nested workout blocks, intervals, progressions, etc.
  content jsonb NOT NULL,

  -- optional free-form metadata (e.g., sport type, planned start date,
  -- training focus); kept separate from `content` for quick filtering.
  metadata jsonb,

  -- timestamp when the plan was created; default to current time
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes to speed up common queries: get plans by user and recent plans
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans (user_id);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON public.plans (created_at);

-- `workouts` table: individual sessions tied to a `plans` row via `plan_id`.
CREATE TABLE IF NOT EXISTS public.workouts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- foreign key to the parent plan. `ON DELETE CASCADE` removes workouts
  -- automatically when a plan is deleted to avoid orphaned rows.
  plan_id bigint REFERENCES public.plans(id) ON DELETE CASCADE,

  -- scheduling fields (application enforces valid ranges):
  -- `week_number` usually denotes the week within the plan; `day_of_week`
  -- denotes day within the week (app-defined convention: 0-6 or 1-7).
  week_number int,
  day_of_week int,

  -- optional human-friendly name for the workout (e.g., "Long Run")
  name text,

  -- performance/metrics fields. Units are not enforced here and should
  -- be interpreted by the app (e.g., meters, seconds, min/km).
  distance double precision,
  duration double precision,

  -- optional heart-rate bounds observed or prescribed for the session
  min_heart_rate int,
  max_heart_rate int,

  -- pace as a numeric value (app decides representation)
  pace double precision,

  -- free-form detailed description or structured text of the workout
  detail text,

  -- difficulty label (e.g., easy/moderate/hard) — application-defined
  difficulty text
);

-- Index to quickly find all workouts for a given plan
CREATE INDEX IF NOT EXISTS idx_workouts_plan_id ON public.workouts (plan_id);

COMMIT;
