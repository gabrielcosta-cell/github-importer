import { supabase } from '@/integrations/supabase/client'

/**
 * One-time sync: reads squad overrides from csm_project_snapshots
 * for the current month and updates csm_cards.squad accordingly.
 */
export const syncSquadSnapshotsToCards = async () => {
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // DB uses 1-indexed
  const currentYear = now.getFullYear()

  console.log(`[syncSquadSnapshots] Fetching snapshots for ${currentMonth}/${currentYear}...`)

  // Fetch all snapshots for current month that have a squad override
  const { data: snapshots, error: snapError } = await supabase
    .from('csm_project_snapshots')
    .select('card_id, squad')
    .eq('snapshot_month', currentMonth)
    .eq('snapshot_year', currentYear)
    .not('squad', 'is', null)

  if (snapError) {
    console.error('[syncSquadSnapshots] Error fetching snapshots:', snapError)
    return { success: false, error: snapError.message }
  }

  if (!snapshots || snapshots.length === 0) {
    console.log('[syncSquadSnapshots] No squad snapshots found for current month')
    return { success: true, updated: 0 }
  }

  console.log(`[syncSquadSnapshots] Found ${snapshots.length} squad snapshots`)

  let updated = 0
  const errors: string[] = []

  for (const snap of snapshots) {
    if (!snap.squad) continue

    const { error } = await supabase
      .from('csm_cards')
      .update({ squad: snap.squad })
      .eq('id', snap.card_id)

    if (error) {
      errors.push(`${snap.card_id}: ${error.message}`)
    } else {
      updated++
    }
  }

  console.log(`[syncSquadSnapshots] Updated ${updated} cards. Errors: ${errors.length}`)
  if (errors.length > 0) console.error('[syncSquadSnapshots] Errors:', errors)

  return { success: errors.length === 0, updated, errors }
}

// Expose globally for one-time console usage
if (typeof window !== 'undefined') {
  ;(window as any).syncSquadSnapshotsToCards = syncSquadSnapshotsToCards
}
