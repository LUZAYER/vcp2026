
This builds on the foundation (auth/roles/tables), the intake + document workflows, and the AI risk + appeals engine planned earlier. This turn adds the executive analytics dashboard, enterprise admin surfaces, and the AI insights layer that ties them together.

## 1. Schema additions

Migration adds the rows the analytics + enterprise features actually read:

- `notifications` — id, user_id, kind (`auth_status_change` | `appeal_update` | `mention` | `high_risk` | `system`), title, body, link, read_at, created_at; RLS: owner only.
- `audit_logs` — id, actor_id, action text, entity_type text, entity_id uuid, before jsonb, after jsonb, ip text, user_agent text, created_at; insert-only, readable by admins only.
- `app_settings` — single-row table (org-wide): organization_name, logo_url, default_payer, notification_prefs jsonb, ai_model_overrides jsonb, branding jsonb; admins only.
- Extend `profiles`: `status` enum (`active`|`invited`|`suspended`), `last_seen_at`, `title`, `department`.
- Helper view `v_authorization_metrics` — pre-aggregates per-day counts by status, payer, risk bucket; used by the analytics queries to keep them cheap.
- DB function `app_audit(action, entity_type, entity_id, before, after)` SECURITY DEFINER — called from server fns to write audit rows consistently.
- RLS + GRANTs on every new table. Admin-only policies use the existing `has_role(auth.uid(), 'admin')`.

## 2. Executive Analytics Dashboard — `/_authenticated/analytics`

Two zones: KPI strip and chart grid. Time-range selector (7d / 30d / 90d / YTD / custom) + payer filter + department filter persist in URL search params.

**KPI cards (top strip)** — each shows value, delta vs previous period, sparkline:

- Total Authorizations
- Approval Rate
- Denial Rate
- Appeal Success Rate
- Average Approval Time (days, computed `decided_at - submitted_at`)
- High-Risk Cases (count with `denial_probability ≥ 70`)
- Staff Productivity (authorizations completed / active user / day)

**Charts (recharts):**

- **Monthly Trends** — multi-line: submitted, approved, denied, appealed.
- **Denial Reasons** — horizontal bar from grouped `risk_factors` of denied auths (server fn aggregates top 10 labels).
- **Payer Performance** — table+bar: per-payer volume, approval %, avg days, appeal win %.
- **Authorization Volume** — stacked bar by week, segmented by status.
- **Risk Distribution** — donut: Low / Medium / High / Critical buckets from `denial_probability`.
- **Approval Funnel** — funnel chart: submitted → under review → approved.

All charts read from a single server fn `getAnalyticsSnapshot({ range, payer?, department? })` that batches the aggregate queries and returns a typed DTO; cached via TanStack Query with the range/filters in the key.

Exports: "Export CSV" + "Export PDF" buttons on each chart card; both go through server fns (`pdf-lib` for PDF, plain CSV stream).

## 3. AI Insights panel

Server fn `generateAiInsights({ range })` in `src/lib/ai-insights.functions.ts` runs on demand (with a "Refresh" action, last-result cached in `app_settings.ai_insights` for the day):

- Loads the analytics snapshot + a denormalized sample of denied auths (status, payer, diagnosis, top risk factors, missing docs).
- Single AI SDK `Output.object` call (`google/gemini-3-flash-preview`, falls back to `google/gemini-2.5-pro` when sample >150 rows) returning:
  ```
  { denial_patterns: [{ pattern, frequency, payers[], recommended_action }],
    bottlenecks:     [{ stage, avg_days, severity, detail }],
    documentation_gaps: [{ doc_type, missing_in_pct, impact }],
    approval_optimizations: [{ suggestion, expected_lift_pct, confidence }] }
  ```
- Rendered as four collapsible cards on the analytics page with confidence chips, "Apply as filter" buttons that deep-link into the Authorizations table.
- Surfaces 402/429 gateway errors as toasts; never silently masks failures.

## 4. Enterprise admin surfaces (admin-gated layout)

New nested layout `src/routes/_authenticated/_admin/route.tsx` with `beforeLoad` checking `has_role(user, 'admin')`; non-admins are redirected to `/unauthorized` (new public-ish route under `_authenticated`).

Pages:

- **`/_admin/users`** — User Management. DataTable from `profiles` + `user_roles`: name, email, role, status, last seen. Actions: invite (Supabase Auth admin API via `supabaseAdmin` inside the handler), change role, suspend, delete; each writes `audit_logs`. Invite form sends a magic-link email via Supabase.
- **`/_admin/audit`** — Audit Logs. Filterable, paginated table: actor, action, entity, when. Row click → diff viewer (before/after JSON). Export CSV.
- **`/_admin/settings`** — Settings (also linked from the topbar gear, but admin-only). Tabs: Organization (name, logo upload to `branding` bucket, default payer), Notifications (org defaults), AI (model overrides per task), Security (read-only: RLS on, key rotation reminder).
- **`/_authenticated/settings`** — Personal Settings (any role): profile, password, notification prefs, theme. Splits from admin settings to avoid role leaks.

## 5. Role-Based Permissions

Centralized in `src/lib/permissions.ts`:

```
type Permission =
  | 'auth:create' | 'auth:edit' | 'auth:approve'
  | 'appeal:draft' | 'appeal:submit'
  | 'doc:upload' | 'doc:delete'
  | 'analytics:view' | 'analytics:export'
  | 'admin:users' | 'admin:audit' | 'admin:settings';

const ROLE_GRANTS: Record<AppRole, Permission[]> = { ... };
```

- `useRole()` hook + `<Can permission="..."/>` component for UI gating.
- Server fns re-check via a `requirePermission(permission)` middleware that calls `has_role` and maps to the same grants table; UI gating alone is never trusted.
- Default grants: Admin = everything; Physician = auth + appeal + doc + analytics:view; Clinical Staff = auth create/edit + doc upload + analytics:view; Billing = read-only analytics + appeal:draft.

## 6. Notification Center

- Bell icon in the topbar with unread badge; `Popover` lists last 20 notifications grouped by today/earlier.
- Browser realtime subscription via `supabase.channel('notifications:user_id=eq.<uid>')`; mark-read on click; "Mark all as read" action.
- Server-side triggers (Postgres triggers, not edge): on `authorizations` status change, on `appeals` status change, on `appeal_notes` insert (mentions), on `authorizations.denial_probability >= 70` insert/update → insert into `notifications` for the relevant users (creator + assignees + admins for high-risk).
- Per-user notification prefs honored at trigger time (read from `profiles.notification_prefs`).

## 7. Activity Tracking + Audit

- `activity_log` (already planned) drives the **user-facing** timeline on patient/appeal pages.
- `audit_logs` (new) is the **admin** record for compliance: every mutating server fn calls `app_audit(...)` with action, entity, and a JSON diff. Helper `withAudit(fn)` wraps server fns so this is one line per fn, not boilerplate.
- Login / logout / role change / settings change all audited.

## 8. Empty / loading / error / responsive / dark mode

Standardized primitives (used everywhere, not bespoke per page):

- `<EmptyState icon title description action />` — illustrated empty states (lucide icon in a tinted circle, on-brand copy per surface).
- `<LoadingCard />`, `<TableSkeleton rows cols />`, `<ChartSkeleton />` — used by all Suspense fallbacks; never a bare spinner.
- `<ErrorBoundaryCard />` — wraps each analytics widget so one failed query doesn't blank the page; "Retry" calls `router.invalidate()` + `reset()`.
- Route-level `errorComponent` + `notFoundComponent` on every loader route.
- Mobile: sidebar collapses to a sheet under `md`, KPI strip wraps 2-up, charts stack, tables become card lists below `sm`.
- Dark mode: all colors are CSS-variable tokens in `src/styles.css` (calm enterprise palette — deep teal primary, slate neutrals, semantic success/warning/danger/info). Theme toggle persists to `profiles.theme` and `localStorage`. Charts read tokens via CSS vars (no hardcoded colors).

## 9. Production polish

- 404 + 401 + 500 pages with brand styling.
- Toast queue via `sonner` with dedup; gateway 402/429 get distinct messaging.
- `<head>` per route: title, description, OG tags for the marketing-visible routes (`/`, `/auth`).
- A small landing/login `/` page rebrand (replace placeholder): logo, tagline, "Sign in" CTA → `/auth`.
- Seeded analytics data: extend the earlier seed migration to include 90 days of authorizations across statuses with realistic decision timestamps so the dashboard isn't empty out of the box.

## 10. Out of scope this turn

- SSO / SAML, MFA enrollment UI, BAA workflows.
- Org/tenant multi-tenancy beyond the single-org v1.
- Email delivery beyond Supabase Auth's built-in templates.
- Real ML model training — "AI Insights" is LLM-summarization of the snapshot, not predictive ML.

## Technical notes

- Stack unchanged. New server fns in `src/lib/analytics.functions.ts`, `ai-insights.functions.ts`, `admin-users.functions.ts`, `audit.functions.ts`; admin client imported inside handlers only.
- Charts: `recharts` with theme-token colors via CSS vars on the chart container.
- Permissions: `requirePermission` middleware + UI `<Can>`; both read the same grants table.
- Realtime: one channel per signed-in user for notifications; one per open appeal for collaboration (already planned).
- Verification: log in as admin → analytics dashboard renders with seeded data, all KPIs + charts populated, AI Insights returns 4 sections, invite a user as physician → user lacks admin nav, role change appears in audit log, status change fires a notification, mobile layout passes at 375px, dark mode toggles cleanly across every new surface.
