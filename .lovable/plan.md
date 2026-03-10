

## Centralizar CSAT e NPS em uma página "Insights"

### Visão geral

Criar uma nova página Insights acessível via sidebar que unifica os pipelines de CSAT e NPS com tabs para alternar. Cada pipeline terá duas sub-views: **Dashboard** (componentes existentes) e **Pipeline** (kanban existente). Botão de adicionar card abre formulário em dialog central.

### Arquivos a criar

**1. `src/pages/Insights.tsx`**
- Tabs principais: **CSAT** | **NPS**
- Dentro de cada tab, sub-tabs: **Dashboard** | **Pipeline**
- Sub-tab Dashboard renderiza `CSATMetricsDashboard` ou `CustomerSuccessDashboard` diretamente
- Sub-tab Pipeline renderiza o conteúdo kanban extraído de `GestaoCSAT` / `GestaoNPS` (importa os componentes existentes inline)
- Header padronizado da toolbar: Busca | Contagem | Ordenar | Filtros | **+ Adicionar** | Data
- Botão "+ Adicionar" abre Dialog central com formulário:
  - **CSAT**: campos empresa, responsável, telefone, tipo_reuniao, nota_atendimento, nota_conteudo, nota_performance, recomendação, observações → insere em `csat_responses`
  - **NPS**: campos empresa, responsável, email, cnpj, recomendação (1-10), sentimento, observações → insere em `nps_responses`

### Arquivos a modificar

**2. `src/components/app-sidebar.tsx`**
- Adicionar item "Insights" (ícone `BarChart2` ou `Activity`) na seção CS, acima dos submenus individuais de CSAT/NPS
- View: `'insights'`
- Remover "Pipeline" dos submenus CSAT e NPS (dashboard e formulário permanecem)

**3. `src/pages/Index.tsx`**
- Adicionar `'insights'` a `ActiveViewType` e `VALID_VIEWS`
- Mapear `'insights'` → módulo `'cs'` nos dois `moduleMap`
- No `renderContent` switch: `case 'insights': return <Insights />`
- Importar `Insights` com lazy loading

**4. `src/App.tsx`**
- Nenhuma mudança necessária (Insights vive dentro do dashboard via view param, não precisa de rota própria)

### Estrutura visual

```text
┌─────────────────────────────────────────────┐
│  [CSAT]  [NPS]           ← tabs principais  │
├─────────────────────────────────────────────┤
│  [Dashboard] [Pipeline]  ← sub-tabs         │
├─────────────────────────────────────────────┤
│  [🔍] [42 resp] [↕] [🔽] [+ Add] [📅]     │
│  ← toolbar (só na sub-tab Pipeline)         │
├─────────────────────────────────────────────┤
│  Kanban ou Dashboard content                │
└─────────────────────────────────────────────┘
```

### Detalhes do formulário de adição (Dialog)

Reutiliza os mesmos campos que já existem nos formulários FormCSAT e FormNPS, mas em formato dialog compacto no centro da tela. Após salvar, recarrega os dados do pipeline.

### Estimativa

~600-800 linhas para `Insights.tsx` (reaproveita toda a lógica de dados/filtros/cards de GestaoCSAT e GestaoNPS). Alterações menores no sidebar (~20 linhas) e Index (~10 linhas).

