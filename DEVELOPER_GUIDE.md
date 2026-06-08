# GT Afrik OPS — Developer Guide

Complete reference for understanding, running, and modifying the GT Afrik OPS fleet-monitoring dashboard. Read this top to bottom before changing anything. Every section tells you **what it is**, **where it lives**, and **how to change it safely**.

---

## 1. What this project is

GT Afrik OPS is an internal operations dashboard for a GPS fleet-tracking business operating in Central/Sub-Saharan Africa. It tracks GPS device installations, SIM/device/fuel-sensor stock, customers, and the full device lifecycle across three branches: **Kinshasa**, **LSHI** (Lubumbashi), and **Brazza** (Brazzaville). Business goal: 10,000 vehicles + gensets.

The device lifecycle modeled by the app:

```
Stock (raw SIM / Device / Fuel)  ->  Paired (SIM + Device)  ->  RTD (Ready to Deploy)  ->  Installed (on a vehicle)
                                                                              |
                                                                       Damaged / Lost / Uninstalled
```

Live URL: https://gtafrik-ops.vercel.app
Repo: https://github.com/qasimraza786/gtafrik-ops (private)

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js **16.2.7** App Router + Turbopack | ⚠️ Not the Next.js in your training data — read `node_modules/next/dist/docs/` before deep framework work. See `AGENTS.md`. |
| UI runtime | React **19.2** | Function components, hooks |
| Language | TypeScript 5 | |
| Styling | Inline styles + CSS custom properties in `globals.css` | No Tailwind utility classes in pages (Tailwind v4 is installed but pages use inline styles + CSS vars) |
| Fonts | Inter (brand title face) via `next/font`, Geist Mono for monospace | |
| Backend | Supabase (Postgres + Auth + Edge Functions) | Project ref `ctzvvpyubuggicdjlhzr`, region eu-west-1 |
| Charts | Hand-rolled SVG (`src/components/Charts.tsx`) | `recharts` is also installed if you prefer a library |
| Icons | `lucide-react` | |
| Deploy | Vercel CLI (`npx vercel --prod --yes`) | No git-push-to-deploy; deploy is manual |

---

## 3. Prerequisites

- Node.js 20+ (Node 26 works)
- npm
- A Supabase project (the existing one, or your own clone)
- `gh` CLI (optional, for repo work)
- Vercel CLI access (for deploys) — `npx vercel login`

---

## 4. First-time setup

```bash
git clone https://github.com/qasimraza786/gtafrik-ops.git
cd gtafrik-ops
npm install
```

Create `.env.local` in the project root (this file is gitignored — never commit it):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ctzvvpyubuggicdjlhzr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

> Both vars are `NEXT_PUBLIC_*`, meaning they ship to the browser. The anon key is **public by design** — security is enforced by Postgres RLS (Section 9), not by hiding the key. Never put the **service-role** key here.

Run locally:

```bash
npm run dev      # http://localhost:3000
npm run build    # production build + typecheck
npm run start    # serve production build
npm run lint     # eslint
```

---

## 5. Project structure

```
gtafrik-ops/
├── AGENTS.md                # Warning: Next.js 16 differs from training data
├── CLAUDE.md                # Short project brief (for AI assistants)
├── DEVELOPER_GUIDE.md       # ← this file
├── .env.local               # secrets (gitignored)
├── package.json
├── src/
│   ├── app/                 # Next.js App Router — one folder per route
│   │   ├── layout.tsx       # Root layout: loads Inter font, global CSS
│   │   ├── globals.css      # ALL design tokens + shared component classes
│   │   ├── page.tsx         # "/"  Dashboard (KPIs, charts, deep-views)
│   │   ├── login/page.tsx   # "/login"  Supabase Auth sign-in
│   │   ├── ops/page.tsx     # "/ops"  Operations wizard (lifecycle actions)
│   │   ├── master/page.tsx  # "/master"  Fleet master table
│   │   ├── customers/page.tsx
│   │   ├── stock/page.tsx   # "/stock"  Stock + Add Stock modal
│   │   ├── log/page.tsx     # "/log"  Movement audit trail
│   │   └── admin/page.tsx   # "/admin"  User management + data quality
│   ├── components/
│   │   ├── AppShell.tsx     # Auth guard + page frame (sidebar + content)
│   │   ├── Sidebar.tsx      # Left nav + user card + sign-out
│   │   ├── Logo.tsx         # Inline-SVG GT Afrik wordmark/icon
│   │   ├── Charts.tsx       # MonthlyTrend + BranchBars (dependency-free SVG)
│   │   ├── AddStockModal.tsx
│   │   └── StatusBadge.tsx
│   └── lib/
│       ├── supabase.ts      # Supabase client + ALL table TypeScript types
│       ├── data.ts          # Read layer: paginated fetch* functions
│       ├── auth.ts          # signIn / signOut / getSession (localStorage)
│       ├── stock.ts         # Stock CSV template + addStock writes
│       └── admin.ts         # User CRUD via edge function + data quality
└── public/                  # static assets
```

**Convention: organize by feature/route, not by file type. Keep files < 800 lines.**

---

## 6. Data layer (`src/lib/data.ts`) — READ THIS, it has a critical gotcha

All reads go through `fetch*` functions. They return live Supabase rows mapped to the types in `src/lib/supabase.ts`.

### 6.1 The 1000-row cap (most common bug source)

Supabase/PostgREST silently caps every response at **1000 rows** (`db-max-rows`). `.limit(10000)` does **not** work — it gets clamped. To read all rows you MUST paginate with `.range()`. Every fetch function already does this through the shared helper:

```ts
async function fetchAll<T>(buildQuery) {
  await supabase.auth.getSession();   // hydrate JWT before querying (RLS needs it)
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data } = await buildQuery(from, from + 999);   // 1000-row page
    all.push(...data);
    if (data.length < 1000) break;                          // last page
    from += 1000;
  }
  return all;
}
```

**Rule: any new read of a table that can exceed 1000 rows must use `fetchAll` / `.range()`. Never `.limit()` for "get everything".**

### 6.2 Available read functions

`fetchInstallations`, `fetchMovements`, `fetchSims`, `fetchDevices`, `fetchFuelSensors`, `fetchCustomers`, `fetchPairedBundles`, `fetchRTDBundles`, `fetchDamageEvents`. Each accepts an optional `branch?: string` filter (pass a branch name, or omit / `"All"` for everything — though RLS already scopes non-admins, see Section 9).

`actionColors` (in the same file) maps movement action names to hex colors used by the log + dashboard.

---

## 7. Database schema

Source of truth for column names. Postgres `snake_case`; map in the fetch layer. All tables have an integer `id` PK and a `branch` column (`Kinshasa` | `LSHI` | `Brazza`).

| Table | Key columns |
|---|---|
| `installations` | sim, imei, model, status, vehicle, customer, install_date, location, fuel_serial, fuel_mac, last_repair, branch, notes |
| `movements` | logged_at, action, item_type, sim, imei, fuel_serial, vehicle, from_status, to_status, user_id, branch, notes |
| `sims` | number, provider, status, branch, date_added |
| `devices` | imei, model, status, branch, date_added |
| `fuel_sensors` | serial, mac, model, status, branch, date_added |
| `customers` | name, vehicles, installed, with_fuel, branch |
| `paired_bundles` | sim, imei, model, branch, paired_date |
| `rtd_bundles` | sim, imei, model, branch, activated_date |
| `damage_events` | item_type, identifier, reason, branch, event_date, reported_by |
| `users` | email, name, role, branch, is_admin |

`status` values: `INSTALLED`, `AVAILABLE`, `PAIRED`, `RTD`, `DAMAGED`, `LOST`, `UNINSTALLED`.
`role` values: `FOUNDER`, `ADMIN`, `SUPERVISOR`.

> `customers.vehicles / installed / with_fuel` are denormalized aggregates. If you change installation data directly in the DB, recompute them (or they go stale on the Customers page).

---

## 8. Auth + roles (`src/lib/auth.ts`)

- Login uses **Supabase Auth** (`signInWithPassword`). After auth, the app queries the `users` table for the profile (role, branch, is_admin) and caches a `SessionUser` in `localStorage` under key `gtafrik_session`.
- `getSession(): SessionUser | null` — synchronous read from localStorage, used everywhere to gate UI.
- `AppShell.tsx` is the auth guard: if `getSession()` is null it redirects to `/login`.

### Roles

| Role | Color | Branch access |
|---|---|---|
| FOUNDER | purple | All branches (admin bypass) |
| ADMIN | blue | All branches (admin bypass) |
| SUPERVISOR | amber | Locked to their own branch |

`isAdmin` (boolean from `users.is_admin`) is the switch: `true` = sees all branches, `false` = scoped to `branch`.

### The 6 users

```
qasimraza@gtafrik.com  FOUNDER     all
mehdi@gtafrik.com      ADMIN       all
abhishek@gtafrik.com   ADMIN       all
kinshasa@gtafrik.com   SUPERVISOR  Kinshasa
lshi@gtafrik.com       SUPERVISOR  LSHI
brazza@gtafrik.com     SUPERVISOR  Brazza
```

To add/deactivate users at runtime, use the **/admin** page (it calls the secure edge function — Section 11). Do not insert into `auth.users` by hand.

---

## 9. Branch isolation (RLS) — the security backbone

**Data isolation is enforced in the database, not in the UI.** Every data table has an RLS policy `branch_scope`:

```sql
create policy branch_scope on public.<table>
  for all to authenticated
  using ( public.current_user_is_admin() or branch = public.current_user_branch() )
  with check ( public.current_user_is_admin() or branch = public.current_user_branch() );
```

Two `security definer` helper functions resolve the logged-in user from their JWT email:

- `current_user_branch()` → the caller's branch (from `users`)
- `current_user_is_admin()` → caller's `is_admin` flag

Result: a Kinshasa supervisor's queries physically return **only Kinshasa rows**. Admins/founder bypass. The `users` table has its own policy (`users_scope`): self-read + admin-read-all.

UI-level filters (e.g. `customers.filter(c => c.branch === userBranch)`) still exist as defense-in-depth, but the DB is the real guard.

### How to change isolation rules

- Modify policies via a Supabase migration (SQL). Don't loosen `branch_scope` to `using (true)` — that re-opens the cross-branch leak that this was built to fix.
- If you add a new data table, **immediately add the same `branch_scope` policy** or it will either leak (if left open) or return nothing (if RLS on with no policy).

---

## 10. Pages — what each does and how to modify

All pages are `"use client"`, wrapped in `<AppShell>`, and fetch live data in a `useEffect`. They read `getSession()` to apply branch scope for supervisors.

| Route | File | Purpose | Common edits |
|---|---|---|---|
| `/` | `app/page.tsx` | Dashboard: 8 KPI tiles, **Installations Trend** chart + range filter (6M/12M/All), **Installed by Branch** bars, Recent Activity, Fleet Distribution, click-through deep-view panels | Add a KPI tile, add a chart, change deep-view columns |
| `/ops` | `app/ops/page.tsx` | Operations wizard: deploy / pair / activate / repair / uninstall / damage / transfer / fuel. Dropdowns fed by live stock, scoped to branch | Add an operation step, change wizard fields |
| `/master` | `app/master/page.tsx` | Fleet master table with branch tabs | Add columns, filters |
| `/customers` | `app/customers/page.tsx` | Customer list + per-customer installed-fleet drilldown | Change customer card / detail layout |
| `/stock` | `app/stock/page.tsx` | Stock per type (SIM/Device/Fuel) = raw + paired + RTD; sub-state toggle; Add Stock modal | Change stock math, add a stock type |
| `/log` | `app/log/page.tsx` | Append-only movement audit trail | Add columns, change formatting |
| `/admin` | `app/admin/page.tsx` | Live users table + data-quality metrics; create/deactivate users | Add a user field, add a quality check |
| `/login` | `app/login/page.tsx` | Supabase Auth sign-in (no demo bypass) | Branding, copy |

### Add a new page (route)

1. Create `src/app/<name>/page.tsx`, start with `"use client";`.
2. Wrap content in `<AppShell>`.
3. Read data via `fetch*` from `lib/data.ts`; scope by branch using `getSession()`.
4. Add a nav entry in `src/components/Sidebar.tsx`.

---

## 11. Admin / user management (edge function)

User create/deactivate cannot use the anon key (needs service-role to touch `auth.users`). It goes through a Supabase **Edge Function** `manage-users` (Deno):

- Runs with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS).
- Admin-gated: verifies the caller's JWT and checks `users.is_admin` before doing anything.
- Actions: `create` (auth user + `users` row) and `activate/deactivate` (ban/unban + `active` flag).

Client calls it through `src/lib/admin.ts` (`fetchUsers`, `createUser`, `setUserActive`, `fetchDataQuality`) with the caller's access token as a Bearer header. Function URL: `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users`.

To change admin behavior, edit + redeploy the edge function (Supabase dashboard or `supabase functions deploy manage-users`).

---

## 12. Stock writes (`src/lib/stock.ts`)

- Stock inserts go **direct** to Supabase under the authenticated session (RLS `branch_scope` `with check` ensures a supervisor can only write to their own branch).
- `buildTemplate` / `downloadCsv` / `parseTemplate` handle the CSV import path; `buildManualRow` handles single manual entries; `addStock` performs the insert.
- `STOCK_CONFIG` defines the columns per stock type (sims / devices / fuel). Add a new field here + in the matching DB table + the type in `supabase.ts`.

---

## 13. Design system + brand (how to restyle)

**All design tokens live in `src/app/globals.css` under `:root`.** Change a token there and it propagates app-wide (buttons, badges, tabs, tags, focus rings all reference these).

### Brand palette (from GT Afrik Brand Guidelines v1.0)

| Token | Value | Use |
|---|---|---|
| `--brand-blue` | `#3866FF` | Lead / identity / primary buttons (~25%) |
| `--brand-green` | `#32C96F` | Accent / success / KPIs (~10%) |
| `--brand-dark` | `#000000` | Carbon Black foundation |
| `--brand-white` | `#FFFFFF` | Signal White surface |
| `--brand-gradient` | blue → green | Hero/data-viz accents |
| `--viz-cobalt/indigo/violet/signal-indigo` | `#094577 #2B2877 #3F2E75 #3B4C9E` | Secondary data-viz only (sparingly) |

Color application ratio: **60% surface (black/white) · 25% blue · 10% green · 5% secondary.**

### Typography

- Titles: **Inter** SemiBold/Bold/ExtraBold — token `--font-display`, loaded in `layout.tsx`.
- Body: Inter / Helvetica Neue / Arial stack — token `--font-body`.
- Apply `font-family: var(--font-display)` to headings.

### Surfaces / text / borders / status

Also in `globals.css`: `--surface-0..4`, `--text-primary/secondary/muted`, `--border-subtle/default/strong`, status/op colors, `--ease-out-quart`. Reusable classes: `.btn`, `.btn-primary`, `.card`, `.badge-*`, `.branch-tag`, `.tab-item`, `.page-title`, `.search-input`, `.modal-*`.

**To re-theme:** edit the `:root` tokens. **To restyle one component:** edit its inline styles in the component file. Don't hardcode hex in components when a token exists.

---

## 14. Charts (`src/components/Charts.tsx`)

Dependency-free SVG, brand-colored, compositor-friendly (no layout animation):

- `MonthlyTrend({ points, height? })` — area+line trend, blue→green gradient fill, peak marker. `points: { label, value }[]`.
- `BranchBars({ items })` — horizontal bars. `items: { label, value, color }[]`.

The dashboard builds `points` via `buildMonthlySeries(installs, months)` in `app/page.tsx` (groups `install_date` by `YYYY-MM`, slices to the selected look-back window). Range filter state = `"6M" | "12M" | "All"`.

To add a chart: build a `{label,value}` series from a `fetch*` result, drop in `<MonthlyTrend>` / `<BranchBars>`, or use `recharts` (already a dependency).

---

## 15. Recipes (end-to-end modifications)

### Add a new column/field to an existing table

1. **DB:** add the column via Supabase migration (`alter table ... add column ...`).
2. **Type:** add the field to the matching type in `src/lib/supabase.ts`.
3. **Read:** nothing needed if you `select('*')` (all fetch functions do).
4. **UI:** render the field where needed (table column, card, etc.).
5. **Write paths:** if it's user-entered, update `stock.ts` / the ops wizard / admin form.

### Add a new branch (e.g. a 4th city)

1. Insert the branch value consistently across all data tables + the supervisor's `users.branch`.
2. Add it to `branches`/`BRANCH_COLOR`/`BRANCH_BG` in `app/page.tsx` and any branch-tab lists (`master`, `stock`).
3. RLS needs no change — it keys off `users.branch` dynamically.

### Add a new data table

1. Create the table (PK `id`, include a `branch` column).
2. **Add the `branch_scope` RLS policy** (Section 9) — mandatory.
3. Add the type to `supabase.ts`, a paginated `fetch*` to `data.ts`.
4. Build UI.

### Change branding

Edit `:root` tokens in `globals.css` (Section 13). For the logo, edit `src/components/Logo.tsx` (inline SVG) or swap in the official asset files.

---

## 16. Build & deploy

```bash
npm run build                 # always run before deploy — catches TS errors
npx vercel --prod --yes       # deploy to production
npx vercel ls --prod          # confirm latest deployment is Ready
```

There is **no** git-push-to-deploy. Deploys are manual via Vercel CLI. Commit to GitHub for history; deploy separately.

```bash
git add -A
git commit -m "feat: ..."     # conventional commits: feat/fix/refactor/docs/chore
git push
```

---

## 17. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| KPI shows a capped number (e.g. "999/1000") | Read not paginated | Use `fetchAll`/`.range()`, not `.limit()` (Section 6.1) |
| A supervisor sees other branches' data | Missing/loosened RLS policy on a table | Add/restore `branch_scope` (Section 9) |
| A supervisor sees **no** data after login | RLS on but JWT not attached, or branch value mismatch | `data.ts` calls `await supabase.auth.getSession()` first; verify `users.branch` matches the table's branch values exactly (`Kinshasa`/`LSHI`/`Brazza`) |
| Blank page → redirect to /login | `getSession()` null | Re-login; check localStorage `gtafrik_session` |
| Customers totals wrong | `customers` aggregates stale | Recompute `vehicles/installed/with_fuel` from `installations` |
| Build fails on types | New DB column not in `supabase.ts` | Add the field to the type |
| Can't create a user | Not admin, or edge function down | Must be logged in as admin; check `manage-users` function logs |

---

## 18. Security checklist (before every commit)

- [ ] No secrets committed — `.env.local` stays gitignored; only `NEXT_PUBLIC_*` (never service-role) in the client.
- [ ] New data tables have a `branch_scope` RLS policy.
- [ ] New reads are paginated.
- [ ] No `console.log` left in production paths.
- [ ] Branch isolation still holds (test as a supervisor: you must see only your branch).
- [ ] User-input writes validate at the boundary.

---

## 19. Reference

- Supabase project ref: `ctzvvpyubuggicdjlhzr` (eu-west-1)
- Data source of truth for seeding: `gtafrik opss.xlsx` (MASTER sheet = installations) — kept in the parent folder, **not** in this repo.
- Brand guidelines: `GT_AFRIK_Brand_Guidelines.pdf` (v1.0).
- `AGENTS.md`: Next.js 16 deviates from older docs — read `node_modules/next/dist/docs/` for framework specifics.
