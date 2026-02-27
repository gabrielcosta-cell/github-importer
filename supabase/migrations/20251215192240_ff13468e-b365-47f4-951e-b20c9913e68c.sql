-- Add new columns for Apple TV style layout
ALTER TABLE success_cases ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE success_cases ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE success_cases ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;