-- Give self-guided workouts the same optional skill-video experience as team
-- workouts. Existing table RLS and grants continue to govern the new columns.
ALTER TABLE public.personal_practice_tasks
  ADD COLUMN IF NOT EXISTS shot_type text,
  ADD COLUMN IF NOT EXISTS video_url text;

COMMENT ON COLUMN public.personal_practice_tasks.video_url IS
  'Optional original YouTube or Vimeo lesson attached to this exercise.';

-- Add a recommendation only when the exercise wording or structured shot type
-- is an exact match. Never overwrite a coach or parent's existing selection.
WITH personal_recommendations AS (
  SELECT
    task.id,
    CASE
      WHEN lower(task.label) ~ '\mquick[[:space:]_-]+releases?\M'
        THEN 'https://www.youtube.com/watch?v=iHHmFJ17m58'
      WHEN lower(task.label) ~ '\mtoe[[:space:]_-]+drags?\M'
        THEN 'https://www.youtube.com/watch?v=lBEhLyU6XlY'
      WHEN lower(task.label) ~ '\mslap[[:space:]_-]*shots?\M' OR lower(coalesce(task.shot_type, '')) = 'slap'
        THEN 'https://www.youtube.com/watch?v=2qkhf4i3FBY'
      WHEN lower(task.label) ~ '\msnap[[:space:]_-]*shots?\M' OR lower(coalesce(task.shot_type, '')) = 'snap'
        THEN 'https://www.youtube.com/watch?v=-37asUfMFvE'
      WHEN lower(task.label) ~ '\mwrist[[:space:]_-]*shots?\M' OR lower(coalesce(task.shot_type, '')) = 'wrist'
        THEN 'https://www.youtube.com/watch?v=sakcM2OYxdI'
      WHEN lower(task.label) ~ '\mbackhand\M' OR lower(coalesce(task.shot_type, '')) = 'backhand'
        THEN 'https://www.youtube.com/watch?v=zQxNz7sLpTQ'
      WHEN lower(task.label) ~ '\mstick[[:space:]_-]*handl'
        THEN 'https://www.youtube.com/watch?v=DD94uw3Chn8'
      ELSE NULL
    END AS recommended_url
  FROM public.personal_practice_tasks task
  JOIN public.personal_practice_cards card
    ON card.id = task.personal_practice_card_id
  WHERE card.date >= CURRENT_DATE
    AND task.video_url IS NULL
    AND task.task_type IN ('shooting', 'prep', 'stickhandling', 'video')
)
UPDATE public.personal_practice_tasks task
SET video_url = recommendation.recommended_url
FROM personal_recommendations recommendation
WHERE task.id = recommendation.id
  AND recommendation.recommended_url IS NOT NULL;

WITH team_recommendations AS (
  SELECT
    task.id,
    CASE
      WHEN lower(task.label) ~ '\mquick[[:space:]_-]+releases?\M'
        THEN 'https://www.youtube.com/watch?v=iHHmFJ17m58'
      WHEN lower(task.label) ~ '\mtoe[[:space:]_-]+drags?\M'
        THEN 'https://www.youtube.com/watch?v=lBEhLyU6XlY'
      WHEN lower(task.label) ~ '\mslap[[:space:]_-]*shots?\M' OR lower(coalesce(task.shot_type, '')) = 'slap'
        THEN 'https://www.youtube.com/watch?v=2qkhf4i3FBY'
      WHEN lower(task.label) ~ '\msnap[[:space:]_-]*shots?\M' OR lower(coalesce(task.shot_type, '')) = 'snap'
        THEN 'https://www.youtube.com/watch?v=-37asUfMFvE'
      WHEN lower(task.label) ~ '\mwrist[[:space:]_-]*shots?\M' OR lower(coalesce(task.shot_type, '')) = 'wrist'
        THEN 'https://www.youtube.com/watch?v=sakcM2OYxdI'
      WHEN lower(task.label) ~ '\mbackhand\M' OR lower(coalesce(task.shot_type, '')) = 'backhand'
        THEN 'https://www.youtube.com/watch?v=zQxNz7sLpTQ'
      WHEN lower(task.label) ~ '\mstick[[:space:]_-]*handl'
        THEN 'https://www.youtube.com/watch?v=DD94uw3Chn8'
      ELSE NULL
    END AS recommended_url
  FROM public.practice_tasks task
  JOIN public.practice_cards card
    ON card.id = task.practice_card_id
  WHERE card.date >= CURRENT_DATE
    AND task.video_url IS NULL
    AND task.task_type IN ('shooting', 'prep', 'stickhandling', 'video')
)
UPDATE public.practice_tasks task
SET video_url = recommendation.recommended_url
FROM team_recommendations recommendation
WHERE task.id = recommendation.id
  AND recommendation.recommended_url IS NOT NULL;
