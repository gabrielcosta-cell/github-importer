

## Importar 9 Clientes Cancelados de Fevereiro/2026

### Observacao Importante
Fevereiro nao tem 30 dias. A data de cancelamento sera ajustada para **28/02/2026** (ultimo dia de fevereiro).

### Clientes a Inserir

| # | Empresa | Squad | Plano | Fee | Etapa Formal | Servico | Contrato | Nicho | Comissao |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Inshape | Apollo | Pro | 4.900 | Renovacao | Gestao de Trafego | 6m / 29.4k | Produto | Sim: mensalidade de venda |
| 2 | 8 milimetros | Apollo | Starter | 2.800 | Renovacao | Gestao de Trafego | 6m / 16.8k | Servico | Sim: 5% (R$10.000 a R$5( |
| 3 | Face Doctor | Apollo | Conceito | 4.900 | Renovacao | Gestao de Trafego | 6m / 29.4k | Franquia | Sim: 1,8% (acima |
| 4 | Cotafacil | Apollo | Pro | 5.800 | Escala | Gestao de Trafego | 6m / 34.8k | Franquia | Nao |
| 5 | Grupo Bemba | Apollo | Pro | 3.600 | Refinamento | Gestao de Trafego | 6m / 21.6k | Servico | Sim: primeiro pagamento |
| 6 | Style Brazil | Apollo | Pro | 4.900 | Onboarding | Gestao de Trafego | 6m / 29.4k | Produto | Sim: rea as vendas dos lea |
| 7 | Rede Conecta | Artemis | Pro | 4.900 | Onboarding | Gestao de Trafego | 6m / 29.4k | Telecom | Nao |
| 8 | Connect Tecnologia (Gestao de Trafego) | Athena | Business | 1.750 | Renovacao | Gestao de Trafego | 6m / 10.5k | Servico | Nao |
| 9 | Connect Tecnologia (Social Media) | Athena | Business | 1.750 | Renovacao | Social Media | 6m / 10.5k | Servico | Nao |

### Campos Comuns
- `client_status` = 'cancelado'
- `churn` = true
- `data_perda` = '2026-02-28' (ultimo dia de fevereiro)
- `fase_projeto` = mesmo valor da Etapa Formal de cada cliente
- `position` = 0
- `created_by` = usuario autenticado

### Mapeamento de Datas de Assinatura
| Cliente | Assinatura | data_contrato |
|---|---|---|
| Inshape | 06/2025 | 2025-06-01 |
| 8 milimetros | 01/2025 | 2025-01-01 |
| Face Doctor | 03/2025 | 2025-03-01 |
| Cotafacil | 09/2025 | 2025-09-01 |
| Grupo Bemba | 10/2025 | 2025-10-01 |
| Style Brazil | 01/2026 | 2026-01-01 |
| Rede Conecta | 01/2026 | 2026-01-01 |
| Connect Tec (Trafego) | 11/2024 | 2024-11-01 |
| Connect Tec (Social) | 11/2024 | 2024-11-01 |

### Implementacao Tecnica

1. **Criar novo arquivo** `src/utils/importCancelledClientsFeb.ts`
   - Seguir o mesmo padrao do `importCancelledClients.ts` existente
   - Array com os 9 clientes hardcoded
   - Mesma logica: busca stages por nome, verifica duplicatas por company_name, insere ou atualiza
   - Nota: Connect Tecnologia aparece 2x com servicos diferentes — usar company_name diferenciado para evitar conflito

2. **Modificar** `src/components/CSMKanban.tsx`
   - Adicionar botao temporario "Importar 9 Clientes Cancelados (Fev)" ao lado do botao existente (ou substituir, caso o anterior ja tenha sido usado)
   - Botao chama a funcao de importacao e exibe toast com resultado

