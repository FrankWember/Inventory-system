# BarTrack Auth — Edge Functions

Custom authentication that replaces Supabase Auth. Each function does its own
authorization (password check or JWT verification), so the platform gateway JWT
check is disabled (`verify_jwt = false` in `../config.toml`).

## Functions

| Function              | Auth              | Purpose                                            |
| --------------------- | ----------------- | -------------------------------------------------- |
| `auth-signup`         | public            | Create a user (hashed password). No auto-login.    |
| `auth-login`          | public            | Verify password (email **or** phone) → session.    |
| `auth-refresh`        | refresh token     | Rotate refresh token → new access JWT.             |
| `auth-logout`         | refresh token     | Revoke a refresh token.                            |
| `auth-update-profile` | access JWT        | Update display name → returns refreshed token.     |
| `auth-request-reset`  | public            | Email a single-use reset link (Resend).            |
| `auth-confirm-reset`  | reset token       | Set a new password, revoke all sessions.           |

Access tokens are HS256 JWTs signed with the **project JWT secret**, carrying
`sub` = `users.id` and `role: authenticated`, so Postgres RLS (`auth.uid()`)
keeps isolating each user's rows unchanged.

## Required secrets

Set these in **Dashboard → Project Settings → Edge Functions → Secrets** (or via
`supabase secrets set`). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically — do **not** set them yourself.

| Secret           | Value                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `APP_JWT_SECRET` | Dashboard → Settings → API → **JWT Secret** (the project's JWT secret) |
| `RESEND_API_KEY` | Your Resend API key                                                   |
| `RESEND_FROM`    | e.g. `BarTrack <noreply@yourdomain.com>` (optional; defaults to Resend's sandbox sender) |
| `APP_URL`        | Production web URL, e.g. `https://your-app.vercel.app` (for reset links) |

> The `SUPABASE_` prefix is reserved — that's why the JWT secret is stored as
> `APP_JWT_SECRET`, not `SUPABASE_JWT_SECRET`.

## Deploy

With the Supabase CLI (recommended):

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy auth-signup auth-login auth-refresh auth-logout \
  auth-update-profile auth-request-reset auth-confirm-reset
supabase secrets set APP_JWT_SECRET=... RESEND_API_KEY=... APP_URL=... RESEND_FROM=...
```

No CLI? Create each function in **Dashboard → Edge Functions → Deploy a new
function**, paste the contents of the matching `index.ts` (inline the tiny
`_shared/*` helpers, or keep the import if the dashboard editor supports multiple
files), and set `Verify JWT = false`.
