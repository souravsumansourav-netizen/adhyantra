import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/server';
import { DemoStore } from '@/lib/store';
import { buildDateComparisonRows, DEFAULT_SETTINGS } from '@/lib/metrics';
import { DailyMetric, DashboardSettings } from '@/types';

export async function POST(request: Request) {
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

    const body = await request.json();
    const { dates, action } = body as {
      dates: string[];
      action: 'publish' | 'unpublish';
    };

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: 'An array of dates is required' },
        { status: 400 }
      );
    }

    if (action !== 'publish' && action !== 'unpublish') {
      return NextResponse.json(
        { error: 'Action must be "publish" or "unpublish"' },
        { status: 400 }
      );
    }

    // 1. Fetch current metrics and settings to validate publishing rules
    let allMetrics: DailyMetric[] = [];
    let settings: DashboardSettings = DEFAULT_SETTINGS;

    if (isConfigured) {
      const supabaseAdmin = createAdminClient();

      const { data: settingsData } = await supabaseAdmin
        .from('settings')
        .select('*')
        .limit(1)
        .single();
      if (settingsData) {
        settings = {
          id: settingsData.id,
          underperform_threshold_pct: Number(settingsData.underperform_threshold_pct),
          metric_directions: settingsData.metric_directions,
          baseline_mode: settingsData.baseline_mode || 'yoy',
        };
      }

      const { data: metricsData } = await supabaseAdmin
        .from('daily_metrics')
        .select('*');
      allMetrics = (metricsData || []).map((m: any) => ({
        ...m,
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
      }));
    } else {
      allMetrics = DemoStore.getAllMetrics();
      settings = DemoStore.getSettings();
    }

    const comparisonRows = buildDateComparisonRows(allMetrics, settings);
    const rowMap = new Map(comparisonRows.map((r) => [r.date, r]));

    // If publishing, ensure no unresolved red metrics
    if (action === 'publish') {
      for (const d of dates) {
        const row = rowMap.get(d);
        if (row && row.unresolvedRedCount > 0) {
          return NextResponse.json(
            {
              error: `Cannot publish date ${d}: ${row.unresolvedRedCount} non-performing metric(s) must be adjusted or approved as-is first.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const newStatus = action === 'publish' ? 'published' : 'draft';

    if (isConfigured) {
      const supabaseAdmin = createAdminClient();

      for (const d of dates) {
        const row = rowMap.get(d);
        const baselineDate = row?.baselineDate;

        // Update Adhyantra
        await supabaseAdmin
          .from('daily_metrics')
          .update({ status: newStatus })
          .eq('metric_date', d)
          .eq('source', 'adhyantra');

        // Also publish matched Mriganka baseline date if present
        if (baselineDate) {
          await supabaseAdmin
            .from('daily_metrics')
            .update({ status: newStatus })
            .eq('metric_date', baselineDate)
            .eq('source', 'mriganka');
        }

        // Add audit logs
        await supabaseAdmin.from('audit_log').insert({
          actor: userEmail,
          action,
          metric_date: d,
          source: 'adhyantra',
          field: 'status',
          old_value: action === 'publish' ? 'draft' : 'published',
          new_value: newStatus,
          note: `${action === 'publish' ? 'Published' : 'Unpublished'} via admin`,
        });
      }
    } else {
      for (const d of dates) {
        DemoStore.updateStatus(d, newStatus);
        DemoStore.addAuditLog({
          actor: userEmail,
          action,
          metric_date: d,
          source: 'adhyantra',
          field: 'status',
          old_value: action === 'publish' ? 'draft' : 'published',
          new_value: newStatus,
          note: `${action === 'publish' ? 'Published' : 'Unpublished'} via admin`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}ed ${dates.length} date(s).`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Publish operation failed' },
      { status: 500 }
    );
  }
}
