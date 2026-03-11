

## Plan: Remove password and department fields from user creation

Since all users are `@dotconceito.com` and login via Google only, the password and department fields are unnecessary.

### Changes

**`src/components/UserManagement.tsx`**:

1. **Remove password validation** (line 132): Change validation from `!formData.password` to just `!formData.name || !formData.email`
2. **Remove form fields** (lines 508-519): Remove the "Senha" input and "Departamento" input from the dialog
3. **Update formData resets** (lines 147, 209): Remove `password` and `department` from reset objects
4. **Update edge function call**: The `addUser` function already passes formData to the edge function — password will just be empty/undefined, which is fine since the `create-user` function already skips Auth user creation for `@dotconceito.com` emails

No changes needed to the edge function since it already handles the `@dotconceito.com` case without using the password.

