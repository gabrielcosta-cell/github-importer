

## Analise de Larguras dos Botoes do Toolbar

Olhando as screenshots e o codigo, o problema e o **padding horizontal inconsistente** entre os botoes:

| Botao | Padding Atual | Resultado |
|---|---|---|
| Ordenar (CSM/CRM) | `px-2` | Mais estreito |
| Filtros (CRM DateFilter) | `size="sm"` sem px explicito = `px-3` | Medio |
| Filtros (CSM FilterPopover) | `size="sm"` sem px explicito = `px-3` | Medio |
| Adicionar lead/cliente | `px-3` | Medio |
| Engrenagem | `size="icon"` (quadrado) | OK |
| Pipeline Selector | `min-w-[160px]` / auto | OK |

### Correcao

Padronizar o padding horizontal de todos os botoes de texto para **`px-3`**, que e o padrao do `size="sm"` do design system.

**Arquivos a alterar:**

1. **`src/components/CRMOpsKanban.tsx`** (linha 273)
   - Botao Ordenar: `px-2` → `px-3`

2. **`src/components/CSMKanban.tsx`** (linha 965)
   - Botao Ordenar: `px-2` → `px-3`

Apenas esses dois botoes estao fora do padrao. Os demais ja usam `px-3` (explicito ou via `size="sm"` default).

