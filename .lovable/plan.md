

## Plano: Tipos de receita no CRM Ops com migração automática para CSM

### Regras de negócio finais

| Tipo | Na aba Projetos | Ação automática |
|------|-----------------|-----------------|
| **Venda Única** | MRR apenas no mês de criação | Nenhuma |
| **Variável de Mídia** | MRR apenas no mês de criação | Nenhuma |
| **Variável sobre Meta** | MRR apenas no mês de criação | Nenhuma |
| **Venda Recorrente** | MRR apenas no mês de criação | No dia 1 do mês seguinte, cria automaticamente um card no CSM (Clientes Ativos) com os mesmos dados |

Todos os cards CRM Ops devem registrar `created_at` e `data_ganho` (data de ganho/fechamento) e ser filtráveis por ambos.

### Alterações

#### 1. Migration: novas colunas em `csm_cards`
- `tipo_receita` (text, check constraint: `venda_unica`, `variavel_midia`, `variavel_meta`, `venda_recorrente`)
- `migrado_csm` (boolean, default false) -- marca cards recorrentes já migrados
- `data_ganho` (date) -- data de fechamento/ganho do negócio

#### 2. Edge Function: `migrate-recurring-cards`
Função agendada via `pg_cron` para rodar diariamente (ou no dia 1 de cada mês). Lógica:
- Busca cards CRM Ops com `tipo_receita = 'venda_recorrente'` e `migrado_csm = false`
- Para cada card cuja `created_at` seja de um mês anterior ao mês atual:
  - Cria um card no pipeline Clientes Ativos (`749ccdc2-...`) copiando: `company_name`, `title`, `monthly_revenue`, `contact_name`, `contact_email`, `contact_phone`, `niche`, `squad`, `plano`, `servico_contratado`
  - Define `data_inicio` do novo card como o dia 1 do mês atual
  - Marca o card original com `migrado_csm = true`

#### 3. `CRMOpsCardForm.tsx` -- campo "Tipo de Receita"
- Adicionar Select com 4 opções ao formulário de criação de lead
- Adicionar campo `data_ganho` (date picker)
- Salvar `tipo_receita` e `data_ganho` no insert

#### 4. `CardDetailsDialog.tsx` -- exibir/editar `tipo_receita` e `data_ganho`
- Campos editáveis na aba Resumo para cards de pipelines CRM Ops
- Badge visual indicando o tipo de receita
- Indicador "Migrado para CSM" quando `migrado_csm = true`

#### 5. `CRMOpsKanban.tsx` -- filtros por mês de criação e data de ganho
- Aproveitar o filtro de data existente (`CRMOpsDateFilter`) para permitir filtrar por `created_at` ou `data_ganho`
- Adicionar toggle ou select para escolher qual campo filtrar

#### 6. `GestaoProjetosOperacao.tsx` -- integrar cards CRM Ops no MRR
- Buscar pipelines CRM Ops via `CRM_OPS_PIPELINE_NAMES`
- Query adicional: cards desses pipelines com `monthly_revenue > 0` e `migrado_csm = false`
- Adicionar `tipo_receita`, `data_ganho`, `migrado_csm`, `source` à interface `ProjetoRow`
- Regra em `wasRelevantInMonth`: todos os cards CRM Ops aparecem apenas no mês de `created_at`
- Badge "Venda Ops" + tipo na tabela
- Incluir no total de MRR e contagem

#### 7. `supabase/config.toml` -- registrar edge function
```toml
[functions.migrate-recurring-cards]
verify_jwt = false
```

#### 8. Cron job (SQL via insert tool)
Agendar `pg_cron` para chamar a edge function `migrate-recurring-cards` diariamente à meia-noite, garantindo que no dia 1 de cada mês os cards recorrentes sejam migrados.

### Resultado esperado
- **Fevereiro**: Ackno Site (Venda Única, R$ 2.850) + Paragon Bank (Venda Recorrente, R$ 4.000) somam ao MRR
- **Março (dia 1)**: Paragon Bank é automaticamente criada no CSM como card regular; o card CRM Ops é marcado como migrado e não aparece mais na aba Projetos; Ackno Site também não aparece (venda única de fevereiro)
- Todos os cards CRM Ops filtráveis por data de criação e data de ganho

