

## Sincronizar aba Squads com dados da aba Clientes

### Problema

A aba **Squads** faz sua própria query ao Supabase (`csm_cards`) e aplica lógica de filtragem diferente da aba **Clientes**. A aba Clientes usa snapshots de fee e squad (`csm_project_snapshots`) para sobrescrever valores por mês, e faz merge com CRM ops por `display_id`. A aba Squads ignora tudo isso, resultando em contagens e valores divergentes.

### Solução

Extrair a lógica de fetch e processamento de dados para um hook compartilhado, e fazer o SquadsDashboard consumir os mesmos dados já processados da aba Clientes.

### Implementação

**1. Criar hook `src/hooks/useProjetosData.ts`**

Extrair de `GestaoProjetosOperacao.tsx`:
- Fetch de `csm_cards` (CSM + CRM Ops)
- Fetch de `csm_project_snapshots` (fee + squad overrides)
- Lógica de merge (`liveData`)
- Funções `wasRelevantInMonth`, `isChurnedInMonth`, `isActiveInMonth`

O hook recebe `selectedPeriod` e retorna `{ liveData, rawCsmRows, rawCrmRows, loading, refetch }`.

**2. Atualizar `ProjetosView.tsx`**

- Usar o hook no nível do ProjetosView
- Passar `liveData`, `selectedPeriod`, e as funções de filtragem como props para ambas as abas

**3. Atualizar `GestaoProjetosOperacao.tsx`**

- Receber dados via props em vez de buscar internamente
- Manter toda a lógica de UI (sort, search, filters, export)

**4. Atualizar `SquadsDashboard.tsx`**

- Receber `liveData` e `selectedPeriod` via props
- Remover fetch próprio e usar os dados já processados
- Agrupar por squad usando os mesmos dados filtrados da aba Clientes
- A contagem `baseNovosChurn` usará `wasRelevantInMonth` com a mesma lógica

### Resultado

Ao selecionar Fevereiro na aba Squads, o Apollo mostrará exatamente os mesmos clientes e valores que aparecem filtrados por Apollo na aba Clientes.

