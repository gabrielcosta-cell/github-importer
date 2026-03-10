

## Filtro de mês único no CRM

Basta adicionar `singleSelect` ao `MonthYearPicker` no CRM. O componente já suporta essa prop.

### Alteração em `src/components/CRMOpsKanban.tsx` (linha ~284)

Adicionar `singleSelect` ao `MonthYearPicker`:

```tsx
<MonthYearPicker
  selectedPeriods={selectedPeriods}
  onPeriodsChange={setSelectedPeriods}
  singleSelect
/>
```

Uma linha adicionada, nenhuma outra alteração necessária.

