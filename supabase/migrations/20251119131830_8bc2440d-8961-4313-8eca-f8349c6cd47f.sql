-- Add columns to support pinned notes and threaded comments
ALTER TABLE crm_activities
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_activity_id uuid REFERENCES crm_activities(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_crm_activities_parent ON crm_activities(parent_activity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_pinned ON crm_activities(card_id, is_pinned) WHERE is_pinned = true;