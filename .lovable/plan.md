

## Importar 7 Clientes Ativos (Squad Apollo) no Pipeline "Clientes Ativos"

### Objetivo
Inserir 7 cards de clientes ativos do Squad Apollo no pipeline "Clientes Ativos" (ID: `749ccdc2-5127-41a1-997b-3dcb47979555`), mapeando cada um para a etapa correta do kanban.

### Clientes a Inserir

| # | Empresa (title) | Fee (MRR) | Plano | Etapa Formal | Fase Projeto | Servico | Assinatura | Tempo DOT | Tempo Contrato | Valor Contrato | Nicho |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | PluggTo | 2.450 | Pro | Renovacao | Escala | Gestao de Trafego | 2025-08-01 | 5 | 6 | 14.700 | SaaS |
| 2 | Lebes | 19.900 | Conceito | Onboarding | Mes Teste | Gestao de Trafego | 2026-01-01 | 1 | 6 | 119.400 | Varejo |
| 3 | Versatil Banheiras (Social Media) | 2.450 | Business | Renovacao | Escala | Social Media | 2025-03-01 | 11 | 6 | 14.700 | Produto |
| 4 | Versatil Banheiras (Gestao de Trafego) | 2.450 | Business | Renovacao | Escala | Gestao de Trafego | 2025-03-01 | 11 | 6 | 14.700 | Produto |
| 5 | Oslo Group | 4.300 | Pro | Escala | Escala | Gestao de Trafego | 2025-09-01 | 4 | 6 | 25.800 | Mercado Financeiro |
| 6 | Sul Solar | 3.500 | Business | Escala | Refinamento | Gestao de Trafego | 2025-09-01 | 4 | 6 | 21.000 | Produto |
| 7 | Linx | 2.450 | Pro | Renovacao | Escala | Gestao de Trafego | 2025-08-01 | 5 | 6 | 14.700 | SaaS |

### Mapeamento Etapa Formal para Stage

Usando o mesmo mapeamento existente:
- Onboarding -> "1 Mes"
- Escala -> "4 Mes"
- Renovacao -> "6 Mes"

### Campos Comuns
- `pipeline_id` = `749ccdc2-5127-41a1-997b-3dcb47979555` (Clientes Ativos)
- `squad` = 'Apollo'
- `client_status` = 'ativo'
- `created_at` = '2026-02-01T12:00:00.000Z'

### Nota sobre "Versatil Banheiras"
Ha dois cards com nomes diferentes: "Versatil Banheiras (Social Media)" e "Versatil Banheiras (Gestao de Trafego)". Serao inseridos como cards separados com `title` e `company_name` distintos.

### Implementacao Tecnica

1. **Criar arquivo** `src/utils/importActiveClientsApollo.ts`
   - Seguir o padrao de `importCancelledClients.ts`
   - Pipeline ID fixo: `749ccdc2-5127-41a1-997b-3dcb47979555`
   - Usar mapeamento ETAPA_TO_STAGE para resolver stage_id
   - Verificar duplicatas por `company_name` + `pipeline_id`
   - Campos: squad, plano, monthly_revenue, value, servico_contratado, data_contrato, data_inicio, tempo_contrato, valor_contrato, niche, fase_projeto, client_status='ativo'

2. **Modificar** `src/components/CSMKanban.tsx`
   - Adicionar botao temporario "Importar 7 Clientes Ativos Apollo" visivel apenas para admins
   - Botao chama a funcao e exibe toast com resultado
   - Sera removido apos uso

