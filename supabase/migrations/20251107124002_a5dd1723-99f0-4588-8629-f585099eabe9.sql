-- Fix search_path for security functions
CREATE OR REPLACE FUNCTION public.track_health_score_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if health_score actually changed and is not null
  IF NEW.health_score IS NOT NULL AND (OLD.health_score IS NULL OR OLD.health_score != NEW.health_score) THEN
    INSERT INTO public.crm_health_score_history (card_id, health_score, recorded_by)
    VALUES (NEW.id, NEW.health_score, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix search_path for alerts generation function
CREATE OR REPLACE FUNCTION public.generate_csm_alerts()
RETURNS void AS $$
BEGIN
  -- Clear existing unresolved alerts to regenerate them
  DELETE FROM public.crm_alerts WHERE is_resolved = false;
  
  -- Generate alerts for critical health score (< 30)
  INSERT INTO public.crm_alerts (card_id, alert_type, priority, title, message, created_by)
  SELECT 
    id,
    'health_score_critico',
    'critical',
    'Health Score Crítico: ' || title,
    'O cliente ' || COALESCE(company_name, title) || ' está com health score de ' || health_score || '%. Ação imediata necessária!',
    created_by
  FROM public.crm_cards
  WHERE health_score IS NOT NULL 
    AND health_score < 30
    AND NOT EXISTS (
      SELECT 1 FROM public.crm_alerts 
      WHERE crm_alerts.card_id = crm_cards.id 
        AND alert_type = 'health_score_critico' 
        AND is_resolved = false
    );
  
  -- Generate alerts for low health score (30-50)
  INSERT INTO public.crm_alerts (card_id, alert_type, priority, title, message, created_by)
  SELECT 
    id,
    'health_score_baixo',
    'high',
    'Health Score Baixo: ' || title,
    'O cliente ' || COALESCE(company_name, title) || ' está com health score de ' || health_score || '%. Requer atenção.',
    created_by
  FROM public.crm_cards
  WHERE health_score IS NOT NULL 
    AND health_score >= 30 
    AND health_score <= 50
    AND NOT EXISTS (
      SELECT 1 FROM public.crm_alerts 
      WHERE crm_alerts.card_id = crm_cards.id 
        AND alert_type = 'health_score_baixo' 
        AND is_resolved = false
    );
  
  -- Generate alerts for renewals in the next 30 days
  INSERT INTO public.crm_alerts (card_id, alert_type, priority, title, message, created_by)
  SELECT 
    id,
    'renovacao_proxima',
    CASE 
      WHEN data_renovacao <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
      WHEN data_renovacao <= CURRENT_DATE + INTERVAL '15 days' THEN 'high'
      ELSE 'medium'
    END,
    'Renovação Próxima: ' || title,
    'O contrato do cliente ' || COALESCE(company_name, title) || ' vence em ' || 
    (data_renovacao - CURRENT_DATE) || ' dias (' || TO_CHAR(data_renovacao, 'DD/MM/YYYY') || ').',
    created_by
  FROM public.crm_cards
  WHERE data_renovacao IS NOT NULL 
    AND data_renovacao <= CURRENT_DATE + INTERVAL '30 days'
    AND data_renovacao >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.crm_alerts 
      WHERE crm_alerts.card_id = crm_cards.id 
        AND alert_type = 'renovacao_proxima' 
        AND is_resolved = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';