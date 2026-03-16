

## Plan: Remove authentication requirement temporarily for testing

**Goal**: Allow any user to access the dashboard without logging in, in the test/preview environment.

**Approach**: Modify `ProtectedRoute` to skip authentication checks when running in the preview environment (Lovable preview). Production behavior stays unchanged.

### Changes

1. **`src/components/ProtectedRoute.tsx`** — Detect preview environment and bypass auth:
   - Add `isPreviewEnvironment` check (same logic already used in `Auth.tsx`)
   - If in preview, render children directly without auth checks
   - Production (`dotconceito.com`) keeps full authentication

2. **`src/pages/Auth.tsx`** — Auto-redirect to dashboard in preview:
   - If in preview environment and no user, redirect straight to `/dashboard?view=csm` instead of showing login

### What stays the same
- Production authentication is untouched
- Edge Function `create-user` logic remains as-is
- All role checks inside components remain (they just won't block access)

### Risk
- Profile-dependent features (role checks, user name display) may show empty/null values since there's no authenticated user. Components that call `useAuth()` will get `user: null` and `profile: null`.
- This is acceptable for testing UI layout and flows, but features requiring real user data (like creating cards assigned to a user) won't fully work.

