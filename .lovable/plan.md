

## Acelerar carregamento da página de Projetos

### Problema
Toda vez que a página de Projetos é aberta, o hook `useProjetosData` faz múltiplas queries ao Supabase e exibe "Carregando..." até concluir. Não há cache de sessão como no CSM/CRM.

### Solução

**1. Criar session cache para Projetos (`src/utils/projetosSessionCache.ts`)**
- Cache de `rawCsmRows`, `rawCrmRows` e `stagesList` no `sessionStorage` com validade de 1h.
- Mesmo padrão dos caches já existentes (CSM e CRM Ops).

**2. Usar cache no hook (`src/hooks/useProjetosData.ts`)**
- Inicializar `rawCsmRows`, `rawCrmRows` e `stagesList` com dados do cache.
- Se cache existe, setar `loading = false` imediatamente.
- Buscar dados em background e atualizar silenciosamente.
- Persistir no cache após cada fetch.

**3. Substituir "Carregando..." por skeletons**
- Em `GestaoProjetosOperacao.tsx` (linha 472): trocar texto por skeleton rows (4-5 linhas de `Skeleton` imitando a tabela).
- Em `SquadsDashboard.tsx` (linha 209): trocar por skeleton cards.

### Resultado
- Retornos à página de Projetos são instantâneos (dados do cache).
- Primeira abertura mostra skeletons em vez de texto simples.

