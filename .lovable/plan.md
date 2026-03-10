

## Criar página "Pipelines" e página "Dashboards"

### Visão geral

1. **Página Pipelines** (`?view=pipelines`): Abaixo de CRM Ops na sidebar. Contém os 3 pipelines (Churn, CSAT, NPS) como tabs, abrindo no Churn por padrão. Header idêntico ao CSM (busca, contagem de cards sem MRR, ordenar, filtros, adicionar card, data). Visualização exclusiva em Kanban. Cada pipeline reutiliza a lógica existente de `GestaoCancelamentos`, `GestaoCSAT` e `GestaoNPS`.

2. **Página Dashboards** (`?view=dashboards`): Centraliza os 3 dashboards (Churn, NPS, CSAT) com tabs para alternar entre eles. Renderiza `ChurnMetrics`, `CustomerSuccessDashboard` e `CSATMetricsDashboard`.

3. **Automação Churn**: Quando um card CSM é marcado como churn no `CardDetailsDialog`, criar automaticamente uma cópia do card na tabela `cancellation_requests` com stage `nova` (Novas Solicitações).

### Arquivos a criar

**1. `src/pages/Pipelines.tsx`**
- Tabs: **Churn** (padrão) | **CSAT** | **NPS**
- Layout full-height como CSM/CRM Ops
- Header padronizado: `[SidebarTrigger] [Busca] [Count cards] [Ordenar] [Filtros] [+ Adicionar Card] [Data]`
- Sem MRR no contador (apenas quantidade de cards)
- Cada tab renderiza seu kanban:
  - **Churn**: Reutiliza a lógica de `GestaoCancelamentos` (stages `CANCELLATION_STAGES`, dados de `cancellation_requests`, drag-and-drop)
  - **CSAT**: Reutiliza a lógica de `GestaoCSAT` (stages `CSAT_STAGES`, dados de `csat_responses`, colunas por nota)
  - **NPS**: Reutiliza a lógica de `GestaoNPS` (stages `NPS_STAGES`, dados de `nps_responses`, colunas por recomendação)
- Botão "+ Adicionar Card" abre dialog com o formulário específico de cada pipeline:
  - Churn: formulário de solicitação de cancelamento (campos de `SolicitacaoCancelamento`)
  - CSAT: formulário CSAT (campos de `FormCSAT`)
  - NPS: formulário NPS (campos de `FormNPS`)

**2. `src/pages/Dashboards.tsx`**
- Tabs: **Churn** | **NPS** | **CSAT**
- Cada tab renderiza o componente de dashboard existente:
  - Churn → `ChurnMetrics`
  - NPS → `CustomerSuccessDashboard`
  - CSAT → `CSATMetricsDashboard`

### Arquivos a modificar

**3. `src/components/app-sidebar.tsx`**
- Substituir o botão "Insights" por **"Pipelines"** (ícone `Columns3` ou `LayoutGrid`) -- view `'pipelines'`
- Adicionar botão **"Dashboards"** (ícone `BarChart2`) -- view `'dashboards'`
- Posicionar ambos abaixo de CRM Ops, antes da seção CS

**4. `src/pages/Index.tsx`**
- Substituir `'insights'` por `'pipelines'` e adicionar `'dashboards'` em `ActiveViewType` e `VALID_VIEWS`
- Mapear ambos ao módulo `'cs'` nos `moduleMap`
- Renderizar `Pipelines` e `Dashboards` full-height (como CSM/CRM Ops)
- Remover import e referências ao antigo `Insights`

**5. `src/components/kanban/CardDetailsDialog.tsx`**
- No `handleConfirmLost` (quando `isCSMPipeline`), após marcar churn, inserir uma nova `cancellation_request` com os dados do card CSM (empresa, motivo, etc.) no stage `nova` para aparecer automaticamente no pipeline de Churn

**6. `src/App.tsx`**
- Limpar import do `Insights` se necessário

### Estrutura do header (padronizado)

```text
[≡] [🔍 Buscar...] | [42 cards] [↕ Ordenar] [🔽 Filtros] [+ Adicionar Card] [📅 Data]
```

### Automação CSM → Churn

Quando um card CSM é marcado como churn em `CardDetailsDialog.handleConfirmLost`:
1. Marca o card como `churn: true, client_status: 'cancelado'` (já existe)
2. **Novo**: Insere em `cancellation_requests` com `stage: 'nova'`, copiando `client_name`, `contract_name`, `reason` (motivo_perda), `observations` (comentarios_perda), `card_id`, `submitted_by`

