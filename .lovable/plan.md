

## Plan: Drill-down nos KPIs de Upsell Recorrente, Upsell Total e Crosssell Total

### O que muda

Os três KPIs de upsell/crosssell passarão a ser clicáveis. Ao clicar no valor, abre um modal (igual ao dos outros KPIs) mostrando os registros que compõem aquele valor.

Como os registros de upsell (`UpsellRecord`) têm estrutura diferente dos clientes (`CardData`), o modal precisa suportar um segundo tipo de dados.

### Mudanças técnicas

**Arquivo: `src/components/FinancialMetrics.tsx`**

1. **Ampliar a query de upsell** para incluir `card_id` e buscar o nome do cliente via join:
   - Alterar o select para: `id, upsell_type, upsell_value, payment_type, upsell_month, upsell_year, notes, card_id, csm_cards(title, squad, plano)`

2. **Atualizar `UpsellRecord`** para incluir `card_title`, `squad`, `plano`, `notes` e `payment_type`

3. **Ampliar o estado `detailModal`** para aceitar também uma lista de `UpsellRecord[]`:
   - Tipo: `{ title: string; clients?: CardData[]; upsellRecords?: UpsellRecord[] } | null`

4. **Adicionar `onValueClick`** nos 3 KPIs:
   - **Upsell Recorrente**: passa `current.upsells.filter(r => r.payment_type === 'recorrente')`
   - **Upsell Total**: passa `upsellFiltered.filteredUpsells`
   - **Crosssell Total**: passa `upsellFiltered.filteredCrosssells`

5. **No modal**, renderizar condicionalmente:
   - Se `upsellRecords` presente: tabela com colunas **Cliente** (card title), **Tipo Pagamento**, **Notas**, **Valor**
   - Se `clients` presente: tabela atual (Cliente, Squad, Plano, MRR)
   - Total no rodapé em ambos os casos

