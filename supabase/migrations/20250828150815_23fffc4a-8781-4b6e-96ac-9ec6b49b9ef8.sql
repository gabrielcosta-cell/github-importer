-- Criar tabela de contratos
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  squad text NOT NULL,
  acompanhamento text NOT NULL,
  plano text NOT NULL,
  etapa text NOT NULL,
  entrada date NOT NULL,
  servico text NOT NULL,
  assinatura date NOT NULL,
  primeiro_pagamento date NOT NULL,
  duracao integer NOT NULL,
  tempo_casa integer NOT NULL DEFAULT 0,
  renovacao date NOT NULL,
  mensalidade numeric NOT NULL,
  valor_contrato numeric NOT NULL,
  anexo text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view contracts" 
ON public.contracts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create contracts" 
ON public.contracts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete contracts" 
ON public.contracts 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- Trigger para update automático do updated_at
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados reais baseados nos mockContracts existentes
INSERT INTO public.contracts (name, squad, acompanhamento, plano, etapa, entrada, servico, assinatura, primeiro_pagamento, duracao, tempo_casa, renovacao, mensalidade, valor_contrato, anexo) VALUES
('PluggTo | Linx', 'Artemis', 'Semanal', 'Pro', 'Onboarding', '2025-08-20', 'Gestão de Tráfego', '2025-08-20', '2025-08-25', 6, 0, '2026-02-25', 4900, 29400, ''),
('TON', 'Artemis', 'Semanal', 'Business', 'Onboarding', '2025-08-19', 'Gestão de Tráfego', '2025-08-19', '2025-08-28', 6, 0, '2026-02-28', 3600, 21600, 'TON_contrato.pdf'),
('Central de Espelhos', 'Athena', 'Semanal', 'Business', 'Onboarding', '2025-08-15', 'Gestão de Tráfego', '2025-08-15', '2025-09-05', 4, 0, '2026-01-05', 3000, 12000, 'central_de_espelhos_contrato.pdf'),
('Q! Donuts', 'Artemis', 'Quinzenal', 'Business', 'Onboarding', '2025-08-07', 'Gestão de Tráfego', '2025-08-07', '2025-08-25', 6, 0, '2026-02-25', 3000, 18000, 'q_donuts_contrato.pdf'),
('Esher Bank', 'Athena', 'Semanal', 'Pro', 'Onboarding', '2025-08-05', 'Gestão de Tráfego', '2025-08-04', '2025-08-20', 6, 0, '2026-02-20', 4000, 24000, 'Esher_Bank_contrato.pdf');