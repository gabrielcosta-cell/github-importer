

## Adicionar MRR Perdido e Clientes Perdidos no header da aba Projetos

### O que será feito

Adicionar dois indicadores no header (junto aos totais existentes de MRR, CRM e Total):
- **Clientes Perdidos**: quantidade de clientes cuja `data_perda` cai no mês selecionado
- **MRR Perdido**: soma do `monthly_revenue` (Fee MRR) desses clientes

### Alteração

**`src/components/GestaoProjetosOperacao.tsx`**

1. Adicionar um `useMemo` que filtra `liveData` para encontrar clientes com `data_perda` dentro do mês/ano selecionado, calculando:
   - `churnCount`: total de cards com `data_perda` no mês
   - `churnMRR`: soma do `monthly_revenue` desses cards

2. Exibir no header (linhas ~529-534), após o Total, dois novos indicadores com estilo vermelho:
   - `Churn: X clientes`
   - `MRR Perdido: R$ X.XXX,XX`

### Lógica de filtro

```typescript
const { churnCount, churnMRR } = useMemo(() => {
  const churned = liveData.filter(p => {
    if (!p.data_perda) return false
    const d = parseISO(p.data_perda)
    return d.getMonth() === selectedPeriod.month && d.getFullYear() === selectedPeriod.year
  })
  return {
    churnCount: churned.length,
    churnMRR: churned.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0)
  }
}, [liveData, selectedPeriod])
```

Usa `liveData` (antes dos filtros de busca/coluna) para garantir que o valor reflita todos os cancelamentos do mês, independente de filtros aplicados na tabela.

