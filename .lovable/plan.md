

## Permitir edição de "Fase do contrato" por admins na tabela de Projetos

### O que será feito
Admins e Admin Global poderão clicar na coluna "Fase do contrato" para alterar a etapa do card no Kanban (1º Mês, 2º Mês, ..., Retenção), com dialog de confirmação e log de auditoria — mesmo padrão visual de Fee e Squad.

**Diferença**: como `stage_id` é um campo único no card (não usa snapshots por mês), o dialog não terá opções de propagação. A alteração move o card para a nova etapa no Kanban.

### Implementação

**1. Criar `src/components/projetos/StageEditDialog.tsx`**
- Dialog com select das stages do pipeline ativo (já disponíveis no hook)
- Ao salvar: `UPDATE csm_cards SET stage_id = X WHERE id = Y`
- Criar log em `csm_activities` (tipo `stage_change`)
- Sem propagação (campo direto, não snapshot)

**2. Atualizar `src/hooks/useProjetosData.ts`**
- Expor `stagesMap` (ou lista de stages) no retorno do hook para que o dialog tenha as opções

**3. Atualizar `src/components/GestaoProjetosOperacao.tsx`**
- Adicionar state `stageEditData` (mesmo padrão de `squadEditData`)
- Na célula "Fase do contrato" (linha 581): para admin/globalAdmin + source CSM, renderizar botão clicável com ícone Pencil (mesmo padrão do Squad)
- Renderizar `StageEditDialog` no final do componente
- Ao salvar, refetch dos dados (chamar refetch do hook)

**4. Atualizar `src/components/ProjetosView.tsx`**
- Passar função `refetchData` do hook para `GestaoProjetosOperacao` para que o componente possa recarregar os dados após alteração de stage

