

# Remover conexão com Supabase externo

## Contexto

Atualmente o projeto tem **dois arquivos de cliente Supabase** que apontam para o **mesmo servidor** (`vkfvqhilrhmuaoopiucb.supabase.co`):

- `src/integrations/supabase/client.ts` -- cliente tipado (usado em poucos lugares)
- `src/integrations/supabase/external-client.ts` -- cliente sem tipagem (usado em **81 arquivos**)

A diferença e que o `external-client` foi criado sem tipagem (`Database`) para contornar o fato de que o arquivo `types.ts` so tem 2 tabelas definidas, enquanto o banco real tem ~40 tabelas.

## Plano

### 1. Atualizar `client.ts` para funcionar sem tipagem restritiva

Remover o generic `<Database>` do `createClient` em `client.ts` para que todas as tabelas do banco sejam acessiveis sem erros de TypeScript. Isso elimina a necessidade do arquivo separado.

### 2. Substituir todos os imports de `external-client` para `client`

Atualizar os **81 arquivos** que importam de `@/integrations/supabase/external-client` para importar de `@/integrations/supabase/client`.

Tambem substituir as importacoes de `externalSupabase` por `supabase` no arquivo `CustomerSuccessDashboard.tsx`.

### 3. Deletar `external-client.ts`

Remover o arquivo `src/integrations/supabase/external-client.ts` completamente.

### 4. Remover `FixItabanDuplicate.tsx` (se referencia o externo)

Este componente ja importa do external-client. Sera atualizado no passo 2.

---

## Detalhes tecnicos

**Arquivos modificados:**
- `src/integrations/supabase/client.ts` -- remover tipagem `Database`
- 81 arquivos com imports atualizados (busca e substituicao de `external-client` por `client`)
- `src/components/CustomerSuccessDashboard.tsx` -- trocar `externalSupabase` por `supabase`
- Deletar `src/integrations/supabase/external-client.ts`

**Risco:** Nenhum impacto funcional, pois ambos os clientes ja apontam para o mesmo servidor com as mesmas credenciais.

