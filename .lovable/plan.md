

## Plano: Adicionar campos faltantes ao CSM Card

### Contexto
Dos 15 campos necessarios para cadastrar um cliente completo (ex: QJ Donuts), 11 ja existem no sistema. Faltam 5 campos: 3 novos no banco de dados e 2 calculados no frontend.

### 1. Migration SQL - Novos campos na tabela `csm_cards`

Adicionar 3 colunas:
- `etapa_real` (text) - fase real do projeto (select com opcoes)
- `valor_contrato` (numeric, default 0) - valor total do contrato
- `observacao_comissao` (text) - descricao da comissao

**Nota:** `etapa_formal` e `tempo_dot` sao calculados no frontend, nao precisam de coluna.

### 2. Atualizar tipo CSMCard em `src/types/kanban.ts`

Adicionar:
- `etapa_real?: string`
- `valor_contrato?: number`
- `observacao_comissao?: string`

### 3. Atualizar aba Resumo no `CardDetailsDialog.tsx`

Na secao Resumo (mobile e desktop), adicionar os novos campos na seguinte ordem apos os campos ja existentes:

**Campos calculados (somente leitura):**
- **Etapa Formal**: Mapeamento automatico baseado na diferenca de meses entre `data_inicio` e a data atual:
  - 1 mes = Onboarding
  - 2 meses = Implementacao
  - 3 meses = Refinamento
  - 4 meses = Escala
  - 5 meses = Expansao
  - 6 meses = Renovacao
  - 7+ meses = Retencao
- **Tempo de DOT**: Numero de meses desde `data_inicio` ate hoje (somente leitura)

**Campos editaveis:**
- **Etapa Real**: Select com opcoes: Onboarding, Implementacao, Refinamento, Escala, Expansao, Renovacao, Retencao, Cancelamento
- **Valor de Contrato**: Campo numerico editavel com formatacao em R$
- **Observacao Comissao**: Campo de texto que aparece abaixo do toggle Sim/Nao de comissao ja existente

### 4. Arquivos a modificar

| Arquivo | Alteracao |
|---|---|
| Migration SQL (nova) | Adicionar 3 colunas a `csm_cards` |
| `src/types/kanban.ts` | Adicionar 3 propriedades ao tipo CSMCard |
| `src/components/kanban/CardDetailsDialog.tsx` | Adicionar campos na aba Resumo (mobile + desktop) |

### Detalhes tecnicos

- A funcao de calculo de `etapa_formal` usara `differenceInMonths` do `date-fns` (ja instalado)
- O campo `valor_contrato` usara o mesmo padrao de `EditableCell` com type `currency`
- O campo `observacao_comissao` aparece condicionalmente apenas quando `existe_comissao` = true
- Ambas as secoes mobile e desktop do dialog serao atualizadas para manter paridade

