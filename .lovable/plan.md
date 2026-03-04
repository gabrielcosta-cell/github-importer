

## Fix: Paragon Bank not showing in February

### Root Cause
The merge logic in `GestaoProjetosOperacao.tsx` (lines 301-334) matches CRM cards to CSM cards by `display_id`. Once matched, the CRM card's revenue is attached to the CSM row. But when filtering by month, if the CSM card didn't exist yet (e.g., `data_inicio` is March), the entire merged row is hidden -- including the CRM revenue that should be visible in February.

### Solution
Modify the `displayData` filtering logic so that when a merged CSM row is not relevant in the selected month BUT has CRM revenue for that month (`crm_revenue > 0`), it still shows up -- but as a "Venda Ops" source row.

Specifically, in the `displayData` useMemo (around line 373), change the filter:

**Current logic:**
```
wasRelevantInMonth(p, month, year) → false → row hidden
```

**New logic:**
If `wasRelevantInMonth` is false for a CSM row, but `crm_revenue > 0` for the selected month, show the row with `source: 'crm-ops'` so it appears as a CRM-originated entry.

### Implementation
In `GestaoProjetosOperacao.tsx`, modify the `displayData` useMemo filter (line 374-378):

```typescript
let filtered = liveData.filter(p => {
  const name = (p.company_name || p.title || '').toLowerCase()
  const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase())
  const matchesStatus = wasRelevantInMonth(p, selectedPeriod.month, selectedPeriod.year)
  // If CSM row is not relevant but has CRM revenue for this month, still show it
  const hasCrmRevenueThisMonth = !matchesStatus && p.source === 'csm' && (p.crm_revenue || 0) > 0
  return matchesSearch && (matchesStatus || hasCrmRevenueThisMonth)
})
```

And for rows that appear only due to CRM revenue, override the display source to 'crm-ops' so the "Origem" column shows "Venda Ops":

```typescript
.map(p => {
  if (!wasRelevantInMonth(p, selectedPeriod.month, selectedPeriod.year) && p.source === 'csm' && (p.crm_revenue || 0) > 0) {
    return { ...p, source: 'crm-ops' as const }
  }
  return p
})
```

### Files Changed
- `src/components/GestaoProjetosOperacao.tsx` -- ~5 lines changed in the `displayData` useMemo

