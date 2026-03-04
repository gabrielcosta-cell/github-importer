

## Ajuste de data_perda para Rede Conecta e Style Brazil

This is a **data update** operation -- updating the `data_perda` field on two CSM cards in the `csm_cards` table.

### What will be done

Execute two SQL UPDATE statements using the Supabase insert tool:

```sql
UPDATE csm_cards 
SET data_perda = '2026-02-28', updated_at = now()
WHERE company_name = 'Rede Conecta';

UPDATE csm_cards 
SET data_perda = '2026-02-28', updated_at = now()
WHERE company_name = 'Style Brazil';
```

### Impact
- Only the `data_perda` column is changed to `2026-02-28` for these two specific cards
- This will affect their visibility in the Squads and Clientes tabs when filtering by month (they will now appear as churned in February 2026)
- No code changes required

