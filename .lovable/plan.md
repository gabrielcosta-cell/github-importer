

## Fix: Paragon Bank showing R$4,000 in both Fee MRR and Receita CRM

### Problem
When a CSM row appears in a month only due to CRM revenue (source overridden to 'crm-ops'), it still carries both `monthly_revenue` (from the CSM card) and `crm_revenue` (from the CRM merge). Both values display, double-counting.

### Solution
In the `.map()` override at line 381-383, when converting a CSM row to 'crm-ops' because the CSM card isn't active yet, zero out `crm_revenue` so the fee only shows in "Fee (MRR)":

```typescript
return { ...p, source: 'crm-ops' as const, crm_revenue: 0 }
```

This keeps `monthly_revenue` (R$4,000) in "Fee (MRR)" and removes the duplicate from "Receita CRM".

### File
- `src/components/GestaoProjetosOperacao.tsx` — 1 line change (line 382)

