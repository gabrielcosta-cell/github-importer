
# Remove Upsell/Crosssell from CSM Cards

## Summary
Remove the Upsell/Crosssell tab/section from CSM card details, since all upsell and crosssell records should be managed in the CRM module instead.

## Changes

### File: `src/components/kanban/CardDetailsDialog.tsx`

1. **Remove UpsellManager import** (line 22)

2. **Remove upsell-related state variables** (lines ~110-124): `upsellHistory`, `newUpsellValue`, `newUpsellMonth`, `newUpsellYear`, `newUpsellNotes`, `newUpsellType`, `newPaymentType`, `newInstallments`

3. **Remove `upsells` from `sectionStates`** (line ~155)

4. **Remove upsell history fetch useEffect** (lines ~353-374)

5. **Remove `handleSaveUpsell` function** (lines ~1463-1532+)

6. **Remove `handleDeleteUpsell` function** (lines ~1617+)

7. **Remove 3 JSX sections** that render Upsell/Crosssell UI:
   - Desktop collapsible section (~lines 2740-2756)
   - Summary display in sidebar (~lines 3329-3377+)
   - Mobile collapsible section (~lines 3906-3922+)

This is a removal-only change with no new functionality needed.
