

## Plan: Add MRR da Base KPI + Client Detail Modal on Click

### What changes

**1. Add MRR da Base KPI and reorder first row**
- Insert a new "MRR da Base" KPI card as the first card (left column)
- Move "MRR Recorrente" to the second position (right column)
- MRR da Base uses `current.mrrBase` (already calculated) with `current.relevantRecorrentes` count

**2. Make KPI values clickable with client list modal**
- Add an `onClick` prop to `KPICard` component — when provided, the value becomes a clickable element with cursor-pointer and hover effect
- In `FinancialMetrics.tsx`, add state for a detail modal (`selectedKPI`) storing the title and client list
- When any KPI value is clicked, open a `Dialog` centered on screen showing:
  - Title of the KPI
  - Scrollable table with columns: Cliente (title/company), MRR (formatted), Squad, Plano
  - Total row at the bottom
- Each KPI card passes the relevant `CardData[]` array as the drill-down data (e.g., MRR da Base → `relevantRecorrentes`, MRR Recorrente → `activeRecorrentes`, MRR Vendido → `activeVendidos`, MRR Perdido → `churnedCards`)

### Files to edit

| File | Change |
|------|--------|
| `src/components/KPICard.tsx` | Add optional `onClick` prop; wrap value div with click handler + hover styling |
| `src/components/FinancialMetrics.tsx` | Add MRR da Base card, reorder grid, add modal state + Dialog with client list table, pass onClick to each KPI |

### Technical details

- `KPICard`: new prop `onValueClick?: () => void`. When set, value gets `cursor-pointer hover:opacity-70 transition-opacity underline decoration-dotted`
- Modal state: `detailModal: { title: string; clients: CardData[] } | null`
- Dialog uses existing `Dialog`/`DialogContent` + `ScrollArea` for the client list
- Client list sorted by `monthly_revenue` descending
- Shows total MRR sum at the bottom of the list

