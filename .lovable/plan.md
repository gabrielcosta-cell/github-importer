

## Ocultar botão "Importar Cancelados" e adicionar MonthYearPicker nos filtros Ativos/Todos

### O que muda

1. **Remover o botão "Importar Cancelados"** — o bloco que renderiza o botão (linhas 1095-1112 do CSMKanban.tsx) será removido.

2. **Mostrar MonthYearPicker em todos os filtros de cliente** — atualmente o picker só aparece no filtro "Clientes Cancelados". Ele passará a aparecer também em "Clientes Ativos" e "Todos os Clientes", com lógica de filtragem diferente:
   - **Cancelados**: filtra por `data_perda` no mês selecionado (comportamento atual, mantido)
   - **Ativos**: filtra cards que estavam ativos naquele mês — ou seja, `data_inicio <= fim do mês` E (`data_perda` é null OU `data_perda > início do mês`)
   - **Todos**: combina ambas as lógicas — mostra cards que tinham alguma relação com aquele mês (ativos durante ou cancelados naquele mês)

### Arquivo alterado

**`src/components/CSMKanban.tsx`**

- Remover o bloco do botão "Importar Cancelados" (linhas 1095-1112)
- Alterar a condição `{viewFilter === 'cancelado' && (` do MonthYearPicker para `{(viewFilter === 'ativo' || viewFilter === 'todos' || viewFilter === 'cancelado') && (` — ou simplesmente renderizar sempre
- Atualizar a lógica `matchesChurnMonth` no `filteredCardsData` para considerar o `viewFilter`:
  - Se `cancelado`: mantém lógica atual (filtra por `data_perda`)
  - Se `ativo` ou `todos`: filtra cards que estavam ativos no mês selecionado usando `data_inicio` e `data_perda`
- Opcionalmente remover o import de `importCancelledClients` se não for mais usado em nenhum lugar

