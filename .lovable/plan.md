

## Corrigir Revenue Churn % total para média simples dos squads

### Problema
Linha 241 calcula `t.revenueChurn / t.mrrBase * 100` (média ponderada = 7.2%).  
O esperado é média simples: `(22.62% + 0% + 0%) / 3 = 7.54%`.

### Mudança

**Arquivo: `src/components/SquadsDashboard.tsx`** — linha 241:

```ts
// De:
t.revenueChurnPercent = t.mrrBase > 0 ? (t.revenueChurn / t.mrrBase) * 100 : 0

// Para:
t.revenueChurnPercent = squadMetrics.reduce((s, m) => s + m.revenueChurnPercent, 0) / count
```

Isso alinha com a mesma lógica já usada para `logoChurnPercent`, `ltMedio`, `tmChurn` e `mpa`.

