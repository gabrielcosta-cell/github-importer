

## Plan: Add "User Type" toggle (DOT vs External) to user creation form

### What changes

**1. `src/components/UserManagement.tsx`** — UI form changes:
- Add `userType` field to `formData` state: `'dot' | 'external'` (default `'dot'`)
- Add a toggle/select in the creation dialog asking "Tipo de Usuário": **DOT** or **Externo**
- When `dot`: password field stays hidden (current behavior)
- When `external`: show password field with two options — type a password manually or click "Gerar senha aleatória" button
- Add `requirePasswordChange` boolean to formData (default `true` for external users)
- Pass `userType` and `requirePasswordChange` to the edge function
- Validation: require password when `userType === 'external'`
- Auto-detect: when email ends with `@dotconceito.com`, auto-set to `dot` and disable the toggle

**2. `supabase/functions/create-user/index.ts`** — Backend changes:
- Update validation: password required only when NOT a `@dotconceito.com` domain
- Accept optional `require_password_change` flag in the request body
- For external users: create Auth user with `email_confirm: true` and set user metadata `{ require_password_change: true }` so the app can detect first login and prompt password reset
- Edge function already handles the domain split; just need to relax the `!password` validation for DOT users

**3. `src/pages/Auth.tsx`** — After login for external users:
- Check `user.user_metadata.require_password_change`
- If `true`, redirect to `/set-password` page (already exists) to force a new password

### Form layout (creation dialog)

```text
┌─────────────────────────────┐
│ Nome *                      │
│ Email *                     │
│ Telefone                    │
│ Tipo de Usuário *           │
│  ○ DOT (Google)  ○ Externo  │
│                             │
│ [If external:]              │
│ Senha *  [Gerar aleatória]  │
│                             │
│ Nível de Acesso *           │
│       [Cancelar] [Adicionar]│
└─────────────────────────────┘
```

### Technical details

- Random password generation: `crypto.randomUUID().slice(0, 12)` (simple, strong enough for temp password)
- The `require_password_change` metadata is set server-side via `auth.admin.createUser({ user_metadata: { require_password_change: true } })`
- On Auth page, after successful password login, check metadata and redirect to `/set-password` if flag is true
- After password change on `/set-password`, update metadata to clear the flag

