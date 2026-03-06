

## Remover SDR, tornar Upsell|CrossSell padrão + criar funis Variável

### Resumo

1. Remover o funil "SDR | Principal" do CRM Ops
2. Tornar "Upsell | CrossSell" o funil padrão ao abrir CRM Ops
3. Criar dois novos funis: "Variável | Verba de Mídia" e "Variável | Vendas do cliente", cada um com uma única etapa "Comissões a receber"
4. Integrar os valores desses funis na planilha de Projetos com colunas dedicadas, usando a mesma lógica de vinculação por `display_id`

---

### Alterações

**1. `src/utils/setupCRMOpsPipelines.ts`**
- Remover `SDR_PIPELINE_NAME`, `SDR_STAGES` e toda lógica de criação do SDR
- Adicionar dois novos pipelines:
  - `VARIAVEL_MIDIA_PIPELINE_NAME = 'Variável | Verba de Mídia'`
  - `VARIAVEL_VENDAS_PIPELINE_NAME = 'Variável | Vendas do cliente'`
- Ambos com uma única etapa: `{ name: 'Comissões a receber', color: '#10B981', position: 0 }`
- Criar funções `ensurePipelineWithStages` para cada um
- Atualizar `CRM_OPS_PIPELINE_NAMES` para incluir os 3 funis (Upsell, Var. Mídia, Var. Vendas) e remover SDR
- Retornar os IDs dos 3 pipelines

**2. `src/components/CRMOpsKanban.tsx`**
- Remover referência ao SDR como pipeline padrão (linha 69)
- Alterar para selecionar "Upsell | CrossSell" como padrão:
  ```ts
  const upsellPipeline = crmPipelines.find(p => p.name === 'Upsell | CrossSell');
  setSelectedPipeline(upsellPipeline?.id || crmPipelines[0].id);
  ```

**3. `src/components/GestaoProjetosOperacao.tsx` — ProjetoRow interface**
- Adicionar campos:
  ```ts
  variavel_midia_revenue?: number
  variavel_vendas_revenue?: number
  ```

**4. `src/components/GestaoProjetosOperacao.tsx` — Fetch e merge**
- No `fetchData`, buscar cards dos 3 pipelines CRM (já busca por `CRM_OPS_PIPELINE_NAMES`)
- No `liveData` (merge), além de calcular `crm_revenue` (Upsell|CrossSell), calcular separadamente:
  - `variavel_midia_revenue`: soma do `monthly_revenue` dos cards do pipeline "Variável | Verba de Mídia" com mesmo `display_id`
  - `variavel_vendas_revenue`: soma do `monthly_revenue` dos cards do pipeline "Variável | Vendas do cliente" com mesmo `display_id`
- Para isso, precisar guardar `pipeline_id` nos `rawCrmRows` e buscar o nome do pipeline para distinguir
- Cards sem `display_id` correspondente no CSM aparecem como linhas independentes com origem = nome do funil

**5. `src/components/GestaoProjetosOperacao.tsx` — Colunas e UI**
- Adicionar colunas no header (após "Vendas CRM"):
  - `SortableHeader label="Var. Mídia"` → `variavel_midia_revenue`
  - `SortableHeader label="Var. Vendas"` → `variavel_vendas_revenue`
- Atualizar coluna "Total" para somar todos: `monthly_revenue + crm_revenue + variavel_midia_revenue + variavel_vendas_revenue`
- Adicionar `TableCell` correspondentes no body
- Atualizar `COLUMN_ACCESSORS` com os novos campos
- Atualizar totais no header (somar as novas receitas no total geral)
- Atualizar CSV export com as novas colunas

**6. Lógica de origem para cards sem match CSM**
- Na coluna "Origem", ao invés de exibir "Venda Ops" genérico, exibir o nome do funil de origem (ex: "Var. Mídia", "Var. Vendas", "Upsell")
- Adicionar campo `pipeline_name` ao `ProjetoRow` para rastrear a origem específica

---

### Fluxo de dados dos novos funis

```text
Card criado no funil "Variável | Verba de Mídia"
  ├─ Tem display_id = #0015 (existe no CSM)
  │   └─ Valor aparece na coluna "Var. Mídia" da linha #0015
  └─ Não tem display_id correspondente no CSM
      └─ Aparece como linha independente, Origem = "Var. Mídia"
```

### O que NÃO muda
- Lógica de snapshots e Fee editing
- Estrutura do banco (usa mesmas tabelas `csm_pipelines`, `csm_stages`, `csm_cards`)
- Lógica de churn e MRR Perdido

