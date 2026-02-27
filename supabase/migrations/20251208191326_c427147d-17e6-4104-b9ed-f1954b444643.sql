-- Remove the old check constraint that only allowed 'won', 'lost', 'none'
ALTER TABLE public.pipeline_automations 
DROP CONSTRAINT IF EXISTS pipeline_automations_archive_to_check;

-- The archive_to column can now accept 'none' or any pipeline UUID