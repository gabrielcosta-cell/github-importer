

# Plano: Migrar para Nova Base Supabase e Recriar Estrutura Completa

## Resumo

Atualizar as credenciais nos dois arquivos de conexao e criar todas as tabelas, storage buckets e RLS policies na nova base Supabase vazia (`vkfvqhilrhmuaoopiucb.supabase.co`).

---

## Etapa 1: Atualizar Credenciais

Substituir URL e chave anon em dois arquivos:
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/external-client.ts`

Nova URL: `https://vkfvqhilrhmuaoopiucb.supabase.co`
Nova chave: `sb_publishable_q2_4ll5rcxSCbmTRc-QgEw_Lpod1V2L`

---

## Etapa 2: Criar Tabelas no Supabase

Serao criadas via SQL migrations as seguintes tabelas identificadas no codigo:

### Tabelas Principais (CRM/CSM)
1. **profiles** - Perfis de usuario (user_id, name, email, role, is_active, department, phone, custom_role_id, selected_celebration_id, project_scope, preferred_module, avatar_url)
2. **custom_roles** - Roles customizadas (name, display_name, base_role, is_active)
3. **modules** - Modulos do sistema (name, is_active)
4. **role_module_permissions** - Permissoes por role (role_id, module_id, can_view, can_edit, can_delete)
5. **user_module_permissions** - Permissoes por usuario (user_id, module_id, can_view, can_edit, can_delete)
6. **crm_pipelines** - Funis do CRM (name, description, is_active, position, created_by)
7. **crm_stages** - Etapas dos funis (pipeline_id, name, color, position, is_active)
8. **crm_cards** - Cards do CRM (~50 colunas incluindo dados de contato, metricas, UTM, qualificacao, endereco, tags, briefing)
9. **crm_tags** - Etiquetas (name, color, position, is_active)
10. **crm_card_tags** - Relacao card-tag (card_id, tag_id)
11. **crm_card_emails** - Emails multiplos por card (card_id, email, is_primary)
12. **crm_activities** - Atividades/notas (card_id, activity_type, title, description, created_by, status, is_pinned, parent_activity_id)
13. **crm_activity_attachments** - Anexos de atividades (activity_id, file_name, file_path, file_size, file_type, uploaded_by)
14. **crm_card_stage_history** - Historico de movimentacao (card_id, stage_id, entered_at, exited_at, moved_by, event_type, notes)
15. **crm_card_tasks** - Tarefas do card (card_id, stage_task_id, title, is_completed, completed_at, completed_by)
16. **crm_stage_tasks** - Tarefas configuradas por etapa (stage_id, pipeline_id, title, description, deadline_days, position, is_active)
17. **crm_loss_reasons** - Motivos de perda (name, position, is_active)
18. **crm_card_upsell_history** - Historico de upsells (card_id, upsell_type, upsell_value, upsell_month, upsell_year, payment_type, installments, notes)
19. **crm_card_variable_history** - Historico de variaveis (card_id, variable_type, variable_value, variable_month, variable_year, notes)
20. **crm_card_performance_history** - Historico de performance (card_id, performance_type, performance_value, performance_month, performance_year)
21. **crm_special_lists** - Listas especiais ganhos/perdidos (original_card_id, company_name, list_type, ...)
22. **pipeline_automations** - Automacoes entre funis (source_pipeline_id, trigger_event, target_pipeline_id, is_active, archive_to, require_owner_transfer, target_owner_role)

### Tabelas de Cancelamento
23. **cancellation_requests** - Solicitacoes de cancelamento (responsavel, email, empresa, motivo, observacoes, card_id, status, stage, squad, final_result, etc.)
24. **cancellation_attachments** - Anexos de cancelamento (request_id, file_name, file_path, file_size, file_type, attachment_type, uploaded_by)

### Tabelas NPS/CSAT
25. **nps_responses** - Respostas NPS (empresa, responsavel, email, cnpj, recomendacao, sentimento_sem_dot, observacoes, card_id, squad)
26. **csat_responses** - Respostas CSAT (empresa, responsavel, telefone, email, tipo_reuniao, nota_atendimento, nota_conteudo, nota_performance, recomendacao, observacoes, card_id, squad, nota_po)

### Tabelas de Aprovacao
27. **approval_jobs** - Jobs de aprovacao (title, client_name, responsible_user_id, status, start_date, end_date, created_by, position, share_token, workflow, approval_deadline, description, attached_files)
28. **approval_client_feedback** - Feedback de clientes (job_id, submitted_at, ...)

### Tabelas Auxiliares
29. **contracts** - Contratos (name, squad, acompanhamento, plano, etapa, entrada, servico, assinatura, duracao, tempo_casa, renovacao, mensalidade, valor_contrato, primeiro_pagamento)
30. **projetos_reservados** - Projetos reservados (empresa, ...)
31. **squads** - Squads/equipes (name, color, position, is_active)
32. **celebration_templates** - Templates de celebracao (title, audio_url, is_active, created_by)
33. **system_settings** - Configuracoes do sistema (setting_key, setting_value)
34. **audit_logs** - Logs de auditoria (user_id, accessed_at, ...)
35. **success_cases** - Cases de sucesso (client_id, client_name, cover_image, client_logo, titulo_destaque, is_published, ...)
36. **blog_config** - Configuracao do blog (config_key, config_value)
37. **copy_forms** - Formularios de copy/briefing (created_by, status, ...)
38. **briefing_form_labels** - Labels de formulario de briefing (field_key, ...)
39. **default_briefing_documents** - Documentos padrao de briefing (file_path, is_active)
40. **default_prompts** - Prompts padrao (title, content, is_active)

---

## Etapa 3: Criar Storage Buckets

Os seguintes buckets de armazenamento serao criados:
1. **briefing-documents** - Documentos de briefing
2. **contract-attachments** - Anexos de contratos
3. **contract-documents** - Documentos de contratos
4. **cancellation-attachments** - Anexos de cancelamento
5. **crm-card-attachments** - Anexos de cards/atividades CRM
6. **approval-attachments** - Anexos de aprovacao
7. **celebration-audio** - Audios de celebracao
8. **avatars** - Fotos de perfil
9. **success-cases** - Imagens de cases de sucesso

---

## Etapa 4: Configurar RLS (Row Level Security)

Policies basicas para todas as tabelas:
- Usuarios autenticados podem ler/inserir/atualizar dados
- Admins tem acesso total
- Profiles restrito ao proprio usuario para updates

---

## Detalhes Tecnicos

### Arquivos Modificados
- `src/integrations/supabase/client.ts` (linhas 5-6)
- `src/integrations/supabase/external-client.ts` (linhas 6-7)

### SQL Migrations
Serao criadas multiplas migrations SQL para criar todas as 40 tabelas com suas colunas, tipos, defaults, foreign keys, e indexes necessarios. Cada migration sera executada na nova base.

### Observacoes Importantes
- Os dados existentes NAO serao migrados - apenas a estrutura
- Sera necessario criar pelo menos 1 usuario admin na nova base para poder acessar o sistema
- Edge Functions (create-user, validate-handoff-token, etc.) precisam ser redeployadas manualmente no novo projeto Supabase - isso nao pode ser feito via codigo
- A autenticacao sera resetada - todos os usuarios precisarao ser recriados

