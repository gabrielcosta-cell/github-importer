

## Plan: Corrigir cálculo de Revenue Churn % para usar MRR da Base (ativos + churn)

### Problema
O `revenueChurnPercent` na aba Squads divide o MRR perdido pelo MRR dos **ativos apenas** (`mrrRecorrente`), quando deveria dividir pelo MRR da Base (ativos + cancelados do mês = `relevantCsm`).

No `FinancialMetrics.tsx` já está correto — usa `mrrBase` (relevantRecorrentes).

### Mudança

**Arquivo: `src/components/SquadsDashboard.tsx`**

1. Adicionar variável `mrrBase` = MRR Recorrente dos `relevantCsm` (ativos + churn do mês):
```ts
const mrrBase = relevantCsm
  .filter(r => r.categoria === 'MRR Recorrente')
  .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)
```

2. Alterar linha 168:
```ts
// De:
const revenueChurnPercent = mrrRecorrente > 0 ? (revenueChurn / mrrRecorrente) * 100 : 0
// Para:
const revenueChurnPercent = mrrBase > 0 ? (revenueChurn / mrrBase) * 100 : 0
```

3. No cálculo de totais (linha 234), usar soma dos `mrrBase` de cada squad em vez de `mrrRecorrente`:
   - Adicionar `mrrBase` ao `SquadMetrics` interface
   - Somar `t.mrrBase` no loop de totais
   - Usar `t.mrrBase` no cálculo total: `t.revenueChurnPercent = t.mrrBase > 0 ? (t.revenueChurn / t.mrrBase) * 100 : 0`

