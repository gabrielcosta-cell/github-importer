-- Create table for health score history
CREATE TABLE IF NOT EXISTS public.crm_health_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_health_score_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view health score history"
ON public.crm_health_score_history
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create health score history"
ON public.crm_health_score_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND recorded_by = auth.uid());

CREATE POLICY "Users can update health score history"
ON public.crm_health_score_history
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete health score history"
ON public.crm_health_score_history
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create index for better query performance
CREATE INDEX idx_health_score_history_card_id ON public.crm_health_score_history(card_id);
CREATE INDEX idx_health_score_history_recorded_at ON public.crm_health_score_history(recorded_at DESC);

-- Create table for alerts
CREATE TABLE IF NOT EXISTS public.crm_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('health_score_baixo', 'renovacao_proxima', 'health_score_critico')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view alerts"
ON public.crm_alerts
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create alerts"
ON public.crm_alerts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update alerts"
ON public.crm_alerts
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete alerts"
ON public.crm_alerts
FOR DELETE
USING (get_current_user_role() = 'admin');

-- Create indexes
CREATE INDEX idx_alerts_card_id ON public.crm_alerts(card_id);
CREATE INDEX idx_alerts_is_read ON public.crm_alerts(is_read);
CREATE INDEX idx_alerts_is_resolved ON public.crm_alerts(is_resolved);
CREATE INDEX idx_alerts_created_at ON public.crm_alerts(created_at DESC);

-- Create function to automatically create health score history when health_score changes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS track_health_score_changes_trigger ON public.crm_cards;
CREATE TRIGGER track_health_score_changes_trigger
AFTER UPDATE ON public.crm_cards
FOR EACH ROW
EXECUTE FUNCTION public.track_health_score_changes();

-- Create function to generate alerts for low health scores and upcoming renewals
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
$$ LANGUAGE plpgsql SECURITY DEFINER;