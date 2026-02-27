-- Função para atualizar histórico mensal automaticamente quando um churn é marcado
CREATE OR REPLACE FUNCTION public.auto_update_churn_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_month INTEGER;
  target_year INTEGER;
BEGIN
  -- Se o card foi marcado como churn ou a data de perda mudou
  IF (NEW.churn = true AND OLD.churn = false) OR 
     (NEW.churn = true AND NEW.data_perda IS DISTINCT FROM OLD.data_perda) THEN
    
    -- Extrair mês e ano da data de perda
    IF NEW.data_perda IS NOT NULL THEN
      target_month := EXTRACT(MONTH FROM NEW.data_perda);
      target_year := EXTRACT(YEAR FROM NEW.data_perda);
      
      -- Atualizar o histórico mensal
      PERFORM public.update_monthly_churn_history(target_month, target_year);
    END IF;
  END IF;
  
  -- Se o card foi desmarcado como churn, também atualizar
  IF NEW.churn = false AND OLD.churn = true AND OLD.data_perda IS NOT NULL THEN
    target_month := EXTRACT(MONTH FROM OLD.data_perda);
    target_year := EXTRACT(YEAR FROM OLD.data_perda);
    
    -- Atualizar o histórico mensal
    PERFORM public.update_monthly_churn_history(target_month, target_year);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar histórico automaticamente
DROP TRIGGER IF EXISTS trigger_auto_update_churn_history ON public.crm_cards;
CREATE TRIGGER trigger_auto_update_churn_history
  AFTER INSERT OR UPDATE OF churn, data_perda ON public.crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_churn_history();