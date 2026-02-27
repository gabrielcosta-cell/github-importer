-- Create team_goals table for monthly team targets
CREATE TABLE public.team_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_type text NOT NULL CHECK (team_type IN ('closer', 'sdr')),
  month integer NOT NULL CHECK (month >= 0 AND month <= 11),
  year integer NOT NULL,
  goal_value numeric NOT NULL DEFAULT 0,
  reward_value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_type, month, year)
);

-- Enable RLS
ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_goals
CREATE POLICY "Everyone can view team goals" 
ON public.team_goals 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage team goals" 
ON public.team_goals 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Add trigger for updated_at
CREATE TRIGGER update_team_goals_updated_at
BEFORE UPDATE ON public.team_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample businesses into the businesses table and link them to users
INSERT INTO public.businesses (
  name, value, status, responsible_user_id, created_by, source, 
  contact_person, email, phone, notes, created_at, updated_at
) VALUES 
-- Pedro's businesses (SDR)
('PGTI', 5400.00, 'Assinado', 'd6a3a0e6-b6b7-42cc-85af-425f155276cc', 'd6a3a0e6-b6b7-42cc-85af-425f155276cc', 'Inbound', 'Pedro Responsável', 'contato@pgti.com', '51999999999', 'Business Plan - SDR: Pedro', '2025-02-10', now()),
('Clínica Matarazzo', 4900.00, 'Assinado', 'd6a3a0e6-b6b7-42cc-85af-425f155276cc', 'd6a3a0e6-b6b7-42cc-85af-425f155276cc', 'Inbound', 'Pedro Responsável', 'contato@matarazzo.com', '51999999998', 'Pro Plan - SDR: Pedro', '2025-05-10', now()),
('Dental 9', 3000.00, 'Assinado', 'd6a3a0e6-b6b7-42cc-85af-425f155276cc', 'd6a3a0e6-b6b7-42cc-85af-425f155276cc', 'Inbound', 'Pedro Responsável', 'contato@dental9.com', '51999999997', 'Business Plan - SDR: Pedro', '2025-05-11', now()),

-- Will's businesses (Closer)
('Tucunaré', 2000.00, 'Assinado', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', 'Inbound', 'Will Responsável', 'contato@tucunare.com', '51999999996', 'Business Plan - Closer: Will', '2025-02-01', now()),
('Boa Promocional', 5400.00, 'Assinado', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', 'Inbound', 'Will Responsável', 'contato@boapromocional.com', '51999999995', 'Pro Plan - Closer: Will', '2025-02-02', now()),
('Versátil', 4900.00, 'Assinado', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', 'Inbound', 'Will Responsável', 'contato@versatil.com', '51999999994', 'Pro Plan - Closer: Will', '2025-02-03', now()),
('Uni Ftec', 19810.00, 'Assinado', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', 'Indicacao', 'Will Responsável', 'contato@uniftec.com', '51999999993', 'Conceito Plan - Closer: Will', '2025-05-01', now()),
('Mazola', 17500.00, 'Assinado', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', '9ad8dd04-8a9b-4823-a9f1-f4fff07c4868', 'Inbound', 'Will Responsável', 'contato@mazola.com', '51999999992', 'Business Plan - Closer: Will', '2025-05-08', now());

-- Insert sample team goals
INSERT INTO public.team_goals (team_type, month, year, goal_value, reward_value) 
VALUES 
('closer', 1, 2025, 50000.00, 2000.00),  -- February 2025
('sdr', 1, 2025, 5000.00, 500.00),       -- February 2025
('closer', 4, 2025, 60000.00, 3000.00),  -- May 2025  
('sdr', 4, 2025, 6000.00, 600.00);       -- May 2025