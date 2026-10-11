# Adhyantra vs Mriganka Performance Dashboard

A full-stack performance analytics web application comparing **Adhyantra** (live campaign) against **Mriganka** (historical baseline benchmark). Built with Next.js (App Router), TypeScript, Tailwind CSS, Recharts, and Supabase (Postgres & Auth).

---

## Tech Stack & Architecture

- **Frontend & Server**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Data Visualizations**: Recharts (dynamic comparative line chart with metric selector)
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security, views, triggers, and Auth)
- **Supabase Libraries**: `@supabase/supabase-js` and `@supabase/ssr`
- **File Ingestion**: SheetJS (`xlsx`) for parsing GA4 `.csv` and `.xlsx` exports
- **Design System**: Responsive, clean light theme with Indian digit formatting (`en-IN`), duration formatting (`mm:ss`), and percentage indicators.

---

## Security Model & RLS Architecture

1. **Public Dashboard (`/`)**:
   - Zero authentication required.
   - Accesses **ONLY** the `public_metrics` PostgreSQL view via Supabase `anon` key.
   - `public_metrics` view filters `status = 'published'` and exposes **only** final metric columns and date/source. It never exposes `raw_` values, workflow notes, or draft status.
   - Row Level Security (RLS) is enabled on all tables (`daily_metrics`, `audit_log`, `settings`). The `anon` role is revoked from all table access and granted `SELECT` only on `public_metrics`.

2. **Admin Portal (`/admin`)**:
   - Protected by Next.js middleware and Supabase Auth.
   - Only user emails explicitly specified in the `ADMIN_EMAILS` environment variable can enter `/admin`.
   - Admin read, write, adjustment, and publish operations execute server-side via Server Actions / Route Handlers using the `SUPABASE_SERVICE_ROLE_KEY` (never sent to the browser).

---

## Step-by-Step Setup Guide

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New project**, name it `adhyantra-dashboard`, choose your database password and nearest region.
3. Once initialized, navigate to **Project Settings -> API** to locate:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)

### 2. Run the SQL Migration
1. In the Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New query**.
3. Copy the entire contents of [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) and paste it into the editor.
4. Click **Run**.
   - This creates `daily_metrics`, `audit_log`, `settings`, the `public_metrics` view, RLS policies, and triggers.

### 3. Run the Seed Data
1. In the Supabase **SQL Editor**, click **New query**.
2. Copy the entire contents of [`supabase/seed.sql`](supabase/seed.sql) and paste it into the editor.
3. Click **Run**.
   - This seeds baseline Mriganka (`2025-10-10`) and live Adhyantra (`2026-10-10`) in `draft` status, configured with non-performing variance and the `new_users > total_users` sanity trigger to test the review, fix, and publish flow.

### 4. Create an Admin User in Supabase Auth
1. In the Supabase Dashboard, go to **Authentication -> Users**.
2. Click **Add user** -> **Create user**.
3. Enter your admin email (e.g., `admin@adhyantra.com`) and choose a secure password.
4. Set **Auto Confirm User?** to **Yes** so the account is immediately active without email confirmation.

### 5. Set Environment Variables
1. Copy `.env.example` to `.env.local` in your project root:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your Supabase credentials and admin email:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ADMIN_EMAILS=admin@adhyantra.com
   ```

### 6. Run Locally
1. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser:
   - **Public Dashboard**: [http://localhost:3000](http://localhost:3000)
   - **Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)
   - **Admin Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### 7. Deploy to Production (Vercel)
1. Push your repository to GitHub or GitLab.
2. In [Vercel](https://vercel.com), click **Add New -> Project** and import the repository.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS`
4. Click **Deploy**.

---

## Testing the Fix & Publish Workflow

The seeded data for `2026-10-10` is specifically engineered to test the entire validation and QA lifecycle:

1. **Sanity Check Trigger**:
   - On `2026-10-10`, Adhyantra has `new_users = 48,072` and `total_users = 46,948`.
   - The admin review table displays an amber badge: `Sanity warning: New users exceeds Total users`.

2. **Non-Performing Rule Validation**:
   - Threshold is 2% (customizable in **Settings**).
   - Relative Change formula: $\frac{\text{adhyantra} - \text{mriganka}}{\text{mriganka}} \times 100$.
   - Higher-is-better metrics (`total_users`, `sessions`, `avg_session_duration`, `new_users`) are flagged **RED** when change $\le -2\%$.
   - Lower-is-better metrics (`bounce_rate`, `organic_bounce_rate`) are flagged **RED** when change $\ge +2\%$.
   - All 6 metrics are initially highlighted in red.

3. **Publishing Blocked**:
   - The **Publish** button is disabled until all red cells on that date are resolved.

4. **Fix Flow Drawer**:
   - Click any red cell. A slide-over drawer opens displaying:
     - The permanent raw value (`raw_...`) archived in the database.
     - **Option 1**: Enter an adjusted value + mandatory reason (e.g. `Filtered bot sessions`).
     - **Option 2**: Click **Approve As-Is** with an approval justification.
   - Once all red metrics are adjusted or approved, the Publish button becomes active!

5. **Publish to Public View**:
   - Click **Publish**.
   - Navigate to `/` (Public Dashboard) to see the final published metrics live across the 6 KPI cards, trend chart, and comparison table. No adjustment badges are exposed publicly.

---

## Testing File Uploads

Two sample GA4 files are provided in the repository root for testing:

- [`sample_ga4_adhyantra.csv`](sample_ga4_adhyantra.csv): A sample GA4 CSV export with `#` comment headers, date header (`20261010-20261010`), and Grand total row.
- [`sample_ga4_mriganka.xlsx`](sample_ga4_mriganka.xlsx): A sample GA4 Excel export with `#` comments and baseline grand totals.

### Upload Instructions:
1. In `/admin`, open the **Upload GA4 Data** tab.
2. Select destination (`Adhyantra` or `Mriganka`).
3. Upload the `.csv` or `.xlsx` file.
4. The date (`YYYY-MM-DD`) is automatically extracted from the `#` comment lines.
5. Review the parsed grand total metrics preview.
6. Click **Save as Draft**. Re-uploading overwrites the draft and writes an immutable entry into `audit_log`.

---

## File Structure

```
├── README.md                      # Setup and usage guide
├── .env.example                   # Environment variable template
├── sample_ga4_adhyantra.csv       # Sample GA4 CSV export
├── sample_ga4_mriganka.xlsx       # Sample GA4 XLSX export
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql           # Complete PostgreSQL migration & RLS
│   └── seed.sql                   # Idempotent seed data for testing
└── src/
    ├── app/
    │   ├── page.tsx               # Public Dashboard (reads public_metrics only)
    │   ├── layout.tsx             # Root layout with Geist font & SEO meta
    │   ├── globals.css            # Light theme styling
    │   ├── admin/
    │   │   ├── page.tsx           # Admin Console (Review, Upload, Audit, Settings)
    │   │   └── login/page.tsx     # Admin Supabase Auth Login
    │   └── api/
    │       ├── admin/             # Server-side admin operations (service role key)
    │       │   ├── metrics/route.ts
    │       │   ├── upload/route.ts
    │       │   ├── adjust/route.ts
    │       │   ├── publish/route.ts
    │       │   ├── audit-log/route.ts
    │       │   └── settings/route.ts
    │       └── public-metrics/route.ts # Public endpoint (anon access)
    ├── components/
    │   ├── admin/
    │   │   ├── FixDrawer.tsx      # Slide-over metric adjuster & approver
    │   │   ├── ReviewTable.tsx    # Date review matrix with sanity alerts
    │   │   ├── UploadPanel.tsx    # Drag-and-drop GA4 parser
    │   │   ├── AuditLogTab.tsx    # Historical audit trail viewer
    │   │   └── SettingsTab.tsx    # Threshold and direction configuration
    │   └── dashboard/
    │       ├── Header.tsx         # Dashboard top branding bar
    │       ├── DateRangePicker.tsx# Presets & custom date range filter
    │       ├── KpiCards.tsx       # 6 KPI cards with directional indicators
    │       ├── TrendChart.tsx     # Recharts comparative line chart
    │       ├── ComparisonTable.tsx# Published performance breakdown
    │       └── MissingNotice.tsx  # Unpublished/missing day alerts
    ├── lib/
    │   ├── metrics.ts             # Formatting, growth, sanity, and aggregation
    │   ├── parser.ts              # GA4 CSV & XLSX parser
    │   ├── store.ts               # In-memory fallback demo store
    │   └── supabase/
    │       ├── client.ts          # Browser Supabase client
    │       ├── server.ts          # Server client & admin service role client
    │       └── middleware.ts      # Auth protection middleware
    └── types/
        └── index.ts               # Shared TypeScript interfaces
```
