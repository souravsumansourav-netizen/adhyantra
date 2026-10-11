-- ==============================================================================
-- Adhyantra vs Mriganka Performance Dashboard: Initial Migration
-- File: supabase/migrations/001_init.sql
-- ==============================================================================

-- 1. Daily Metrics Table
CREATE TABLE IF NOT EXISTS public.daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('adhyantra', 'mriganka')),
    
    -- Final metrics (can be adjusted during fix flow)
    total_users INTEGER NOT NULL DEFAULT 0,
    sessions INTEGER NOT NULL DEFAULT 0,
    bounce_rate NUMERIC NOT NULL DEFAULT 0,
    avg_session_duration NUMERIC NOT NULL DEFAULT 0,
    new_users INTEGER NOT NULL DEFAULT 0,
    organic_bounce_rate NUMERIC NOT NULL DEFAULT 0,
    
    -- Raw metrics (preserved permanently from upload)
    raw_total_users INTEGER NOT NULL DEFAULT 0,
    raw_sessions INTEGER NOT NULL DEFAULT 0,
    raw_bounce_rate NUMERIC NOT NULL DEFAULT 0,
    raw_avg_session_duration NUMERIC NOT NULL DEFAULT 0,
    raw_new_users INTEGER NOT NULL DEFAULT 0,
    raw_organic_bounce_rate NUMERIC NOT NULL DEFAULT 0,
    
    -- Workflow state
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
    adjustment_note TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    CONSTRAINT daily_metrics_date_source_key UNIQUE (metric_date, source)
);

-- 2. Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('upload', 'edit', 'approve', 'publish', 'unpublish', 'delete')),
    metric_date DATE NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('adhyantra', 'mriganka')),
    field TEXT,
    old_value TEXT,
    new_value TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Settings Table (Single-row configuration)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    underperform_threshold_pct NUMERIC NOT NULL DEFAULT 2,
    metric_directions JSONB NOT NULL DEFAULT '{
        "total_users": "higher_better",
        "sessions": "higher_better",
        "bounce_rate": "lower_better",
        "avg_session_duration": "higher_better",
        "new_users": "higher_better",
        "organic_bounce_rate": "lower_better"
    }'::jsonb,
    baseline_mode TEXT NOT NULL DEFAULT 'yoy' CHECK (baseline_mode IN ('yoy', 'same_date')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure default settings row exists
INSERT INTO public.settings (id, underperform_threshold_pct, metric_directions, baseline_mode)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    2,
    '{
        "total_users": "higher_better",
        "sessions": "higher_better",
        "bounce_rate": "lower_better",
        "avg_session_duration": "higher_better",
        "new_users": "higher_better",
        "organic_bounce_rate": "lower_better"
    }'::jsonb,
    'yoy'
ON CONFLICT (id) DO NOTHING;

-- 4. Public Metrics View (Exposes ONLY published metrics, no raw values, notes, or status)
-- We explicitly set security_invoker = false (the Postgres default) so the view executes
-- with the permissions of the view definer (postgres role), allowing anon SELECT without direct table grants.
CREATE OR REPLACE VIEW public.public_metrics
WITH (security_invoker = false)
AS
SELECT
    metric_date,
    source,
    total_users,
    sessions,
    bounce_rate,
    avg_session_duration,
    new_users,
    organic_bounce_rate
FROM public.daily_metrics
WHERE status = 'published';

-- 5. Row-Level Security (RLS) Configuration
-- Enable RLS on all tables
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Revoke all table permissions from anon and authenticated roles
REVOKE ALL ON TABLE public.daily_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE public.audit_log FROM anon, authenticated;
REVOKE ALL ON TABLE public.settings FROM anon, authenticated;

-- Grant SELECT only on public_metrics view to anon and authenticated
GRANT SELECT ON public.public_metrics TO anon, authenticated;

-- Grant full access on all tables and views to service_role (used by server actions/API routes)
GRANT ALL ON TABLE public.daily_metrics TO service_role;
GRANT ALL ON TABLE public.audit_log TO service_role;
GRANT ALL ON TABLE public.settings TO service_role;
GRANT ALL ON public.public_metrics TO service_role;

-- 6. Helper Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_daily_metrics_updated_at ON public.daily_metrics;
CREATE TRIGGER set_daily_metrics_updated_at
    BEFORE UPDATE ON public.daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_settings_updated_at ON public.settings;
CREATE TRIGGER set_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
