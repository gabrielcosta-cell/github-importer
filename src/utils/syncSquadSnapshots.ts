import { supabase } from '@/integrations/supabase/client'

/**
 * One-time sync: reads squad overrides from csm_project_snapshots
 * for the current month and updates csm_cards.squad accordingly.
 */
export const syncSquadSnapshotsToCards = async () => {
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // DB uses 1-indexed
  const currentYear = now.getFullYear()

  console.log(`[syncSquadSnapshots] Fetching snapshots for month=${currentMonth}, year=${currentYear}...`)

  // Fetch all snapshots for current month
  const { data: snapshots, error: snapError } = await supabase
    .from('csm_project_snapshots')
    .select('card_id, squad')
    .eq('snapshot_month', currentMonth)
    .eq('snapshot_year', currentYear)

  if (snapError) {
    console.error('[syncSquadSnapshots] Error fetching snapshots:', snapError)
    return { success: false, error: snapError.message, updated: 0 }
  }

  console.log(`[syncSquadSnapshots] Total snapshots found: ${snapshots?.length || 0}`)

  // Filter only those with squad set
  const withSquad = (snapshots || []).filter(s => s.squad && s.squad.trim() !== '')
  console.log(`[syncSquadSnapshots] Snapshots with squad override: ${withSquad.length}`)

  if (withSquad.length === 0) {
    console.log('[syncSquadSnapshots] No squad snapshots to sync')
    return { success: true, updated: 0 }
  }

  // Log each override
  withSquad.forEach(s => console.log(`  → card ${s.card_id} → squad: ${s.squad}`))

  let updated = 0
  const errors: string[] = []

  for (const snap of withSquad) {
    const { error, count } = await supabase
      .from('csm_cards')
      .update({ squad: snap.squad })
      .eq('id', snap.card_id)

    if (error) {
      console.error(`  ❌ ${snap.card_id}: ${error.message}`)
      errors.push(`${snap.card_id}: ${error.message}`)
    } else {
      console.log(`  ✅ ${snap.card_id} → ${snap.squad}`)
      updated++
    }
  }

  const result = { success: errors.length === 0, updated, total: withSquad.length, errors }
  console.log(`[syncSquadSnapshots] Done! Updated ${updated}/${withSquad.length}`, result)
  return result
}

// Expose globally for console usage
if (typeof window !== 'undefined') {
  ;(window as any).syncSquadSnapshotsToCards = syncSquadSnapshotsToCards
}
