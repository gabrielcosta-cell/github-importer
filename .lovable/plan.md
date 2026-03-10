

## Contabilizar vendas de CrossSell e Upsell na planilha de Projetos

### Problema identificado

Há uma inconsistência na função `wasRelevantInMonth` em `useProjetosData.ts`. Para cards CRM Ops (incluindo Upsell e CrossSell), ela usa apenas `created_at` para determinar se o card pertence ao mês selecionado. Porém, a lógica de merge (`isInMonth`) usa `data_ganho || created_at`. Isso significa que se um card de Upsell ou CrossSell tem `data_ganho` em um mês diferente de `created_at`, ele não aparece no mês correto na tabela.

Além disso, os cards standalone de CRM (sem `display_id` correspondente no CSM) precisam usar `data_ganho` como data de referência.

### Alterações

**1. `src/hooks/useProjetosData.ts` — `wasRelevantInMonth`** (linhas 230-234)
- Usar `data_ganho || created_at` em vez de apenas `created_at` para cards crm-ops, consistente com a lógica de merge.

**2. `src/hooks/useProjetosData.ts` — campo `data_ganho` no ProjetoRow**
- Garantir que `data_ganho` é acessível na função. O tipo `ProjetoRow` já inclui `data_ganho?: string`.

### Resultado
- Cards de Upsell e CrossSell aparecerão no mês correto (data de ganho, não apenas data de criação).
- A contabilização na tabela e nos totais do header será consistente.

