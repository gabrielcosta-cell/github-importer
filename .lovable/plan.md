
## Filtro de Mes de Cancelamento para Clientes Cancelados

### Objetivo
Adicionar um seletor de mes/ano que aparece apenas quando o filtro "Clientes Cancelados" esta ativo, permitindo filtrar cards pela `data_perda` (data de cancelamento) em um mes especifico.

### Como vai funcionar
- Quando o usuario seleciona "Clientes Cancelados" no dropdown de status, um seletor de mes/ano aparece ao lado dos filtros existentes
- O seletor usa o componente `MonthYearPicker` ja existente no projeto, configurado em modo `singleSelect`
- O filtro compara o campo `data_perda` do card com o mes/ano selecionado
- Meses disponiveis: todos de 2025 em diante (sem limite superior, funciona para meses futuros)
- Quando nenhum mes esta selecionado, mostra todos os cancelados (comportamento atual)

### Alteracoes tecnicas

**1. `src/components/CSMKanban.tsx`**
- Adicionar estado `selectedChurnMonth` do tipo `{ month: number; year: number }[]` (array para compatibilidade com MonthYearPicker, mas singleSelect=true)
- Na logica de `filteredCardsData`, quando `viewFilter === 'cancelado'` e ha um mes selecionado, filtrar cards cuja `data_perda` esteja dentro do mes/ano escolhido
- Renderizar o `MonthYearPicker` ao lado do dropdown de status, visivel apenas quando `viewFilter === 'cancelado'`
- Incluir o filtro de mes na funcao `handleClearFilters`
- Adicionar `selectedChurnMonth` nas dependencias do `useMemo`

**2. Logica de filtragem**
- Extrair ano e mes da `data_perda` do card (formato `YYYY-MM-DD`)
- Comparar com o mes/ano selecionado no picker
- Cards sem `data_perda` nao aparecem quando o filtro de mes esta ativo
