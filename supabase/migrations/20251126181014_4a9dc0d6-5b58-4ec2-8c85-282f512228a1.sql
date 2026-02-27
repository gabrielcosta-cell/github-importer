-- Configurar permissões padrão para role "CS"
-- Garantir acesso completo a todos os módulos relacionados à aba CS e Projetos

-- Role CS: f276edc3-a5bf-4d00-bc9f-5badb04613bf
-- Módulos CS: cs, csm, churn
-- Módulos Projetos: projetos, gestao_projetos, metricas_financeiras, performance, nps

-- Inserir/atualizar permissões para role CS
INSERT INTO public.role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
VALUES
  -- Módulos da aba CS
  ('f276edc3-a5bf-4d00-bc9f-5badb04613bf', '54a0c12c-6c30-4218-ae89-c8376e92bfaa', true, true, true, true), -- cs (Customer Success)
  ('f276edc3-a5bf-4d00-bc9f-5badb04613bf', 'c2497164-7967-4825-a51e-f8cc6e135784', true, true, true, true), -- csm (CSM - Quadro de Gestão)
  ('f276edc3-a5bf-4d00-bc9f-5badb04613bf', 'bf383cfc-869f-4696-8dc0-2d6c12353910', true, true, true, true), -- churn
  
  -- Módulos da aba Projetos
  ('f276edc3-a5bf-4d00-bc9f-5badb04613bf', '6db200bb-e064-488b-bf87-e2294185d861', true, true, true, true), -- projetos (Lista de espera)
  ('f276edc3-a5bf-4d00-bc9f-5badb04613bf', 'dd365dbd-89b4-45bd-b79a-ffd49d36cbe5', true, true, true, true), -- metricas_financeiras
  ('f276edc3-a5bf-4d00-bc9f-5badb04613bf', '85a1cd83-4213-4d4d-b35c-a854ea6c72a7', true, true, true, true), -- performance
  ('f276edc3-a5bf-4d00-bc9f-5badb04613bf', 'e526d30c-4839-46d4-ad16-884992a440b1', true, true, true, true)  -- nps
ON CONFLICT (role_id, module_id) 
DO UPDATE SET 
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- Inserir/atualizar permissões para role "Head de Projetos"
-- Role Head de Projetos: 04554102-fc2b-41c1-aae2-f534a53b5099

INSERT INTO public.role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
VALUES
  -- Módulos da aba CS (adicionar csm que faltava)
  ('04554102-fc2b-41c1-aae2-f534a53b5099', 'c2497164-7967-4825-a51e-f8cc6e135784', true, true, true, true), -- csm (CSM - Quadro de Gestão)
  
  -- Módulos da aba Projetos (atualizar projetos que estava sem acesso)
  ('04554102-fc2b-41c1-aae2-f534a53b5099', '6db200bb-e064-488b-bf87-e2294185d861', true, true, true, true)  -- projetos (Lista de espera)
ON CONFLICT (role_id, module_id) 
DO UPDATE SET 
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;