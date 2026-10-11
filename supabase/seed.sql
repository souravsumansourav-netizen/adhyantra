-- ==============================================================================
-- Adhyantra vs Mriganka Performance Dashboard: Seed Data
-- File: supabase/seed.sql
-- ==============================================================================

-- Clean existing seed data for idempotent execution
DELETE FROM public.daily_metrics WHERE metric_date IN ('2025-10-10', '2026-10-10');
DELETE FROM public.audit_log WHERE metric_date IN ('2025-10-10', '2026-10-10');

-- 1. Mriganka 2025-10-10 (Baseline)
INSERT INTO public.daily_metrics (
    metric_date,
    source,
    total_users,
    sessions,
    bounce_rate,
    avg_session_duration,
    new_users,
    organic_bounce_rate,
    raw_total_users,
    raw_sessions,
    raw_bounce_rate,
    raw_avg_session_duration,
    raw_new_users,
    raw_organic_bounce_rate,
    status,
    adjustment_note
) VALUES (
    '2025-10-10',
    'mriganka',
    79110,
    83332,
    0.6090,
    149.20,
    58797,
    0.5200,
    79110,
    83332,
    0.6090,
    149.20,
    58797,
    0.5200,
    'draft',
    NULL
);

-- 2. Adhyantra 2026-10-10 (Live campaign)
-- Notice: new_users (48072) > total_users (46948) triggers amber sanity warning
-- Relative change vs Mriganka:
--   total_users: -40.65% (flagged red)
--   sessions: -42.59% (flagged red)
--   bounce_rate: +5.09% (flagged red)
--   avg_session_duration: -60.66% (flagged red)
--   new_users: -18.24% (flagged red)
--   organic_bounce_rate: +17.31% (flagged red)
INSERT INTO public.daily_metrics (
    metric_date,
    source,
    total_users,
    sessions,
    bounce_rate,
    avg_session_duration,
    new_users,
    organic_bounce_rate,
    raw_total_users,
    raw_sessions,
    raw_bounce_rate,
    raw_avg_session_duration,
    raw_new_users,
    raw_organic_bounce_rate,
    status,
    adjustment_note
) VALUES (
    '2026-10-10',
    'adhyantra',
    46948,
    47839,
    0.6400,
    58.70,
    48072,
    0.6100,
    46948,
    47839,
    0.6400,
    58.70,
    48072,
    0.6100,
    'draft',
    NULL
);

-- 3. Initial Audit Logs
INSERT INTO public.audit_log (
    actor,
    action,
    metric_date,
    source,
    field,
    old_value,
    new_value,
    note
) VALUES 
(
    'system_seed',
    'upload',
    '2025-10-10',
    'mriganka',
    'all',
    NULL,
    'Initial upload from GA4 export',
    'Seeded baseline metrics for 2025-10-10'
),
(
    'system_seed',
    'upload',
    '2026-10-10',
    'adhyantra',
    'all',
    NULL,
    'Initial upload from GA4 export',
    'Seeded campaign metrics for 2026-10-10 (non-performing test date)'
);
