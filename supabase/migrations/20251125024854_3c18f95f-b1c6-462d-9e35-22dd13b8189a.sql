-- Add archive_to column to pipeline_automations table
ALTER TABLE pipeline_automations 
ADD COLUMN archive_to TEXT DEFAULT 'none' CHECK (archive_to IN ('won', 'lost', 'none'));