import { supabase } from '@/integrations/supabase/client'

const SYNC_KEY = 'squad_snapshot_sync_done'

/**
 * Auto-sync: reads squad overrides from csm_project_snapshots
 * for the current month and updates csm_cards.squad accordingly.
 * Runs only once per session.
 */
export const syncSquadSnapshotsToCards = async () => {
  // Only run once per session
  if (sessionStorage.getItem(SYNC_KEY)) {
    console.log('[syncSquadSnapshots] Already synced this session, skipping.')
    return { success: true, updated: 0, skipped: true }
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  console.log(`[syncSquadSnapshots] Syncing snapshots for month=${currentMonth}, year=${currentYear}...`)

  const { data: snapshots, error: snapError } = await supabase
    .from('csm_project_snapshots')
    .select('card_id, squad')
    .eq('snapshot_month', currentMonth)
    .eq('snapshot_year', currentYear)

  if (snapError) {
    console.error('[syncSquadSnapshots] Error:', snapError)
    return { success: false, error: snapError.message, updated: 0 }
  }

  const withSquad = (snapshots || []).filter(s => s.squad && s.squad.trim() !== '')
  console.log(`[syncSquadSnapshots] Found ${withSquad.length} squad overrides out of ${snapshots?.length || 0} total snapshots`)

  if (withSquad.length === 0) {
    sessionStorage.setItem(SYNC_KEY, 'true')
    return { success: true, updated: 0 }
  }

  let updated = 0
  for (const snap of withSquad) {
    const { error } = await supabase
      .from('csm_cards')
      .update({ squad: snap.squad })
      .eq('id', snap.card_id)

    if (error) {
      console.error(`  ❌ ${snap.card_id}: ${error.message}`)
    } else {
      console.log(`  ✅ ${snap.card_id} → ${snap.squad}`)
      updated++
    }
  }

  console.log(`[syncSquadSnapshots] Done! Updated ${updated}/${withSquad.length}`)
  sessionStorage.setItem(SYNC_KEY, 'true')
  return { success: true, updated }
}
