
# Add Unique Sequential ID to CSM Cards

## Overview
Add a visible, permanent 4-digit sequential ID (0001, 0002, ...) to every CSM card. The ID must be unique and never reused, even after card deletion.

## Database Changes

### 1. Migration: Add `display_id` column and sequence
- Create a PostgreSQL sequence `csm_cards_display_id_seq` starting at 1
- Add column `display_id INTEGER UNIQUE` to `csm_cards`
- Set default to `nextval('csm_cards_display_id_seq')`
- Backfill existing cards with sequential IDs ordered by `created_at`

```sql
CREATE SEQUENCE IF NOT EXISTS csm_cards_display_id_seq START 1;

ALTER TABLE csm_cards 
  ADD COLUMN IF NOT EXISTS display_id INTEGER UNIQUE 
  DEFAULT nextval('csm_cards_display_id_seq');

-- Backfill existing cards
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM csm_cards
)
UPDATE csm_cards SET display_id = numbered.rn
FROM numbered WHERE csm_cards.id = numbered.id;

-- Update sequence to continue after last used value
SELECT setval('csm_cards_display_id_seq', COALESCE((SELECT MAX(display_id) FROM csm_cards), 0));
```

## Frontend Changes

### 2. Update `CSMCard` type (`src/types/kanban.ts`)
- Add `display_id?: number` field

### 3. Update `KanbanCard` component (`src/components/kanban/KanbanCard.tsx`)
- Show formatted display_id (zero-padded to 4 digits) above or beside the company name
- Format: `#0001` in a subtle muted style

### 4. Update `CardDetailsDialog` (`src/components/kanban/CardDetailsDialog.tsx`)
- Show the display_id in the card detail header area

## Technical Notes
- Using a PostgreSQL sequence guarantees uniqueness and gap-preservation (deleted IDs are never reused)
- New cards automatically get the next ID via the column default -- no frontend logic needed
- The `display_id` is read-only and never editable by users
