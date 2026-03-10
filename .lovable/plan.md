

## Corrigir tempo de carregamento da página de Projetos

### Problema identificado

O hook `useProjetosData` tem dois problemas:

1. **`setLoading(true)` sobrescreve o cache**: Linha 21 faz `setLoading(true)` incondicionalmente dentro do `fetchData`, mesmo quando o cache já inicializou `loading = false` na linha 15. Isso causa um flash de skeleton desnecessário.

2. **Queries sequenciais**: As 3 queries (stages, csm_cards, crm pipelines + crm cards) rodam em sequência com `await` uma após outra, em vez de em paralelo. A query de stages (linhas 207-223) é duplicada -- já foi buscada na linha 24.

### Alterações

**`src/hooks/useProjetosData.ts`**

1. **Não setar loading quando cache existe**: Trocar `setLoading(true)` por `if (!cached) setLoading(true)` para que dados cacheados continuem visíveis enquanto o background fetch acontece.

2. **Paralelizar queries**: Executar stages, csm_cards e crm_pipelines com `Promise.all` em vez de sequencialmente. Reduz tempo de ~3 roundtrips sequenciais para ~1.

3. **Remover query duplicada de stages**: A query de `stagesList` (linhas 207-223) busca os mesmos dados que já foram buscados no `fetchData`. Reusar o resultado do fetch principal.

### Resultado
- Com cache: zero loading, dados aparecem instantaneamente.
- Sem cache: tempo reduzido pela metade (queries paralelas).

