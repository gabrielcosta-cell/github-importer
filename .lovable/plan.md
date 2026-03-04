

## Plano: Padronizar display_id entre CSM e CRM

### Problema
Hoje, cards do CRM Ops não compartilham o `display_id` do card CSM correspondente. Para o merge funcionar por ID (mais confiável que nome), precisamos que cards CRM que correspondem a um cliente CSM tenham o mesmo `display_id`.

### Abordagem

**1. Script SQL (via insert tool) para atualizar display_id dos cards CRM existentes**

Executar um UPDATE que cruza cards CRM Ops com cards CSM pelo `company_name` normalizado (lower/trim) e copia o `display_id` do CSM para o CRM:

```sql
UPDATE csm_cards crm
SET display_id = csm.display_id
FROM csm_cards csm
WHERE csm.pipeline_id = '749ccdc2-5127-41a1-997b-3dcb47979555'  -- Clientes Ativos
  AND crm.pipeline_id != '749ccdc2-5127-41a1-997b-3dcb47979555'
  AND crm.monthly_revenue > 0
  AND LOWER(TRIM(crm.company_name)) = LOWER(TRIM(csm.company_name))
  AND csm.display_id IS NOT NULL;
```

**2. Atualizar Edge Function `migrate-recurring-cards`**

Quando a função cria um card CSM a partir de um card CRM recorrente, o novo card CSM já recebe um `display_id` via sequence. Precisamos fazer o inverso: copiar esse `display_id` de volta para o card CRM original. Adicionar um UPDATE no card CRM após a criação do card CSM, setando `display_id = newCard.display_id`.

**3. Atualizar a lógica de merge na aba Projetos (`GestaoProjetosOperacao.tsx`)**

Após a padronização, o merge pode ser feito por `display_id` em vez de `company_name`, garantindo correspondência exata mesmo com diferenças de nome.

### Arquivos afetados
- `supabase/functions/migrate-recurring-cards/index.ts` — copiar display_id para card CRM após migração
- `src/components/GestaoProjetosOperacao.tsx` — merge por display_id
- SQL de dados (via insert tool) — atualizar display_id dos cards CRM existentes

