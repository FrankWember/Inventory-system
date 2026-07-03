# BarTrack — Full Platform Audit (2026-07-03)

Scope: code, architecture, database, security, UI/UX, responsiveness — verified against the
**production web build** served locally and the **live Supabase backend** (signup → login →
RLS-scoped data access all exercised end-to-end at mobile / tablet / desktop widths, in
light and dark mode).

**Baseline health:** typecheck clean · 264/264 tests pass · production export builds cleanly ·
zero console errors in the built app.

---

## 1. Issues found and FIXED in this audit

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **Critical** | **Infinite splash spinner on first (cold-cache) load.** expo-font's web font observer can time out/reject even though the fonts load fine; `App.tsx` ignored the error and waited forever. Reproduced in the production build. | `App.tsx` now proceeds when fonts load, error out, **or after a 3s timeout** — fonts still apply retroactively via CSS. |
| 2 | **High (security)** | **"Exporter les données (JSON)" included the session tokens** (access + 30-day refresh token). Anyone given that export file could take over the account. | `storage.ts` export now excludes all credential keys. `clearCache()` was also still protecting the *old* Supabase-Auth keys — it would have wiped the new custom-auth session; fixed. |
| 3 | High | **Desktop sidebar never highlighted the active page** (it read the stack route "MainTabs" instead of the focused tab; also wrong on deep links where nested state starts stale). | `ResponsiveLayout.tsx` drills into nested navigation state incl. the PartialState case. Verified: highlight follows clicks *and* direct URL loads. |
| 4 | High | **Dark mode was broken on key surfaces**: Dashboard stat cards were white-on-white (unreadable), Sidebar / mobile tab bar / Trends cards / skeletons stayed light. | Themed: Dashboard glass cards, Sidebar, bottom tab bar, shared `Card`, all `Skeleton` variants, stack headers, loading screens. Verified visually in dark + light. |
| 5 | Medium | **A transient auth-server error (5xx / cold start) logged the user out** (`auth-refresh` failure cleared the session; `restoreSession` did the same when offline). | Session now only ends on definitive 400/401/403 rejection; transient failures keep tokens and retry on the next request. |
| 6 | Medium | Sidebar labels were hardcoded French, ignoring the language setting. | Now uses the same i18n keys as the tab bar (+ new `misc.sidebarSubtitle` FR/EN). |
| 7 | Low | Add-drink screen didn't reflow on window resize (`Dimensions.get` without subscription). | Switched to `useWindowDimensions()`. |
| 8 | Low | Browser tab title showed raw route names ("SignIn", even "undefined" during onboarding). | `documentTitle` formatter → "BarTrack — Gestion d'inventaire". |
| 9 | Low | Skeleton shimmer spammed 48 `useNativeDriver` warnings in the web console. | JS driver on web, native driver elsewhere. |
| 10 | Cleanup | `src/screens/SessionScreen.tsx.backup` shipped in the source tree. | Removed. |

All fixes re-verified: typecheck ✓, 264 tests ✓, fresh production build ✓, live preview at
375 / 768 / 1280 px in both themes ✓, no console errors ✓.

## 2. Action required by you (5 minutes)

1. **Run [supabase-audit-followup.sql](supabase-audit-followup.sql)** in the Supabase dashboard SQL editor (safe on live data):
   - adds the missing **UNIQUE constraint on `settings.user_id`** (the app assumes one row per user),
   - purges expired refresh/reset tokens (they currently accumulate forever) + optional daily pg_cron job.
2. **Delete the QA account** created for end-to-end verification (or keep it for testing):
   `qa-claude-audit@example.com` / +237 699 000 001 — the commented `DELETE` is in the same SQL file.
3. **Redeploy to Vercel** (`git push` after you commit) so the fixes reach production.

## 3. What's healthy (verified, no action needed)

- **Architecture**: clean layering — screens → AuthContext/SettingsContext → authClient/authTokens → Edge Functions; calculation logic isolated and fully unit-tested; no console.log leftovers; no TODO debt; `.env` correctly untracked.
- **Custom auth**: PBKDF2 + per-user salt, constant-time comparisons, rotating single-use refresh tokens stored hashed, single-use hashed reset tokens that revoke all sessions, uniform "email exists?" responses, single-flight client refresh. Signup/login (email **and** phone), JWT→RLS isolation all verified live.
- **Database**: RLS on all tables (auth tables have *no* policies — service-role only), per-user policies on all data tables, sane CHECK constraints and indexes, seed-settings trigger works (verified live).
- **Web deployment**: SPA rewrites, immutable caching for hashed assets, nosniff/frame headers, PWA manifest, SPA routing + deep links + refresh-stays-on-page all verified.
- **Responsiveness**: bottom tabs <768px / sidebar ≥768px, per-screen desktop layouts, correct behavior verified at all three sizes.

## 4. Known limitations / recommended next steps (not blocking)

1. **A few screens are still light-only** (SessionDetail, EditDrink, native AuthScreen ~56 static color refs). They're readable in dark mode (self-consistent light surfaces), just untinted. Migrate to `useSettings().colors` when convenient.
2. **No rate limiting on auth endpoints** — `auth-login` will accept unlimited password guesses. Recommend a per-IP/per-account counter (e.g. simple table check in the Edge Function) or Cloudflare/Turnstile in front.
3. **PBKDF2 iterations = 100k** — acceptable, OWASP now suggests ~600k. Raising it requires versioning hashes (re-hash on next successful login), since a blind change would invalidate existing passwords.
4. **Bar name lives only in local AsyncStorage** (`settings.bar_name` in the DB is written at onboarding but never read back) — a second device shows "Non défini". Consider reading/writing the DB row in `SettingsContext`.
5. **Multi-tab web**: two tabs refreshing simultaneously can race the rotating refresh token; the loser falls back cleanly now (fix #5), but a `BroadcastChannel` lock would remove the race entirely.
6. **Data-load errors are silent** (screens show empty states). Consider an inline "réessayer" error state.
7. **Onboarding step 3 requires configuring all selected drinks** before continuing (button disabled with a counter). Fine, but with 23 pre-selected drinks it's a long first run — consider "configure later" defaults.
8. **Signup requires a phone number** although the field looks optional — either mark it required in the UI or make it truly optional (it's only needed for phone login).
9. **500 responses from Edge Functions echo internal error messages** — mostly harmless, but mapping to generic messages is cleaner.
10. Native (iOS/Android) was audited at code level only (safe-area handling, KeyboardAvoidingView, navigation persistence all present) — do one on-device pass before shipping the mobile build.
