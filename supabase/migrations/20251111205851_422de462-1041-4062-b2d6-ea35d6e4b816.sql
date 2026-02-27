-- Adicionar módulos que estão no menu lateral mas não existem no banco

-- Módulo de Performance
INSERT INTO modules (name, display_name, description, icon, is_active)
VALUES ('performance', 'Performance', 'Métricas e indicadores de performance', 'Activity', true)
ON CONFLICT (name) DO NOTHING;

-- Módulo CS (Customer Success)
INSERT INTO modules (name, display_name, description, icon, is_active)
VALUES ('cs', 'Customer Success', 'Gestão de sucesso do cliente', 'Users', true)
ON CONFLICT (name) DO NOTHING;

-- Submódulos de CS
INSERT INTO modules (name, display_name, description, icon, is_active)
VALUES 
  ('churn', 'Churn', 'Métricas e análise de churn', 'TrendingDown', true),
  ('metricas_financeiras', 'Métricas Financeiras', 'Indicadores financeiros', 'DollarSign', true),
  ('nps', 'NPS', 'Net Promoter Score', 'Heart', true)
ON CONFLICT (name) DO NOTHING;

-- Módulo de Criação (menu pai)
INSERT INTO modules (name, display_name, description, icon, is_active)
VALUES ('criacao', 'Criação', 'Ferramentas de criação de conteúdo', 'Sparkles', true)
ON CONFLICT (name) DO NOTHING;