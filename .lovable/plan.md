

## Renomear "Upsell | CrossSell" → "Vendas | Upsell" e criar novo funil "Vendas | CrossSell"

### Alterações

**1. `src/utils/setupCRMOpsPipelines.ts`**
- Renomear `CLOSER_PIPELINE_NAME` para `'Vendas | Upsell'`
- Adicionar `'Upsell | CrossSell'` à lista de nomes legacy para migração automática (renomear pipeline existente no banco)
- Adicionar constante `CROSSSELL_PIPELINE_NAME = 'Vendas | CrossSell'`
- Na função `migrateLegacyCloserPipeline`, incluir `'Upsell | CrossSell'` como nome legacy que deve ser renomeado para `'Vendas | Upsell'`
- Na função `setupCRMOpsPipelines`, adicionar criação do pipeline `'Vendas | CrossSell'` com as mesmas etapas (Oportunidades, Orçamento, Apresentação, Negociação, Em assinatura), vazio (sem cards)
- Retornar o novo `crossSellId` no objeto de retorno
- Atualizar `CRM_OPS_PIPELINE_NAMES` para incluir `'Vendas | CrossSell'`

**2. `src/components/CRMOpsKanban.tsx`**
- Atualizar referência de `'Upsell | CrossSell'` para `'Vendas | Upsell'` no pipeline default

**3. `src/components/kanban/CardDetailsDialog.tsx`**
- Atualizar todas as referências de `'Upsell | CrossSell'` para `'Vendas | Upsell'` (busca de pipeline, mensagens de toast, descrição de atividade)

**4. `src/utils/importCloserWonFeb.ts`**
- Atualizar referência de `'Upsell | CrossSell'` para `'Vendas | Upsell'`

**5. `src/hooks/useProjetosData.ts`**
- Atualizar mapeamento de nome curto: `'Vendas | Upsell'` → `'Upsell'`
- Adicionar mapeamento: `'Vendas | CrossSell'` → `'CrossSell'`

### O que NÃO muda
- Nenhum card é movido ou copiado — apenas o nome do pipeline existente muda
- As etapas do funil original permanecem iguais
- O novo funil "Vendas | CrossSell" é criado vazio com a mesma estrutura de etapas

