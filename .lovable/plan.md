

## Dividir Métricas Financeiras em abas temáticas

Adicionar sub-abas dentro do dashboard de Métricas Financeiras, mantendo o título e o filtro de mês no topo. O conteúdo será dividido em 4 abas:

### Estrutura das abas

**Aba MRR** (KPIs):
- MRR da Base, MRR Recorrente, MRR Total, MRR Vendido, MRR Perdido, MRR por Plano (com toggle de plano)
- Gráfico de Evolução do MRR

**Aba Churn** (KPIs):
- Revenue Churn %, Churn Líquido + Upsell %, MRR Perdido

**Aba Ticket Médio** (KPIs):
- Ticket Médio MRR, Ticket Médio Perdido, Ticket Médio por Plano (com toggle de plano)

**Aba Vendas** (KPIs):
- Receita Adicional Total, Upsell Recorrente, Upsell Total (com filtro pagamento), Crosssell Total (com filtro pagamento)

### Implementação

**Arquivo: `src/components/FinancialMetrics.tsx`**

1. Adicionar estado `activeTab` com valores `'mrr' | 'churn' | 'ticket' | 'vendas'`
2. Usar o mesmo padrão de tabs customizado do `ProjetosView.tsx` (botões estilizados com ícones)
3. Mover cada grupo de KPICards para dentro da renderização condicional da respectiva aba
4. O modal de detalhes e o MonthYearPicker permanecem fora das abas (compartilhados)
5. O gráfico de evolução fica na aba MRR

