
## Importar 7 Clientes Cancelados no CSM

### Dados dos Clientes

Todos os 7 clientes serao inseridos com:
- `client_status = 'cancelado'`
- `data_perda = '2026-01-30'` (data de cancelamento)
- `churn = true`

### Mapeamento de Campos

| Campo do Usuario | Campo no Banco | Exemplo |
|---|---|---|
| Nome | company_name + title | QJ Donuts |
| Squad | squad | Artemis |
| Plano | plano | Business |
| Fase do Projeto | fase_projeto | Cancelamento |
| Fee | monthly_revenue | 3000 |
| Servico | servico_contratado | Gestao de Trafego |
| Assinatura | data_contrato | 2025-08-01 |
| Tempo de Contrato | tempo_contrato | 6 |
| Valor de Contrato | valor_contrato | 18000 |
| Nicho | niche | Franquia |
| Comissao (sim/nao) | existe_comissao | true/false |
| Comissao (texto) | observacao_comissao | 1e franquia das uni |
| Data Inicio | data_inicio | calculado a partir de Assinatura |

**Nota:** Etapa Formal e Tempo de DOT sao calculados automaticamente no frontend, nao precisam ser salvos.

### Clientes a Inserir

| # | Empresa | Squad | Plano | Fee | Contrato | Nicho | Comissao |
|---|---|---|---|---|---|---|---|
| 1 | QJ Donuts | Artemis | Business | 3.000 | 6m / 18k | Franquia | Sim: 1e franquia das uni |
| 2 | Rede Fooch | Apollo | Pro | 3.500 | 12m / 42k | Servico | Nao |
| 3 | Italia no Box | Athena | Business | 3.000 | 6m / 18k | Franquia | Nao |
| 4 | Aluga Ai | Athena | Business | 3.000 | 6m / 18k | Franquia | Sim: uando bater a meta |
| 5 | Master Crio | Ares | Pro | 4.900 | 6m / 29.4k | Produto | Sim: 2,5% sobre vendas |
| 6 | Belafer | Ares | Business | 3.000 | 6m / 18k | Produto | Nao |
| 7 | Unigama | Artemis | Pro | 4.200 | 6m / 25.2k | Educacao | Sim: nsalidade gerada pe |

### Implementacao Tecnica

1. **Criar funcao utilitaria** `src/utils/importCancelledClients.ts`
   - Funcao que recebe a lista de clientes parseada e insere no Supabase
   - Busca o pipeline "Clientes ativos" e uma stage existente para associar
   - Para cada cliente: verifica se ja existe (por company_name), atualiza ou insere
   - Define campos: `client_status='cancelado'`, `churn=true`, `data_perda='2026-01-30'`, `fase_projeto='Cancelamento'` (ou 'Cancelamento Comercial' para Master Crio)

2. **Executar a importacao** chamando a funcao com os 7 clientes hardcoded
   - A funcao sera invocada uma unica vez (pode ser via botao temporario ou diretamente no console)

3. **Campos por cliente inserido:**
   - `title`, `company_name`, `stage_id`, `pipeline_id`
   - `squad`, `plano`, `monthly_revenue`, `niche`
   - `servico_contratado` = 'Gestao de Trafego'
   - `data_contrato` (Assinatura convertida para formato ISO)
   - `data_inicio` (mesmo valor de data_contrato, para calculo de Tempo de DOT)
   - `tempo_contrato` (string: '6' ou '12')
   - `valor_contrato` (numerico)
   - `existe_comissao` (boolean)
   - `observacao_comissao` (texto, quando aplicavel)
   - `client_status` = 'cancelado'
   - `churn` = true
   - `data_perda` = '2026-01-30'
   - `fase_projeto` = 'Cancelamento' (ou 'Cancelamento Comercial')
   - `position` = 0, `created_by` = usuario autenticado

### Arquivo a criar
- `src/utils/importCancelledClients.ts` — funcao de importacao com os 7 clientes

### Arquivo a modificar
- `src/components/CSMKanban.tsx` — adicionar botao temporario (ou useEffect one-time) para executar a importacao, removivel apos uso
