-- Adicionar coluna stage à tabela cancellation_requests se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cancellation_requests' AND column_name = 'stage'
  ) THEN
    ALTER TABLE cancellation_requests 
    ADD COLUMN stage text DEFAULT 'nova';
  END IF;
END $$;

-- Atualizar requests existentes com status 'pendente' para stage 'nova'
UPDATE cancellation_requests 
SET stage = 'nova' 
WHERE stage IS NULL OR stage = '';

-- Adicionar índice para melhorar performance de queries por stage
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_stage ON cancellation_requests(stage);