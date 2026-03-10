

## Remover mensagem "Sincronizando..." do header do CSM

Remover o bloco condicional que exibe o spinner e texto "Sincronizando…" no header do CSM Kanban.

### Alteração

**`src/components/CSMKanban.tsx`** (linhas 965-970): Remover o bloco `{syncing && (...)}` que renderiza o indicador de sincronização.

