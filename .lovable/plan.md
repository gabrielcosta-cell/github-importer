

## Nova aba "Squads" na view de Projetos

### Visão Geral
Criar um componente `SquadsDashboard` que agrega os dados da carteira de clientes por Squad/mês, exibido como uma nova aba ao lado de "Clientes" e "Métricas Financeiras" no `ProjetosView`.

### Alterações

#### 1. Adicionar `categoria` ao fetch e ao tipo `ProjetoRow` em `GestaoProjetosOperacao.tsx`
- Incluir `categoria` na query do CSM (`select(...)`)
- Adicionar `categoria?: string` ao `ProjetoRow` interface

#### 2. Criar componente `src/components/SquadsDashboard.tsx`
Componente que reutiliza a mesma lógica de fetch do `GestaoProjetosOperacao` (CSM + CRM) mas agrega por Squad.

**Dados e fetch:**
- Buscar todos os cards do pipeline Clientes Ativos (incluindo `categoria`, `data_perda`, `data_inicio`, `monthly_revenue`, `squad`, `client_status`)
- Buscar cards CRM Ops (com `tipo_receita`, `monthly_revenue`, `squad`)
- Filtro `MonthYearPicker` para selecionar mês (igual à aba Clientes)

**Colunas da tabela (por squad):**

| Coluna | Lógica |
|--------|--------|
| Squad | Nome do squad |
| BASE + NOVOS - CHURN | Contagem de clientes ativos no mês + clientes que cancelaram no mês (mesma lógica `wasRelevantInMonth`) |
| MRR Recorrente | Soma de `monthly_revenue` dos cards CSM ativos com `categoria === 'MRR Recorrente'` |
| MRR Vendido | Soma de `monthly_revenue` dos cards CSM ativos com `categoria === 'MRR Vendido'` |
| MRR Vendido Operação | Soma de `monthly_revenue` dos cards CRM do mês com `tipo_receita` = `venda_unica` ou `venda_recorrente` |
| Comissões | Soma de `monthly_revenue` dos cards CRM do mês com `tipo_receita` = `variavel_midia` ou `variavel_meta` |
| LT MÉDIO | Média de `Tempo de DOT` (meses desde `data_inicio`) de todos os clientes relevantes no mês (ativos + cancelados) |
| Revenue Churn | Soma do `monthly_revenue` dos cards CSM que cancelaram naquele mês (`data_perda` no mês selecionado) |
| Revenue Churn % | `Revenue Churn / MRR Recorrente * 100` |
| Revenue Churn + Upsell | Ajuste considerando upsell se aplicável, ou igual ao Churn % |
| TM CHURN | Ticket médio dos cancelados no mês |
| % LOGO CHURN | Quantidade de clientes cancelados / total de clientes * 100 |
| VM INVESTIDA | Soma de `limite_investimento` dos clientes ativos da squad |
| Vendas Geradas | Soma de `receita_gerada_cliente` dos clientes ativos da squad |
| ROI | Vendas Geradas / VM Investida |
| MPA | Média de meses por ativo (media de tempo DOT só dos ativos) |
| MRR Final | Soma `monthly_revenue` apenas de clientes ativos com `categoria === 'MRR Recorrente'` |
| Receita Líquida | MRR Final - Revenue Churn |

**Estilo visual:**
- Cabeçalho vermelho sticky (mesmo padrão da aba Clientes: `bg-primary text-primary-foreground`)
- Colunas Squad e número de ordem fixas à esquerda
- Badges coloridos para squads (reutilizar `SQUAD_COLORS`)
- Background verde claro para a coluna Revenue Churn + Upsell (como na imagem de referência)

#### 3. Atualizar `ProjetosView.tsx`
- Adicionar terceira aba "Squads" com ícone `Shield` ou `Users`
- Tipo do activeTab: `'clientes' | 'squads' | 'metricas'`
- Renderizar `<SquadsDashboard />` quando `activeTab === 'squads'`

### Considerações
- A coluna Health Score visível na imagem será ignorada (barras vermelhas parecem ser visuais customizados — complexidade desnecessária nesta fase)
- Os dados são computados via `useMemo` a partir dos arrays brutos, sem queries adicionais ao Supabase

