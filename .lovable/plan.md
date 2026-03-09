

## Corrigir MRR zerado e cores de squad em cards migrados

### Problema
Quando o `SquadEditDialog` salva uma troca de squad via upsert, ele nao inclui `monthly_revenue`. Para linhas novas no `csm_project_snapshots`, a coluna recebe default 0, que depois sobrescreve o MRR real. Alem disso, o `FeeEditDialog` nao preserva o `squad` existente. E as cores dos squads ficam amber em vez da cor real.

### Correções

**1. `src/components/projetos/SquadEditDialog.tsx`** — No `handleSave`, antes do upsert, buscar snapshots existentes do card para preservar `monthly_revenue`:

```typescript
const { data: existingSnaps } = await supabase
  .from('csm_project_snapshots')
  .select('snapshot_month, snapshot_year, monthly_revenue')
  .eq('card_id', cardId)

const existingMap = new Map<string, number | null>()
for (const s of existingSnaps || []) {
  existingMap.set(`${s.snapshot_month}-${s.snapshot_year}`, s.monthly_revenue)
}

const rows = affectedMonths.map(m => ({
  card_id: cardId,
  snapshot_month: m.month + 1,
  snapshot_year: m.year,
  squad: newSquad,
  company_name: companyName,
  monthly_revenue: existingMap.get(`${m.month + 1}-${m.year}`) ?? null,
}))
```

**2. `src/components/projetos/FeeEditDialog.tsx`** — Mesma logica inversa, preservar `squad` existente ao salvar fee.

**3. `src/components/GestaoProjetosOperacao.tsx`**:
- Adicionar `Atlas` ao `SQUAD_COLORS`
- Remover destaque amber do `_hasSquadSnapshot` — usar a cor real do squad

**4. SQL para corrigir dados existentes** (executar no Supabase SQL Editor):
```sql
UPDATE csm_project_snapshots
SET monthly_revenue = NULL
WHERE squad IS NOT NULL
  AND monthly_revenue = 0;
```

