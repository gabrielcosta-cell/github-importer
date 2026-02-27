-- Criar tabela para configurações do sistema
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem acessar configurações do sistema
CREATE POLICY "Admin access to system settings" 
ON public.system_settings 
FOR ALL 
USING (auth.uid() IN (
  SELECT id FROM auth.users 
  WHERE email IN ('admin@example.com') -- Ajustar conforme necessário
));