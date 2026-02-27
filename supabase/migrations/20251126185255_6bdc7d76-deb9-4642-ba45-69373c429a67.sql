-- Add new columns to crm_card_upsell_history table for upsell/crosssell tracking
ALTER TABLE public.crm_card_upsell_history
ADD COLUMN upsell_type TEXT DEFAULT 'upsell' CHECK (upsell_type IN ('upsell', 'crosssell')),
ADD COLUMN payment_type TEXT DEFAULT 'recorrente' CHECK (payment_type IN ('recorrente', 'unico', 'parcelado')),
ADD COLUMN installments INTEGER DEFAULT NULL,
ADD COLUMN start_month INTEGER DEFAULT NULL,
ADD COLUMN start_year INTEGER DEFAULT NULL;