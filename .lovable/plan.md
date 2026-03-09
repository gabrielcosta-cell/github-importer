

## Adicionar filtro por mês nas Métricas Financeiras

### Análise da planilha vs. dados atuais

A planilha contém métricas financeiras mensais consolidadas:
- **MRR da base**: R$ 196.408 (soma MRR clientes ativos recorrentes)
- **MRR Vendido**: R$ 7.500 (novos clientes)
- **MRR Perdido**: R$ 21.956 (churn)
- **MRR Final**: R$ 181.952 (base - perdido)
- **Ticket Médio Perdido**: R$ 7.319
- **Churn Bruto**: 11,18% | **Churn Líquido + Upsell**: 11,12%
- **Clientes da Base**: 48 | **No mês**: 52 | **Novos**: 2

O componente `FinancialMetrics.tsx` atual busca dados "ao vivo" sem filtro de mês. Precisa usar a mesma lógica temporal das abas Clientes e Squads.

### Alterações

**Arquivo: `src/components/FinancialMetrics.tsx`** — reescrever para:

1. **Adicionar MonthYearPicker** no topo (igual Squads), com estado `selectedPeriod` inicializado no mês atual

2. **Buscar dados expandidos** — além de `monthly_revenue` e `plano`, buscar também `data_inicio`, `data_contrato`, `created_at`, `data_perda`, `client_status`, `categoria`, `squad` dos `csm_cards` no pipeline de clientes ativos

3. **Buscar upsells com filtro de mês** — usar `upsell_month` e `upsell_year` da tabela `csm_card_upsell_history` para filtrar por período selecionado

4. **Aplicar lógica temporal** — usar as mesmas funções `wasRelevantInMonth`, `isChurnedInMonth`, `isActiveInMonth` que já existem no SquadsDashboard para filtrar cards no mês selecionado

5. **Calcular métricas por mês**:
   - **MRR Total**: soma MRR dos clientes ativos no mês (categoria MRR Recorrente)
   - **MRR por Plano**: filtrado por plano + mês
   - **Ticket Médio MRR**: MRR total / nº clientes ativos
   - **Ticket Médio por Plano**: idem filtrado por plano
   - **MRR Perdido**: soma MRR dos clientes que churned no mês
   - **Clientes da Base**: total relevantes no mês
   - **Receita Adicional / Upsell / Crosssell**: filtrado por `upsell_month`/`upsell_year`

6. **Adicionar KPIs novos da planilha**:
   - **MRR Perdido** (churn do mês)
   - **Clientes da Base** / **Clientes no Mês** / **Novos Clientes**
   - **Revenue Churn (%)** — MRR perdido / MRR base

7. **Layout**: MonthYearPicker (singleSelect) no header, antes do grid de KPIs

