

## Adicionar coluna "MRR da Base" na aba Squads

A métrica `mrrBase` já é calculada internamente (linha 78-80) usando `relevantCsm` (ativos + churned do mês) filtrado por categoria MRR Recorrente. Ela já é somada nos totais. Só falta expô-la como coluna visível na tabela.

### Alterações em `src/components/SquadsDashboard.tsx`

1. **Adicionar coluna na definição** (após `baseNovosChurn`, antes de `mrrRecorrente`):
   - `{ key: 'mrrBase', label: 'MRR da Base', currency: true }`

2. **Garantir que `mrrBase` é somado nos totals** — já está sendo somado (linha 136).

Nenhuma lógica nova necessária — apenas expor um campo já calculado.

