-- Add position column to crm_tags to persist custom order
ALTER TABLE public.crm_tags
ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Initialize positions based on current name ordering
UPDATE public.crm_tags
SET position = sub.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS row_num
  FROM public.crm_tags
) AS sub
WHERE sub.id = crm_tags.id;