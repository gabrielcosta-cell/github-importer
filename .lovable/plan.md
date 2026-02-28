

## Correção de referências residuais CRM para CSM

### Problema identificado
O sistema carrega dados corretamente das tabelas `csm_*`, mas a lista de perfis (usuarios) retorna vazia porque o `AuthContext.tsx` filtra por `project_scope IN ('crm', 'both')` -- e o scope foi atualizado para `'csm'` no banco.

### Arquivos a corrigir

#### 1. AuthContext.tsx (CRITICO)
- Trocar tipo `project_scope` de `'crm' | 'cs' | 'both'` para `'csm' | 'cs' | 'both'`
- Trocar filtro `.in('project_scope', ['crm', 'both'])` para `['csm', 'both']`
- Trocar valor default `project_scope: 'crm'` para `'csm'` na criacao de usuarios

#### 2. CardDetailsDialog.tsx
- Trocar `moduleType` default de `'crm'` para `'csm'`
- Atualizar referencia no tipo da prop `'crm' | 'csm'` -> remover `'crm'`
- Remover comentarios "Para CRM:" e "pipelines CRM"

#### 3. UserPermissions.tsx
- Trocar modulo `{ name: 'crm', displayName: 'CRM' }` para `{ name: 'csm', displayName: 'CSM' }`

#### 4. Storage bucket references (4 arquivos)
- `ActivityAttachments.tsx` e `AttachmentsManager.tsx` usam bucket `'crm-card-attachments'`
- O bucket no Supabase ainda se chama `crm-card-attachments`, entao manter como esta (bucket nao foi renomeado)

#### 5. AnaliseBench.tsx
- Renomear variavel `crmClients` para `csmClients`
- Renomear funcao `fetchCRMClients` para `fetchCSMClients`
- Atualizar comentario "Buscar clientes do CRM"

#### 6. SecurityAuditLogs.tsx
- Trocar label `'crm_cards': 'Cards CRM'` para `'csm_cards': 'Cards CSM'`

#### 7. PipelineOrderManager.tsx
- Trocar texto `'| CRM'` para `'| CSM'`

#### 8. ChurnMetrics.tsx
- Atualizar comentario "nao CRM (leads)" para "nao leads"

### Detalhes tecnicos

- **AuthContext.tsx**: Linhas 19, 95, 108, 136, 221, 234, 264, 294 -- todas com tipo ou valor `crm`
- **CardDetailsDialog.tsx**: Linhas 48, 58, 246, 316 -- tipo da prop e default
- **UserPermissions.tsx**: Linha 69 -- nome do modulo
- **Buckets de storage**: NAO renomear -- o bucket `crm-card-attachments` continua existindo no Supabase com esse nome
- Total: ~8 arquivos para corrigir

