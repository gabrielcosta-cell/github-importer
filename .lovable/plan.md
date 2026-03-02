

## Inserir 8 Clientes Ganhos no Closer (Fevereiro/2026)

### Objetivo
Adicionar 8 cards na etapa "Em assinatura" do pipeline "Closer | Principal" com status de GANHO e data 28/02/2026, totalizando R$ 10.081,93 em vendas.

### Clientes a Inserir

| # | Empresa | Valor |
|---|---|---|
| 1 | Plugg.to | R$ 20,00 |
| 2 | Versatil Banheiras | R$ 1.803,00 |
| 3 | Cafe da Fazenda | R$ 245,00 |
| 4 | Ackno | R$ 2.850,00 |
| 5 | Paragon | R$ 4.000,00 |
| 6 | CA Ingles | R$ 180,00 |
| 7 | Cantral de Espelhos | R$ 632,33 |
| 8 | Preditiva | R$ 351,60 |

**Total: R$ 10.081,93**

### Campos Comuns
- `pipeline_id` = ID do pipeline "Closer | Principal"
- `stage_id` = ID da etapa "Em assinatura"
- `created_at` = '2026-02-28' (para registro no mes de fevereiro)
- `value` / `monthly_revenue` = valor de cada cliente
- `position` = 0
- `situacao` = 'ganho' (ou campo equivalente para marcar como ganho)

### Implementacao Tecnica

1. **Criar arquivo** `src/utils/importCloserWonFeb.ts`
   - Seguir o mesmo padrao dos utilitarios de importacao existentes
   - Buscar o pipeline "Closer | Principal" e a stage "Em assinatura" dinamicamente
   - Array com os 8 clientes hardcoded
   - Verificar duplicatas por `company_name` + `pipeline_id`
   - Inserir cards com `created_at` fixo em 2026-02-28

2. **Modificar** `src/components/CRMOpsKanban.tsx`
   - Adicionar botao temporario "Importar 8 Ganhos Closer (Fev)" visivel apenas para admins
   - Botao chama a funcao e exibe toast com resultado
   - Botao sera removido apos uso

