

## Substituir Tabs por seletor dropdown estilo PipelineSelector

### O que muda

Na página `Pipelines.tsx`, substituir as **Tabs** (Churn/CSAT/NPS) por um **botão dropdown com Popover** idêntico ao `PipelineSelector` do CSM/CRM Ops -- um botão com ícone Kanban, nome do pipeline selecionado e ChevronDown que abre lista de opções.

### Alteração

**`src/pages/Pipelines.tsx`**

Remover o componente `Tabs/TabsList/TabsTrigger` e substituir por um Popover com a mesma estrutura visual do `PipelineSelector`:

- Botão com `w-[220px]`, ícone `Kanban`, texto do pipeline ativo ("Churn" / "CSAT" / "NPS"), e `ChevronDown`
- PopoverContent com 3 botões (Churn, CSAT, NPS), o ativo com `variant="default"`, os outros `variant="ghost"`
- Sem opções de "Novo Funil" ou "Organizar Ordem" (pipelines fixos)
- Manter o mesmo layout de header (SidebarTrigger + seletor)

