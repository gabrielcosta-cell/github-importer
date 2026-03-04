

## Plano: Remover snapshots e usar consulta em tempo real com filtro por mês

### Resumo
Eliminar toda a lógica de snapshots e sempre consultar `csm_cards` diretamente, filtrando pela data de criação e status de cancelamento relativo ao mês selecionado.

### Regras de visibilidade
Para o mês/ano selecionado, um cliente aparece se:
1. **Foi criado antes do fim do mês selecionado** (`created_at <= último dia do mês`)
2. **E** está ativo, **OU** foi cancelado no mês selecionado (`data_perda` cai naquele mês), **OU** foi cancelado após o mês selecionado

Em resumo: mostra quem existia e ainda estava ativo naquele mês + quem churnou naquele mês.

### Alterações em `GestaoProjetosOperacao.tsx`

1. **Remover** todo o state e lógica de `snapshotData`, `isCurrentMonth`, `saveSnapshot`, botão "Salvar Snapshot", badges de snapshot
2. **Remover** a chamada à tabela `csm_project_snapshots`
3. **Simplificar `displayData`**: sempre usar `liveData` como fonte, com filtro:
   - `created_at` do card é anterior ao fim do mês selecionado
   - Se `client_status === 'cancelado'`: `data_perda` deve ser no mês selecionado ou posterior (ou seja, ainda estava ativo naquele mês ou churnou naquele mês)
4. **Remover** referências a `isCurrentMonth` no JSX (badges "Sem snapshot", "Snapshot", botão salvar)

### Código-chave do filtro

```ts
const wasRelevantInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
  // Verifica se o cliente já existia no mês selecionado
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
  if (p.created_at) {
    const createdAt = parseISO(p.created_at)
    if (createdAt > endOfMonth) return false // criado depois do mês selecionado
  }

  // Ativos sempre aparecem (se já existiam)
  if (p.client_status !== 'cancelado') return true

  // Cancelados: aparecem se data_perda >= mês selecionado
  if (!p.data_perda) return false
  const perdaDate = parseISO(p.data_perda)
  const perdaMonth = perdaDate.getMonth()
  const perdaYear = perdaDate.getFullYear()
  if (perdaYear > year) return true
  if (perdaYear === year && perdaMonth >= month) return true
  return false
}
```

### O que é removido
- State `snapshotData`, `isCurrentMonth`
- `useEffect` de fetch de snapshots
- Função `saveSnapshot` e botão correspondente
- Badges de "Sem snapshot" / "Snapshot"
- Função `isChurnInMonth` (não usada)
- Referência à tabela `csm_project_snapshots`

Nenhuma alteração no banco de dados é necessária.

