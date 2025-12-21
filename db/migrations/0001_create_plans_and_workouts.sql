-- Creates plans and workouts tables used by the app
BEGIN;

CREATE TABLE IF NOT EXISTS public.plans (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  content jsonb NOT NULL,       -- plan JSON (can store structured plan)
  metadata jsonb,               -- optional metadata (sport, plan_start, etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans (user_id);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON public.plans (created_at);

CREATE TABLE IF NOT EXISTS public.workouts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id bigint REFERENCES public.plans(id) ON DELETE CASCADE,
  week_number int,
  day_of_week int,
  name text,
  distance double precision,
  duration double precision,
  min_heart_rate int,
  max_heart_rate int,
  pace double precision,
  detail text,
  difficulty text
);

CREATE INDEX IF NOT EXISTS idx_workouts_plan_id ON public.workouts (plan_id);

COMMIT;
