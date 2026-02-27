-- Add client_logo column to success_cases for storing the client logo path
ALTER TABLE public.success_cases 
ADD COLUMN IF NOT EXISTS client_logo TEXT;

-- Create table for blog configuration (editable by admins)
CREATE TABLE public.blog_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.blog_config ENABLE ROW LEVEL SECURITY;

-- Public can read blog config
CREATE POLICY "Anyone can view blog config" 
ON public.blog_config 
FOR SELECT 
USING (true);

-- Only admins can modify blog config
CREATE POLICY "Admins can manage blog config" 
ON public.blog_config 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Insert default config values
INSERT INTO public.blog_config (config_key, config_value) VALUES
  ('hero_title', 'Na DOT não temos clientes, temos cases de sucesso'),
  ('hero_subtitle', 'Resultados reais, métricas claras e estratégias aplicáveis para sua empresa'),
  ('cta_title', 'Quer ser o próximo case de sucesso?'),
  ('cta_subtitle', 'Fale com nosso consultor e receba uma estratégia personalizada para sua empresa.'),
  ('cta_button_text', 'Quero ser o próximo case de sucesso'),
  ('cta_link', 'https://dotconceito.com.br/nova-lp-bio'),
  ('main_niches', 'B2B,Franquia,Energia Solar,Academia,Educação'),
  ('other_niches', 'Serviço,Varejo,Imobiliária | Construção Civil,SAAS,Telecom,Investimentos / Finanças,Contabilidade,E-commerce,Odontologia,Advocacia,Saúde,Alimentício'),
  ('metrics_badges_options', 'ROI,FATURAMENTO,VENDAS,ROAS,REDUÇÃO DE CUSTO,CPL,LEADS,TICKET MÉDIO,CONVERSÃO,CAC')
ON CONFLICT (config_key) DO NOTHING;