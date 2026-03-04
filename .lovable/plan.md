

## Analise de Alturas - Toolbar CSM e CRM

### Inconsistencias Encontradas

| Elemento | Altura Atual | Arquivo |
|---|---|---|
| Campo de busca (DesktopGlobalSearch) | `py-1` + `h-8` interno = ~34px | MobileGlobalSearch.tsx (linha 334, 337) |
| Botao Ordenar | `h-8` (32px) | CSMKanban.tsx:965, CRMOpsKanban.tsx:273 |
| Botao Filtros (CSM FilterPopover) | `size="sm"` = `min-h-9` (36px) | FilterPopover.tsx:85 |
| Botao Filtros (CRM CRMOpsDateFilter) | `h-8` (32px) | CRMOpsDateFilter.tsx:51 |
| Botao Adicionar cliente/lead | `h-8` (32px) | CSMKanban.tsx:1020, CRMOpsKanban.tsx:303 |
| Botao Configuracoes (engrenagem) | `h-8 w-8` (32px) | CSMKanban.tsx:1031, CRMOpsKanban.tsx:314 |
| Botao Limpar Filtros (X) CSM | `h-9 w-9` (36px) | CSMKanban.tsx:1007 |
| Pipeline Selector (CRM) | `h-9` (36px) | CRMOpsKanban.tsx:361 |

### Problema

Existem 3 alturas diferentes misturadas: `h-8` (32px), `h-9` (36px), e o campo de busca com altura variavel. Isso cria desalinhamento visual.

### Plano de Correcao

Padronizar todos os elementos do toolbar para **`h-9`** (36px), que e a altura padrao do design system (`size="sm"` = `min-h-9`).

**Arquivos a alterar:**

1. **`src/components/kanban/MobileGlobalSearch.tsx`** (linha 334, 337)
   - Alterar o botao trigger do search para ter altura `h-9`
   - Mudar `py-1` para `py-1.5` e `h-8` para `h-9` no span interno

2. **`src/components/CRMOpsKanban.tsx`**
   - Botao Ordenar: `h-8` → `h-9` (linha 273)
   - Botao Adicionar lead: `h-8` → `h-9` (linha 303)
   - Botao Configuracoes: `h-8 w-8` → `h-9 w-9` (linha 314)

3. **`src/components/CSMKanban.tsx`**
   - Botao Ordenar: `h-8` → `h-9` (linha 965)
   - Botao Adicionar cliente: `h-8` → `h-9` (linha 1020)
   - Botao Configuracoes: `h-8 w-8` → `h-9 w-9` (linha 1031)

4. **`src/components/crm-ops/CRMOpsDateFilter.tsx`**
   - Botao Filtros: `h-8` → `h-9` (linha 51)

O `FilterPopover` do CSM e o botao Limpar Filtros ja estao em `h-9`, entao nao precisam de ajuste. O Pipeline Selector do CRM tambem ja esta em `h-9`.

