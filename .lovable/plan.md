

## Plan: Auto-link profiles on Google login for @dotconceito.com users

### Problem
When an admin creates a user (e.g. `jordantorma@dotconceito.com`), the edge function creates a Supabase Auth user (UUID-A) + profile linked to UUID-A. But when that user logs in via Google, Supabase creates a **different** Auth identity (UUID-B). The profile lookup by `user_id = UUID-B` fails, and the user gets signed out.

Additionally, `@dotconceito.com` users should **only** be able to log in via Google (not email/password).

### Changes

**1. `src/contexts/AuthContext.tsx` — Add email-based profile linking fallback**

In `loadProfileForUser`, when profile lookup by `user_id` returns PGRST116 (not found):
- Query `profiles` table by email instead
- If found and active, update the profile's `user_id` to the current Auth user's UUID (auto-link)
- Continue with that profile
- If not found by email either, sign out as before

**2. `src/pages/Auth.tsx` — Block email/password login for @dotconceito.com**

In `handleLocalLogin`:
- Before calling `signInWithPassword`, check if the email ends with `@dotconceito.com`
- If so, show a toast error: "Usuários @dotconceito.com devem entrar com Google" and abort
- Non-dotconceito emails continue with password login normally

**3. `supabase/functions/create-user/index.ts` — Skip Auth user creation for @dotconceito.com**

For `@dotconceito.com` emails:
- Do NOT create a Supabase Auth user (they'll authenticate via Google)
- Only insert the profile row with a placeholder `user_id` (use `gen_random_uuid()` or a deterministic placeholder)
- The profile will be auto-linked on first Google login via the fallback in step 1

For other emails:
- Keep current behavior (create Auth user + profile)

### Technical detail

```
Admin creates jordantorma@dotconceito.com
  → Edge function: only INSERT into profiles (no Auth user)
  → profile.user_id = random placeholder UUID

Jordan opens login page
  → Email/password blocked for @dotconceito.com
  → Clicks "Entrar com Google"
  → Supabase creates Google Auth user (UUID-G)

AuthContext.loadProfileForUser(UUID-G)
  → profiles.user_id = UUID-G? NO (PGRST116)
  → profiles.email = jordantorma@dotconceito.com? YES
  → UPDATE profiles SET user_id = UUID-G
  → Login succeeds
```

