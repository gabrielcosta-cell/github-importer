
# Reestruturar Hierarquia de Usuarios: 3 Niveis

## Resumo

Criar uma hierarquia de 3 niveis no sistema:

| Nivel | Nome | Quem |
|-------|------|------|
| 1 | **Admin Global** | Apenas Gabriel Costa (fixo, unico) |
| 2 | **Administrador** | Usuarios promovidos pelo Admin Global |
| 3 | **Usuario Comum** | Todos os demais (sem distincao de cargo tipo SDR, Closer, etc.) |

## Tabela de Permissoes

| Acao | Admin Global | Admin | Comum |
|------|:-----------:|:-----:|:-----:|
| Ver aba de usuarios | Sim | Sim | **Nao** |
| Adicionar usuario comum | Sim | Sim | Nao |
| Adicionar usuario admin | Sim | **Nao** | Nao |
| Promover comum para admin | Sim | **Nao** | Nao |
| Rebaixar admin para comum | Sim | **Nao** | Nao |
| Desativar usuario comum | Sim | Sim | Nao |
| Desativar usuario admin | Sim | **Nao** | Nao |
| **Excluir** usuario (permanente) | Sim | **Nao** | Nao |
| Excluir cards/dados do CSM | Sim | Sim | **Nao** |
| Criar/editar cards | Sim | Sim | Sim |
| Visualizar modulos (conforme permissao) | Sim | Sim | Sim |

## Detalhes Tecnicos

### 1. Adicionar campo `is_global_admin` na tabela `profiles`

Criar uma migration adicionando uma coluna booleana `is_global_admin` (default `false`) na tabela `profiles`. Apenas o registro do Gabriel Costa tera `true`. Isso evita que qualquer admin se auto-promova -- apenas quem ja e global admin pode alterar esse campo.

Tambem executar um UPDATE para marcar o usuario Gabriel Costa como `is_global_admin = true`.

### 2. Simplificar roles: remover SDR/Closer como tipos distintos

- O campo `role` na tabela `profiles` passara a ter apenas 2 valores: `'admin'` e `'user'`.
- Remover as opcoes `sdr` e `closer` de todos os selects, tipos TypeScript e logica de negocio.
- Usuarios que hoje sao `sdr` ou `closer` serao migrados para `role = 'user'`.
- O tipo no `AuthContext` e `types/user.ts` sera atualizado para `'admin' | 'user'`.

### 3. Atualizar `AuthContext.tsx`

- Adicionar `is_global_admin` ao tipo `Profile`.
- Carregar `is_global_admin` ao buscar perfil do usuario.
- Expor `is_global_admin` no contexto para uso nos componentes.

### 4. Atualizar `useModulePermissions.tsx`

- Admin Global: acesso total (igual ao admin atual).
- Admin: acesso total exceto excluir outros admins e gerenciar admins.
- Usuario Comum: modulo `users` retorna `false` para todas as permissoes (nao ve a aba).
- Usuario Comum: `can_delete` retorna `false` para modulos de cards/CSM/pipelines.

### 5. Refatorar `UserManagement.tsx`

- **Admin Global**: ve todos os usuarios, pode criar qualquer tipo, promover/rebaixar, excluir permanentemente.
- **Admin**: ve apenas usuarios comuns, pode criar apenas usuarios comuns (select de role nao mostra "Admin"), pode desativar (nao excluir) apenas usuarios comuns.
- **Usuario Comum**: bloqueado de acessar a tela (ja tratado pelo `checkModulePermission`).
- Remover selects de SDR/Closer/Custom Roles do formulario de criacao -- agora o usuario e simplesmente "Comum" ou "Admin".
- Botao "Excluir" (permanente) so aparece para Admin Global; Admins veem apenas "Desativar".

### 6. Atualizar `ProtectedRoute.tsx`

- `requireAdmin` continua funcionando, agora checa `role === 'admin'` ou `is_global_admin`.
- Nenhuma mudanca estrutural necessaria, apenas ajustar o tipo de role.

### 7. Bloquear exclusao de cards para usuarios comuns

No componente `CardDetailsDialog.tsx`, o botao/acao de "Excluir" card so sera renderizado se `checkModulePermission('csm', 'delete')` retornar `true`. Como usuarios comuns terao `can_delete = false`, o botao sumira automaticamente. Verificar e adicionar essa checagem onde necessario.

### 8. Remover sistema de Custom Roles/Grupos

Como a hierarquia agora e fixa (Global Admin > Admin > Comum), o sistema de grupos customizados (`custom_roles`, `role_module_permissions`) e a UI de "Novo Grupo" serao simplificados. Os grupos de permissao por modulo ainda podem existir para controlar quais modulos cada usuario comum pode ver, mas a criacao de "cargos" como SDR, Closer sera removida.

### Arquivos a modificar

1. **Migration SQL** -- adicionar `is_global_admin`, migrar roles existentes
2. **`src/integrations/supabase/types.ts`** -- atualizar tipos gerados
3. **`src/types/user.ts`** -- role: `'admin' | 'user'`
4. **`src/contexts/AuthContext.tsx`** -- Profile com `is_global_admin`, role simplificado
5. **`src/hooks/useModulePermissions.tsx`** -- logica de permissao por nivel
6. **`src/components/UserManagement.tsx`** -- UI refatorada para 3 niveis
7. **`src/components/ProtectedRoute.tsx`** -- ajuste de tipos
8. **`src/components/kanban/CardDetailsDialog.tsx`** -- checagem de permissao no botao excluir
9. **Edge function `create-user`** -- aceitar apenas `'admin'` ou `'user'` como role
