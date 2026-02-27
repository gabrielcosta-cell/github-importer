-- Corrigir warnings de segurança das funções
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), NEW.email, 'sdr');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar tabela de negócios com RLS adequado
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  value DECIMAL(10,2),
  status TEXT NOT NULL CHECK (status IN ('Prospecção', 'Reunião', 'Proposta', 'Negociação', 'Assinado', 'Perdido')) DEFAULT 'Prospecção',
  source TEXT,
  notes TEXT,
  responsible_user_id UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para businesses
CREATE POLICY "Users can view their assigned businesses" 
ON public.businesses 
FOR SELECT 
USING (
  responsible_user_id = auth.uid() OR created_by = auth.uid()
);

CREATE POLICY "Admins can view all businesses" 
ON public.businesses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can create businesses" 
ON public.businesses 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their businesses" 
ON public.businesses 
FOR UPDATE 
USING (
  responsible_user_id = auth.uid() OR created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete businesses" 
ON public.businesses 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para businesses
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();