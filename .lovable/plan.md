

## Plano: Nova logica de Churn no CSM com campo Status

### Resumo

Atualmente, quando um cliente e marcado como "churn", o card e movido para um pipeline separado ("Clientes Perdidos"). A nova logica unifica tudo em um unico pipeline, usando um campo `status` ("Ativo" / "Cancelado") no card para controlar a visualizacao. O seletor de pipeline passara a funcionar como um filtro por status.

### Visualizacoes do Funil

O seletor que hoje mostra pipelines diferentes passara a mostrar 3 opcoes de visualizacao, todas sobre o **mesmo pipeline** "Clientes Ativos":

1. **Clientes Ativos** (padrao) - Mostra apenas cards com `status = 'ativo'`
2. **Todos os Clientes** - Mostra cards com qualquer status
3. **Clientes Cancelados** - Mostra apenas cards com `status = 'cancelado'`

### Mudancas Detalhadas

#### 1. Migracao de banco de dados
- Adicionar coluna `client_status` na tabela `csm_cards` com valor padrao `'ativo'`
- Atualizar cards existentes que estejam com `churn = true` para `client_status = 'cancelado'`
- Atualizar todos os demais cards para `client_status = 'ativo'`

#### 2. Tipo CSMCard (`src/types/kanban.ts`)
- Adicionar campo `client_status?: 'ativo' | 'cancelado'`

#### 3. Campo Status na aba Resumo (`src/components/kanban/CardDetailsDialog.tsx`)
- Adicionar um campo "Status" na secao Resumo mostrando badge "Ativo" (verde) ou "Cancelado" (vermelho)
- O campo sera somente leitura - o usuario nao pode alterar manualmente
- Quando o botao "Churn" for clicado, alem da logica existente, o campo `client_status` sera atualizado para `'cancelado'`
- O card **permanece no mesmo pipeline** (nao sera mais movido para "Clientes Perdidos")

#### 4. Logica de Churn atualizada (`src/components/kanban/CardDetailsDialog.tsx`)
- Modificar `handleConfirmLost` para que, no contexto CSM:
  - Atualize `client_status` para `'cancelado'` no card
  - **Nao mova** o card para outro pipeline
  - Mantenha o registro de historico e atividade

#### 5. Seletor de visualizacao no CSMKanban (`src/components/CSMKanban.tsx`)
- Substituir o `PipelineSelector` (para o contexto CSM) por um seletor de visualizacao com 3 opcoes: "Clientes Ativos", "Todos os Clientes", "Clientes Cancelados"
- Adicionar estado `viewFilter` com valores `'ativo' | 'todos' | 'cancelado'`
- No `filteredCardsData`, adicionar filtro por `client_status` baseado na visualizacao selecionada
- A query `fetchCards` continuara trazendo todos os cards do pipeline "Clientes Ativos"; o filtro sera aplicado no frontend

#### 6. Botao de Reabrir cliente
- Para cards com status "Cancelado", permitir reabrir (mudar `client_status` de volta para `'ativo'`, limpar campos de perda)

### Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| Nova migracao SQL | Adicionar coluna `client_status` |
| `src/types/kanban.ts` | Adicionar campo `client_status` |
| `src/components/kanban/CardDetailsDialog.tsx` | Campo status no resumo + logica churn atualizada |
| `src/components/CSMKanban.tsx` | Seletor de visualizacao ao inves de pipeline selector |

