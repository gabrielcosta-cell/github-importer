-- Add upsell fields to crm_cards table
ALTER TABLE crm_cards 
ADD COLUMN upsell_value numeric DEFAULT 0,
ADD COLUMN upsell_type text CHECK (upsell_type IN ('fixo', 'mensal')) DEFAULT 'fixo',
ADD COLUMN upsell_month integer,
ADD COLUMN upsell_year integer;