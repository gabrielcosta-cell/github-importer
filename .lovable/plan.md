

## Totalizadores separados no cabeçalho de Projetos

Currently, the header shows a single "MRR" total that sums both `monthly_revenue` and `crm_revenue`. The request is to break this into three distinct values.

### Changes in `src/components/GestaoProjetosOperacao.tsx`

1. **Replace the single `totalMRR` memo** (line 394) with three separate memos:
   - `totalMRR` = sum of `monthly_revenue` only (fee recorrente CSM)
   - `totalCRM` = sum of `crm_revenue` only (vendas do CRM Ops)
   - `totalGeral` = `totalMRR + totalCRM`

2. **Update the header display** (line 469) from the single `MRR: R$ X` to show three values side by side:
   - `MRR: R$ X` | `CRM: R$ X` | `Total: R$ X`
   - Each as a small `text-sm font-medium` span, visually separated

This is a minimal change -- two areas of the file, no new components needed.

