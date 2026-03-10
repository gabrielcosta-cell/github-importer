

## Substituir filtro de data do CRM por MonthYearPicker (igual ao CSM)

### O que muda
- Remover o `Select` de "Data de criação" / "Data de ganho" (linhas 293-302)
- Substituir o `CRMOpsDateFilter` (date range picker) pelo `MonthYearPicker` (seleção por mês/ano, já usado no CSM)
- Filtrar cards por mês/ano usando `created_at` (campo padrão)

### Alterações em `src/components/CRMOpsKanban.tsx`

1. **Remover** imports: `CRMOpsDateFilter`, `startOfDay`, `endOfDay`
2. **Remover** states: `dateStart`, `dateEnd`, `dateField`, `handleDateApply`, `handleDateClear`
3. **Adicionar** import do `MonthYearPicker` e state `selectedPeriods` (iniciar com mês atual)
4. **Substituir** lógica de filtro de data (linhas 147-153) por verificação de mês/ano do `created_at` contra `selectedPeriods`
5. **No JSX** (linhas 293-308): remover Select de dateField + CRMOpsDateFilter, colocar `MonthYearPicker`
6. Atualizar `useMemo` dependencies

### Lógica de filtro simplificada
```typescript
if (selectedPeriods.length > 0) {
  const d = new Date(card.created_at);
  const cardMonth = d.getMonth();
  const cardYear = d.getFullYear();
  if (!selectedPeriods.some(p => p.month === cardMonth && p.year === cardYear)) return false;
}
```

