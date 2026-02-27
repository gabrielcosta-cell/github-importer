-- Corrigir search_path da função de trigger
CREATE OR REPLACE FUNCTION update_cancellation_requests_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;