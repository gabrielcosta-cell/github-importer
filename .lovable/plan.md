

## Remover animação de entrada do CSM Kanban

**Arquivo**: `src/components/CSMKanban.tsx` (linha 1131)

**Alteração**: Remover as classes `animate-in fade-in-0 zoom-in-95 duration-300` do wrapper do kanban board, mantendo apenas `h-full`.

Isso elimina o efeito de fade+zoom que ocorre toda vez que o CSM é exibido, tornando a transição instantânea.

