

# Corrigir Dashboard de Churn - Dados Hardcoded e Pipeline IDs Incorretos

## Problema Identificado

O Dashboard de Churn exibe "3 Churns Operacionais" e "3 Churns Total" mesmo com o banco de dados vazio. Isso acontece por dois motivos:

1. **Pipeline IDs hardcoded incorretos**: O componente consulta pipelines antigos que nao existem mais (`1242a985-...` e `5dfc98f3-...`), fazendo as queries retornarem sempre vazio
2. **Fallback para dados hardcoded**: Quando o banco retorna vazio, o sistema usa um array de dados antigos fixos no codigo (Athena: 2 churns, Artemis: 1 churn)

## O Que Sera Feito

### 1. Remover dados hardcoded de fallback
- Remover o array `churnData` (linhas 74-180) com os valores fixos antigos
- Remover as constantes hardcoded de MRR base (`CORRECT_MRR_BASE_BY_SQUAD`, `CORRECT_MRR_BASE_TOTAL`, `MRR_PERDIDO_TOTAL`, `MRR_VENDIDO`, `UPSELL_TOTAL`)
- Remover os arrays `historicalData` e `churnQuantityByMonth` com dados fictícios

### 2. Corrigir os Pipeline IDs
- Substituir o pipeline ID antigo de "Clientes ativos" (`1242a985-2f74-4b4a-bc0e-c045a3951d65`) pelo correto (`749ccdc2-5127-41a1-997b-3dcb47979555`)
- Substituir o pipeline ID antigo de "Clientes Perdidos" (`5dfc98f3-9614-419a-af65-1b87c8372aeb`) pelo correto (`38ce6be3-a9ee-450a-89be-2afe762bf50f`)
- Buscar os pipeline IDs dinamicamente do banco em vez de hardcoded

### 3. Ajustar logica de fallback
- Quando nao houver dados no banco, mostrar zeros em vez de dados fictícios antigos
- Remover a linha `const dataToUse = churnDataFromDB.length > 0 ? churnDataFromDB : churnData` e usar sempre os dados do banco

## Detalhes Tecnicos

### Arquivo modificado
- `src/components/ChurnMetrics.tsx`

### Mudancas principais
- Buscar pipelines CSM dinamicamente: `SELECT id, name FROM csm_pipelines WHERE is_active = true`
- Usar os IDs retornados nas queries de churn em vez de constantes fixas
- Calcular MRR base a partir dos dados reais do banco
- Manter graficos de tendencia funcional, mas alimentados por dados reais (tabela `churn_monthly_history`)

