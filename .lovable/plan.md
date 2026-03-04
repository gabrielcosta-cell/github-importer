

## Plano: Aba Projetos com layout de planilha + snapshot mensal

### Contexto
A aba Projetos atual (`GestaoProjetosOperacao.tsx`) carrega dados do `csm_cards` mas exibe apenas 9 colunas genéricas (nome, squad, plano, tipo, status, meta vendas, budget mensal/semanal, rotinas). O objetivo é transformar essa tabela para espelhar a planilha original, usando os campos que já existem nos cards CSM, e adicionar uma funcionalidade de snapshot mensal.

### O que será feito

**1. Refatorar a query de dados da aba Projetos**
- Expandir o `select` do Supabase para trazer todos os campos relevantes: `display_id`, `company_name`, `title`, `squad`, `plano`, `fase_projeto`, `monthly_revenue`, `servico_contratado`, `data_contrato`, `data_inicio`, `tempo_contrato`, `valor_contrato`, `niche`, `existe_comissao`, `observacao_comissao`, `criativos_estaticos`, `criativos_video`, `lps`, `limite_investimento`, `churn`, `data_perda`, `motivo_perda`, `client_status`, `created_at`
- Calcular campos derivados: **Etapa Formal** (baseado em `data_inicio`), **Tempo de DOT** (meses desde `data_inicio`)

**2. Redesenhar a tabela no formato da planilha**
Colunas na ordem (usando nomes do sistema):
1. **Data** — mês/ano de referência (filtro seletor no topo, não coluna por linha)
2. **ID** — `display_id` (#0001)
3. **Nome** — `company_name` ou `title`
4. **Squad** — badge colorido
5. **Plano** — badge colorido
6. **Etapa Formal** — calculada de `data_inicio`
7. **Fase do Projeto** — `fase_projeto`
8. **Fee (MRR)** — `monthly_revenue`
9. **Serviço** — `servico_contratado`
10. **Data de Assinatura** — `data_contrato`
11. **Tempo de DOT** — calculado
12. **Tempo de Contrato** — `tempo_contrato`
13. **Valor de Contrato** — `valor_contrato`
14. **Nicho** — `niche`
15. **Comissão** — `existe_comissao` + `observacao_comissao`
16. **Criativos Estáticos** — `criativos_estaticos`
17. **Criativos em Vídeo** — `criativos_video`
18. **LPs** — `lps`
19. **Limite de Investimento** — `limite_investimento`
20. **Churn** — `data_perda`
21. **Motivo** — `motivo_perda`

A tabela terá scroll horizontal para acomodar todas as colunas, similar à planilha.

**3. Criar funcionalidade de snapshot mensal**
- Criar uma nova tabela no Supabase via migration: `csm_project_snapshots` com colunas:
  - `id` (uuid PK)
  - `card_id` (FK para csm_cards)
  - `snapshot_month` (integer 1-12)
  - `snapshot_year` (integer)
  - `status` (text — ativo/cancelado)
  - `squad`, `plano`, `fase_projeto`, `monthly_revenue`, `servico_contratado`, etc. (snapshot dos valores naquele mês)
  - `created_at` (timestamp)
  - Unique constraint em `(card_id, snapshot_month, snapshot_year)`
- Adicionar um botão "Gerar Snapshot" no header que salva o estado atual de todos os clientes ativos para o mês selecionado
- Adicionar um seletor de mês/ano no topo que, quando selecionado, exibe os dados do snapshot daquele mês em vez dos dados em tempo real
- O mês "atual" mostra dados em tempo real do banco

**4. Registrar tempo ativo do cliente**
- Usar `data_inicio` (já existente nos cards) como data de início do cliente
- Calcular "Tempo de DOT" dinamicamente (meses desde `data_inicio` até hoje ou até `data_perda` se cancelado)
- Exibir na coluna "Tempo de DOT" da tabela

### Detalhes técnicos

**Migration SQL** — Nova tabela `csm_project_snapshots`:
```sql
CREATE TABLE csm_project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES csm_cards(id) ON DELETE CASCADE NOT NULL,
  snapshot_month integer NOT NULL CHECK (snapshot_month BETWEEN 1 AND 12),
  snapshot_year integer NOT NULL,
  status text DEFAULT 'ativo',
  squad text,
  plano text,
  fase_projeto text,
  monthly_revenue numeric DEFAULT 0,
  servico_contratado text,
  data_contrato text,
  data_inicio text,
  tempo_contrato text,
  valor_contrato numeric DEFAULT 0,
  niche text,
  existe_comissao boolean DEFAULT false,
  criativos_estaticos integer,
  criativos_video integer,
  lps integer,
  limite_investimento numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(card_id, snapshot_month, snapshot_year)
);
ALTER TABLE csm_project_snapshots ENABLE ROW LEVEL SECURITY;
```

**Arquivos modificados**:
- `src/components/GestaoProjetosOperacao.tsx` — reescrita quase total: nova interface Projeto, nova query, nova tabela com todas as colunas, seletor de mês, lógica de snapshot
- `src/types/kanban.ts` — sem alterações (campos já existem)

**Fluxo do snapshot**:
1. Usuário seleciona mês/ano no seletor
2. Se é o mês atual → mostra dados em tempo real do `csm_cards`
3. Se é um mês passado → busca dados do `csm_project_snapshots`
4. Botão "Salvar Snapshot" (visível apenas no mês atual) → insere/atualiza registros na tabela de snapshots com os dados atuais de cada card ativo

