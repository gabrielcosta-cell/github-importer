

## Ajustar totais do header na aba Projetos por categoria de MRR

### Alterações em `src/components/GestaoProjetosOperacao.tsx`

**Linhas 502-506** — Substituir os cálculos de totais atuais por:

```typescript
const mrrRecorrente = useMemo(() => 
  displayData.filter(p => p.source !== 'crm-ops' && (p.categoria === 'MRR recorrente' || p.categoria === 'MRR Recorrente'))
    .reduce((sum, p) => sum + (p.monthly_revenue || 0), 0), [displayData])

const mrrVendido = useMemo(() => 
  displayData.filter(p => p.source !== 'crm-ops' && p.categoria === 'MRR Vendido')
    .reduce((sum, p) => sum + (p.monthly_revenue || 0), 0), [displayData])

const totalMRR = useMemo(() => mrrRecorrente + mrrVendido, [mrrRecorrente, mrrVendido])

const totalCRM = useMemo(() => 
  displayData.reduce((sum, p) => sum + (p.crm_revenue || 0) + (p.source === 'crm-ops' ? (p.monthly_revenue || 0) : 0), 0), [displayData])

const totalVarMidia = useMemo(() => displayData.reduce((sum, p) => sum + (p.variavel_midia_revenue || 0), 0), [displayData])
const totalVarVendas = useMemo(() => displayData.reduce((sum, p) => sum + (p.variavel_vendas_revenue || 0), 0), [displayData])

const totalGeral = useMemo(() => totalMRR + totalCRM + totalVarMidia + totalVarVendas, [totalMRR, totalCRM, totalVarMidia, totalVarVendas])
```

**Linhas 596-605** — Substituir o header de totais por:

```
MRR Base: R$ X (Y clientes) | MRR Vendido: R$ X (Y clientes) | Total MRR: R$ X | CRM: R$ X (Y vendas) | Faturamento: R$ X | Churn: N clientes | MRR Perdido: R$ X
```

Onde:
- **MRR Base** = soma Fee de clientes CSM com categoria 'MRR Recorrente', com contagem
- **MRR Vendido** = soma Fee de clientes CSM com categoria 'MRR Vendido', com contagem
- **Total MRR** = MRR Base + MRR Vendido
- **CRM** = mantém lógica atual (vendas ops)
- **Faturamento** = Total MRR + CRM (inclui Var. Mídia e Var. Vendas)
- **Churn** e **MRR Perdido** = mantém lógica atual

