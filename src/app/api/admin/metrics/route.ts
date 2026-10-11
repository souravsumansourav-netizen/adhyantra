import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/server';
import { DemoStore } from '@/lib/store';
import { buildDateComparisonRows, DEFAULT_SETTINGS } from '@/lib/metrics';
import { DailyMetric, DashboardSettings } from '@/types';

export async function GET() {
  try {
    const isConfigured = DemoStore.isConfigured();

    let userEmail = 'admin@adhyantra.com';
    if (isConfigured) {
      const auth = await verifyAdminSession();
      if (!auth.authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userEmail = auth.user?.email || 'admin';
    }

    let metrics: DailyMetric[] = [];
    let settings: DashboardSettings = DEFAULT_SETTINGS;

    if (isConfigured) {
      const supabaseAdmin = createAdminClient();

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabaseAdmin
        .from('settings')
        .select('*')
        .limit(1)
        .single();

      if (!settingsError && settingsData) {
        settings = {
          id: settingsData.id,
          underperform_threshold_pct: Number(settingsData.underperform_threshold_pct),
          metric_directions: settingsData.metric_directions,
          baseline_mode: settingsData.baseline_mode || 'yoy',
          updated_at: settingsData.updated_at,
        };
      }

      // Fetch daily_metrics
      const { data: metricsData, error: metricsError } = await supabaseAdmin
        .from('daily_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (metricsError) {
        throw new Error(metricsError.message);
      }

      metrics = (metricsData || []).map((m: any) => ({
        id: m.id,
        metric_date: m.metric_date,
        source: m.source,
        total_users: Number(m.total_users),
        sessions: Number(m.sessions),
        bounce_rate: Number(m.bounce_rate),
        avg_session_duration: Number(m.avg_session_duration),
        new_users: Number(m.new_users),
        organic_bounce_rate: Number(m.organic_bounce_rate),
        raw_total_users: Number(m.raw_total_users),
        raw_sessions: Number(m.raw_sessions),
        raw_bounce_rate: Number(m.raw_bounce_rate),
        raw_avg_session_duration: Number(m.raw_avg_session_duration),
        raw_new_users: Number(m.raw_new_users),
        raw_organic_bounce_rate: Number(m.raw_organic_bounce_rate),
        status: m.status,
        adjustment_note: m.adjustment_note,
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));
    } else {
      metrics = DemoStore.getAllMetrics();
      settings = DemoStore.getSettings();
    }

    const rows = buildDateComparisonRows(metrics, settings);

    return NextResponse.json({
      success: true,
      metrics,
      rows,
      settings,
      isConfigured,
      userEmail,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch admin metrics' },
      { status: 500 }
    );
  }
}
