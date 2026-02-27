-- Add qualification score fields to crm_cards table
ALTER TABLE crm_cards ADD COLUMN IF NOT EXISTS qual_nicho_certo integer DEFAULT NULL CHECK (qual_nicho_certo >= 0 AND qual_nicho_certo <= 2);
ALTER TABLE crm_cards ADD COLUMN IF NOT EXISTS qual_porte_empresa integer DEFAULT NULL CHECK (qual_porte_empresa >= 0 AND qual_porte_empresa <= 2);
ALTER TABLE crm_cards ADD COLUMN IF NOT EXISTS qual_tomador_decisao integer DEFAULT NULL CHECK (qual_tomador_decisao >= 0 AND qual_tomador_decisao <= 2);
ALTER TABLE crm_cards ADD COLUMN IF NOT EXISTS qual_investe_marketing integer DEFAULT NULL CHECK (qual_investe_marketing >= 0 AND qual_investe_marketing <= 2);
ALTER TABLE crm_cards ADD COLUMN IF NOT EXISTS qual_urgencia_real integer DEFAULT NULL CHECK (qual_urgencia_real >= 0 AND qual_urgencia_real <= 2);
ALTER TABLE crm_cards ADD COLUMN IF NOT EXISTS qual_clareza_objetivos integer DEFAULT NULL CHECK (qual_clareza_objetivos >= 0 AND qual_clareza_objetivos <= 2);

COMMENT ON COLUMN crm_cards.qual_nicho_certo IS 'Qualification score: Nicho certo? (0=Não, 1=Talvez, 2=Sim)';
COMMENT ON COLUMN crm_cards.qual_porte_empresa IS 'Qualification score: Porte da empresa? (0=Não, 1=Talvez, 2=Sim)';
COMMENT ON COLUMN crm_cards.qual_tomador_decisao IS 'Qualification score: Tomador de decisão? (0=Não, 1=Talvez, 2=Sim)';
COMMENT ON COLUMN crm_cards.qual_investe_marketing IS 'Qualification score: Já investe em marketing? (0=Não, 1=Talvez, 2=Sim)';
COMMENT ON COLUMN crm_cards.qual_urgencia_real IS 'Qualification score: Urgência real? (0=Não, 1=Talvez, 2=Sim)';
COMMENT ON COLUMN crm_cards.qual_clareza_objetivos IS 'Qualification score: Nível de clareza sobre os objetivos? (0=Não, 1=Talvez, 2=Sim)';