

## Correção: Receita CRM só no mês de criação do card

### Problema
No `useEffect` de fetch (linhas 296-307), **todos** os cards CRM são mergeados no CSM correspondente de uma vez só, somando `crm_revenue` permanentemente. Quando o usuário muda o mês, a receita CRM continua lá porque já foi "grudada" no objeto CSM.

### Solução em `src/components/GestaoProjetosOperacao.tsx`

1. **Separar estado bruto** — trocar o `liveData` por dois estados:
   - `rawCsmRows: ProjetoRow[]` — cards do pipeline Clientes Ativos
   - `rawCrmRows: ProjetoRow[]` — cards dos pipelines CRM Ops (matched + unmatched)

2. **Remover o merge do useEffect** (linhas 290-309) — simplesmente salvar os dois arrays separados.

3. **Criar `liveData` como `useMemo`** que depende de `rawCsmRows`, `rawCrmRows` e `selectedPeriod`:
   - Para cada CSM row, procurar CRM cards com mesmo `display_id` **cuja `created_at` caia no mês selecionado**
   - Só acumular `crm_revenue` quando o mês bater
   - CRM cards sem match continuam como rows independentes (filtrados por `wasRelevantInMonth` como já acontece)

4. **Nenhuma outra mudança** — `displayData`, `totalMRR`, `totalCRM`, `totalGeral` e o restante continuam funcionando normalmente pois dependem de `liveData`.

### Resultado
- Janeiro: `crm_revenue = 0` nos rows CSM (cards CRM criados em fev)
- Fevereiro: `crm_revenue` aparece corretamente
- Março: `crm_revenue = 0` novamente

