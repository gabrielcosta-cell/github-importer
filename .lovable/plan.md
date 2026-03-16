

## Plan: Adicionar usuário Alana Fagundes ao banco de dados

**Objetivo**: Inserir o perfil de `alana.fagundees@dotconceito.com` como admin na tabela `profiles`.

### Abordagem

Como o email é `@dotconceito.com`, o login será via **Google OAuth** (conforme política do sistema). Portanto, seguindo o padrão da Edge Function `create-user`:

1. **Inserir na tabela `profiles`** via `psql` com:
   - `user_id`: UUID placeholder (será substituído automaticamente no primeiro login Google via auto-link)
   - `email`: `alana.fagundees@dotconceito.com`
   - `name`: `Alana Fagundes`
   - `role`: `admin`
   - `is_active`: true
   - `is_global_admin`: false
   - `project_scope`: `csm`

2. **Senha**: Não será necessária — usuários `@dotconceito.com` fazem login exclusivamente via Google OAuth. A senha `dot123` não se aplica neste fluxo.

### Nota importante
- No primeiro login via Google, o sistema fará o auto-link do perfil pelo email, vinculando o `user_id` do Auth ao perfil existente.
- Como `role = admin`, ela terá permissões de administrador (mas não Admin Global).

