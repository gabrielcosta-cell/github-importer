

## Edição de Fee (MRR) na tabela de Projetos com log de auditoria

### Resumo
Permitir que apenas o Admin Global edite o Fee (MRR) diretamente na tabela de Projetos, com dialog de propagação por meses, salvando snapshots em `csm_project_snapshots` e registrando um log de auditoria como atividade no card CSM via `csm_activities`.

### Implementação

**1. Novo componente `src/components/projetos/FeeEditDialog.tsx`**
- Dialog com: nome do cliente (readonly), valor atual, input do novo valor (currency), e RadioGroup com 4 opções:
  - Apenas este mês
  - Este mês e todos os anteriores
  - Este mês e todos os seguintes
  - Todos os meses
- Ao confirmar:
  - Calcula os meses afetados (limitados pelo `data_inicio` e `data_perda` do cliente)
  - Faz batch upsert em `csm_project_snapshots` para cada mês afetado
  - Insere uma atividade de auditoria em `csm_activities` com `activity_type: 'fee_change'` e descrição no formato solicitado:
    `"MRR alterado de R$5.440 para R$4.352 apenas para o mês de Janeiro/26 por Gabriel Costa - em 05/03/26"`

**2. Alterações em `src/components/GestaoProjetosOperacao.tsx`**
- Importar `useAuth` para verificar `profile.is_global_admin`
- Buscar snapshots do mês/ano selecionado ao carregar dados (query em `csm_project_snapshots`)
- No `displayData`, sobrescrever `monthly_revenue` com o valor do snapshot quando existir
- Na célula do Fee (MRR) (linha 608-610): se `is_global_admin`, renderizar o valor com ícone de edição e onClick que abre o `FeeEditDialog`; caso contrário, manter read-only
- Indicador visual (ex: ícone ou cor sutil) quando o valor exibido vem de um snapshot

**3. Registro de auditoria no card CSM**
- Inserir em `csm_activities` com:
  - `card_id`: o ID do card CSM
  - `activity_type`: `'fee_change'`
  - `title`: `'Alteração de Fee (MRR)'`
  - `description`: texto formatado com valor anterior, novo valor, meses afetados, nome do usuário, data/hora
  - `created_by`: user.id do Admin Global

### Arquivos

1. **`src/components/projetos/FeeEditDialog.tsx`** — novo componente
2. **`src/components/GestaoProjetosOperacao.tsx`** — fetch de snapshots, merge no displayData, célula editável para Admin Global

