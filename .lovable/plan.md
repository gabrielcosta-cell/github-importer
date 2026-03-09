

## Renomear funil Closer e ajustar etapas + renomear coluna Receita CRM

### Abordagem

A renomeação precisa acontecer tanto no código (constantes) quanto no banco de dados (pipeline e stages existentes). Os cards existentes não serão alterados — apenas o nome do pipeline e os nomes das etapas mudam.

### Alterações

**1. `src/utils/setupCRMOpsPipelines.ts`**
- Renomear constante: `CLOSER_PIPELINE_NAME = 'Upsell | CrossSell'`
- Adicionar constante legacy: `const CLOSER_PIPELINE_LEGACY_NAME = 'Closer | Principal'` para migração
- Atualizar `CLOSER_STAGES` para as novas etapas:
  - Oportunidades (position 0), Orçamento (1), Apresentação (2), Negociação (3), Em assinatura (4)
- Adicionar função de migração no `setupCRMOpsPipelines()`:
  - Buscar pipeline com nome `'Closer | Principal'`
  - Se encontrar, renomear para `'Upsell | CrossSell'` via UPDATE
  - Renomear/recriar as etapas existentes: mapear as 7 etapas antigas para as 5 novas, mantendo os cards nas etapas mais próximas (cards de R1/R1 Delay → Oportunidades, R2/R2 Delay → Orçamento, R3 → Apresentação, Follow Up → Negociação, Em assinatura → Em assinatura)
- Atualizar `CRM_OPS_PIPELINE_NAMES` para incluir o novo nome

**2. `src/utils/importCloserWonFeb.ts`**
- Atualizar referência de `'Closer | Principal'` para `'Upsell | CrossSell'`
- Manter referência a `'Em assinatura'` (etapa continua existindo)

**3. `src/components/GestaoProjetosOperacao.tsx`**
- Renomear label `"Receita CRM"` para `"Vendas CRM"` em:
  - Header da tabela (SortableHeader label, linha 581)
  - CSV export headers (linha 471)
  - Qualquer outro ponto que exiba esse texto (totalizadores no header)

### Migração de etapas (lógica no setupCRMOpsPipelines)

Os cards existentes precisam ser movidos para as novas etapas. A estratégia:
1. Buscar todas as etapas atuais do pipeline
2. Criar as novas etapas
3. Mover cards das etapas antigas para as novas (mapeamento por posição/nome)
4. Desativar ou excluir etapas antigas sem cards

Mapeamento:
```text
Antiga          → Nova
R1              → Oportunidades
R1 Delay        → Oportunidades
R2              → Orçamento
R2 Delay        → Orçamento
R3              → Apresentação
Follow Up       → Negociação
Em assinatura   → Em assinatura
```

### O que NÃO muda
- Nenhuma lógica de soma de valores ou cálculo de receita
- Nenhuma integração existente além da atualização de nomes
- Cards existentes mantêm todos os dados (valor, datas, etc.)

