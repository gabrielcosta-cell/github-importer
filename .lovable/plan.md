

## Editar Squad por mês na planilha de Projetos

### Contexto
A tabela `csm_project_snapshots` já possui a coluna `squad`. Atualmente os snapshots só armazenam/leem `monthly_revenue`. Precisamos expandir para também suportar squad por mês.

### Alterações

**1. Novo componente `src/components/projetos/SquadEditDialog.tsx`**
- Dialog similar ao `FeeEditDialog`, com:
  - Título "Editar Squad" + nome da empresa + mês/ano
  - Squad atual exibido como Badge
  - Select/RadioGroup com as opções de squad do sistema (Apollo, Artemis, Athena, Ares, Atlas)
  - Propagação: apenas este mês / este e anteriores / este e seguintes / todos os meses
  - Ao salvar: upsert em `csm_project_snapshots` com o campo `squad` nos meses afetados
  - Registro de atividade em `csm_activities` (activity_type: 'squad_change', descrição com squad anterior, novo, propagação, usuário, data/hora)
- Acesso permitido para admins e admin global (`profile?.role === 'admin' || isGlobalAdmin`)

**2. Alterações em `src/components/GestaoProjetosOperacao.tsx`**

- **fetchSnapshots**: Expandir select para incluir `squad` além de `monthly_revenue`. Criar um `squadSnapshotsMap` (Map<string, string>) paralelo ao `snapshotsMap` existente
- **liveData merge**: Aplicar squad do snapshot quando disponível (similar ao override de revenue)
- **Coluna Squad na tabela** (~linha 668-674): Para admins/global admins com source CSM, tornar o Badge clicável com ícone de lápis (igual ao Fee), abrindo o `SquadEditDialog`
- **State**: Adicionar `squadEditData` similar ao `feeEditData`
- **Renderizar** o `SquadEditDialog` no final do componente, similar ao `FeeEditDialog`

### Detalhes técnicos

- Snapshot upsert usa `onConflict: 'card_id,snapshot_month,snapshot_year'` (mesmo constraint existente)
- O `generateAffectedMonths` será reutilizado (exportado do FeeEditDialog ou extraído para utils)
- Badge do squad com snapshot terá cor amber (indicador visual igual ao fee com snapshot)

