
# Remover visualizacao em lista do CSM

## Resumo
Remover a opcao de visualizacao em lista no CSM Kanban, mantendo apenas a visualizacao Kanban. Isso envolve ocultar o botao de alternancia Kanban/Lista e remover o codigo da lista.

## Alteracoes

### Arquivo: `src/components/CSMKanban.tsx`

1. **Remover import** do `CSMClientsList` e do icone `List` do lucide-react
2. **Remover state** `viewMode` (linha 74)
3. **Remover bloco de botoes** Kanban/Lista (linhas ~759-780) - o toggle com os dois botoes
4. **Remover bloco condicional** que renderiza `CSMClientsList` quando `viewMode === 'list'` (linhas ~936-942) - manter apenas o conteudo do Kanban sem o ternario
5. **Remover referencias** a `viewMode` em qualquer outra parte do componente

O componente `CSMClientsList.tsx` sera mantido no projeto pois pode ser utilizado em outros contextos futuramente.
