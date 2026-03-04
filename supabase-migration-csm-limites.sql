-- Migration: Adicionar colunas de limites contratuais ao csm_cards
-- Executar no Supabase SQL Editor

ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS criativos_estaticos integer;
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS criativos_video integer;
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS lps integer;
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS limite_investimento numeric;
