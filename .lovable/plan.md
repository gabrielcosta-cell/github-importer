

## Corrigir categorias nulas e ajustar filtros de cálculo

### Problema
Cards com `categoria: null` não são contabilizados nos cálculos de MRR Base e Revenue Churn, gerando percentuais incorretos (ex: Apollo com 0% mesmo tendo R$26.900 em perdas).

### Solução em duas frentes

**1. Dados — Atualizar cards com categoria nula no banco**

Executar UPDATE via SQL para definir `categoria = 'MRR Recorrente'` em todos os cards do pipeline de clientes ativos que possuem `categoria IS NULL`:

```sql
UPDATE csm_cards
SET categoria = 'MRR Recorrente'
WHERE categoria IS NULL
  AND pipeline_id = '749ccdc2-5127-41a1-997b-3dcb47979555';
```

**2. Código — Proteção contra futuros nulls**

Ajustar os filtros nos dois dashboards para tratar `null` como "MRR Recorrente":

- **`src/components/FinancialMetrics.tsx`** (~linha 85): Adicionar `!c.categoria ||` ao filtro de `recorrentes`
- **`src/components/SquadsDashboard.tsx`** (linhas ~149, ~153): Adicionar `!r.categoria ||` aos filtros de `mrrRecorrente`, `mrrBase` e `mrrFinal`
- **`src/components/GestaoProjetosOperacao.tsx`** (linhas ~504-505): Adicionar `!p.categoria ||` aos filtros de `mrrRecorrente` e `mrrRecorrenteCount`

Isso garante que mesmo que novos cards sejam criados sem categoria, eles serão contabilizados corretamente em todos os dashboards.

