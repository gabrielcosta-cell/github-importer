

## Refletir alteracao de Squad no CSM

### Problema
O `SquadEditDialog` salva apenas em `csm_project_snapshots`. O CSM Kanban le `csm_cards.squad` diretamente, entao alteracoes feitas na planilha de Projetos nao aparecem no CSM.

### Solucao

**Arquivo: `src/components/projetos/SquadEditDialog.tsx`**

No `handleSave`, apos o upsert nos snapshots, verificar se os meses afetados incluem o mes atual ou meses futuros. Se sim, atualizar `csm_cards.squad` diretamente:

```ts
// Verificar se afeta o mes atual ou futuro
const now = new Date()
const currentMonth = now.getMonth()
const currentYear = now.getFullYear()

const affectsCurrentOrFuture = affectedMonths.some(m => 
  m.year > currentYear || (m.year === currentYear && m.month >= currentMonth)
)

if (affectsCurrentOrFuture) {
  await supabase
    .from('csm_cards')
    .update({ squad: newSquad })
    .eq('id', cardId)
}
```

Isso garante que:
- "Apenas este mes" (marco): se marco >= mes atual, atualiza o card
- "Este e seguintes": atualiza o card (inclui meses futuros)
- "Todos os meses": atualiza o card
- "Este e anteriores": so atualiza se o mes selecionado >= mes atual

Uma unica alteracao de ~10 linhas no `handleSave` do `SquadEditDialog`.

