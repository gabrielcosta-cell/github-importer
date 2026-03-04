

## Análise

Sim, ajustar a data para `2026-03-02` resolveria o problema **para este card específico**, mas não corrige a causa raiz: qualquer card futuro criado com data no dia 1 de um mês (ex: `2026-04-01 00:00:00+00`) vai ter o mesmo bug de aparecer no mês anterior por causa do fuso horário.

## Recomendação

Fazer **ambas as coisas**:

1. **Agora (dados)**: Atualizar o Paragon Bank para `2026-03-02` como correção imediata
2. **No código**: Corrigir o bug de timezone em `wasRelevantInMonth` para que isso nunca mais aconteça

A correção de código é uma mudança de ~3 linhas na função `wasRelevantInMonth` em `GestaoProjetosOperacao.tsx` — trocar `parseISO(startDateStr)` por extrair apenas a data (sem timezone) para evitar que datas UTC sejam convertidas para o dia anterior no horário local.

### SQL imediato

```sql
UPDATE csm_cards
SET created_at = '2026-03-02 00:00:00+00'
WHERE display_id = 57
  AND pipeline_id = '749ccdc2-5127-41a1-997b-3dcb47979555';
```

### Correção definitiva (código)

Em `wasRelevantInMonth`, trocar:
```typescript
// De:
const startDate = parseISO(startDateStr)

// Para:
const dateOnly = startDateStr.substring(0, 10)
const startDate = new Date(dateOnly + 'T12:00:00')
```

Mesma lógica para o bloco de CRM Ops que usa `parseISO(p.created_at)`.

Se preferir apenas o SQL por agora, basta rodar a query acima. Se quiser também a correção permanente no código, posso implementar ambos.

