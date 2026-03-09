

## Filtrar squads sem clientes no mês selecionado

### Alteração

**Arquivo: `src/components/SquadsDashboard.tsx`**

No `useMemo` de `squadMetrics`, após calcular as métricas de cada squad, filtrar para remover squads que não têm nenhum cliente relevante no mês (`baseNovosChurn === 0` e sem cards CRM):

```ts
// Linha ~135: após o .map(), adicionar .filter()
const metrics: SquadMetrics[] = squadNames.map(squad => {
  // ... cálculos existentes ...
}).filter(m => m.baseNovosChurn > 0 || m.mrrVendidoOperacao > 0 || m.comissoes > 0)
```

Isso garante que Apollo apareça nos meses anteriores a março (quando ainda tinha clientes) mas não apareça em março em diante (quando não tem mais nenhum cliente atribuído).

