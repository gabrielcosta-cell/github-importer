

## Ajustar receita de "Venda Ops" para CRM ao invés de MRR

### Problema atual

Linhas com origem "Venda Ops" (source === 'crm-ops') têm seu valor em `monthly_revenue`, que é somado no `totalMRR`. O correto é que apenas linhas CSM contribuam para MRR, e linhas CRM Ops contribuam para CRM.

### Alteração em `src/components/GestaoProjetosOperacao.tsx`

**1. Linha 491 — `totalMRR`**: Filtrar para considerar apenas `source !== 'crm-ops'`:
```ts
const totalMRR = useMemo(() => displayData
  .filter(p => p.source !== 'crm-ops')
  .reduce((sum, p) => sum + (p.monthly_revenue || 0), 0), [displayData])
```

**2. Linha 492 — `totalCRM`**: Incluir o `monthly_revenue` das linhas crm-ops (que são cards independentes sem match CSM):
```ts
const totalCRM = useMemo(() => displayData.reduce((sum, p) => 
  sum + (p.crm_revenue || 0) + (p.source === 'crm-ops' ? (p.monthly_revenue || 0) : 0), 0), [displayData])
```

**3. Coluna "Total" por linha** — Atualizar o accessor `total_revenue` (~linha 214) para não duplicar: quando `source === 'crm-ops'`, o `monthly_revenue` já conta como CRM, então o total continua sendo a soma de tudo sem mudança (já soma `monthly_revenue + crm_revenue + var_midia + var_vendas`). Nenhuma alteração necessária aqui pois o total por linha permanece correto.

**4. Coluna "Fee (MRR)" por linha** (~linha 697): Na célula que exibe `monthly_revenue`, para linhas crm-ops, exibir `—` ou `R$ 0,00` ao invés do valor (já que esse valor é CRM, não MRR). Alternativamente, exibir o valor na coluna "Vendas CRM" ao invés:
- Para linhas `source === 'crm-ops'`: exibir `monthly_revenue` na coluna Vendas CRM e `R$ 0,00` em Fee (MRR)

Isso garante consistência visual com os totais do header.

