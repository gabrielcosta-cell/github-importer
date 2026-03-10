

## Eliminar loading ao intercalar entre CSM e CRM

### Problema
Ao trocar entre CSM e CRM no dashboard, os componentes são desmontados e remontados, causando loading toda vez. O CSM tem session cache que ameniza, mas o CRM Ops não tem nenhum cache.

### Solução

**1. Manter CSM e CRM montados simultaneamente (`src/pages/Index.tsx`)**
- Em vez de renderizar apenas o componente ativo via `switch`, manter CSM e CRM Ops sempre montados mas ocultos com `display: none` quando não estão ativos.
- Os demais módulos continuam com renderização condicional normal.
- Isso elimina o remount e mantém o estado em memória ao trocar entre as duas views.

**2. Adicionar session cache ao CRM Ops (`src/utils/crmOpsKanbanSessionCache.ts`)**
- Criar cache similar ao `csmKanbanSessionCache.ts` para persistir pipelines, stages e cards do CRM Ops.
- Validade de 1h, mesmo padrão do CSM.

**3. Usar cache no CRM Ops (`src/components/CRMOpsKanban.tsx`)**
- Inicializar estado com dados do cache (pipelines, stages, cards, selectedPipeline).
- Se cache existe, não exibir loading -- sincronizar em background.
- Persistir dados no cache após cada atualização.

### O que muda para o usuário
- Trocar entre CSM e CRM é instantâneo, sem tela de loading.
- Primeira abertura do CRM Ops ainda pode ter loading breve (sem cache), mas retornos subsequentes são instantâneos.

