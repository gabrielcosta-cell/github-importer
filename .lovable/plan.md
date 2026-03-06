

## Atualizar data de cancelamento de dois clientes

### O que será feito

Atualizar o campo `data_perda` dos seguintes cards CSM:

- **ID0016 — Style Brazil**: `data_perda` → `'2026-02-27'`
- **ID0017 — Rede Conecta**: `data_perda` → `'2026-02-27'`

### Como

Usar o insert tool (para operações de UPDATE) com SQL:

```sql
UPDATE csm_cards SET data_perda = '2026-02-27' WHERE display_id = 16;
UPDATE csm_cards SET data_perda = '2026-02-27' WHERE display_id = 17;
```

### Resultado esperado

Com `data_perda = 2026-02-27`:
- **Janeiro**: ambos aparecem como ativos (data_inicio ≤ fim de jan, data_perda > início de jan)
- **Fevereiro**: aparecem na listagem de cancelados (data_perda dentro de fev) e também como ativos até 27/02

Nenhuma alteração de código é necessária — apenas atualização de dados no banco.

