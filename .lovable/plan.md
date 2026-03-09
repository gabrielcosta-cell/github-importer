

## Substituir "Etapa Formal" pela etapa do Kanban + renomear para "Fase do contrato"

### O que muda
- **"Etapa Formal"** (hoje calculada por `data_inicio`) → **"Fase do contrato"** mostrando a etapa real do Kanban (1º Mês, 2º Mês, ..., Retenção)
- **"Fase do Projeto"** permanece inalterada

### Implementação

**1. `src/hooks/useProjetosData.ts`**
- Adicionar `stage_id` ao select de `csm_cards`
- Buscar stages do pipeline de clientes ativos (`csm_stages` WHERE `pipeline_id = '749ccdc2...'`)
- Criar mapa `stage_id → name` e resolver `stage_name` no `liveData`

**2. `src/components/GestaoProjetosOperacao.tsx`**
- Adicionar `stage_name?: string` ao tipo `ProjetoRow`
- Renomear header "Etapa Formal" → "Fase do contrato"
- Substituir `calcEtapaFormal(p.data_inicio)` por `p.stage_name || '-'` na tabela, CSV e lógica de sort/filter
- Remover função `calcEtapaFormal`

