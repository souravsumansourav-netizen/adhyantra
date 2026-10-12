import { NextResponse } from 'next/server';
import { createBrowserClient } from '@supabase/ssr';
import { DemoStore } from '@/lib/store';
import {
  aggregateMetrics,
  calculateChangePct,
  isMetricFavourable,
  METRIC_CONFIG,
  DEFAULT_SETTINGS,
  getBaselineDate,
} from '@/lib/metrics';
import { PublicMetric, MetricKey } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2026-10-10';
    const endDate = searchParams.get('endDate') || '2026-10-10';

    const isConfigured = DemoStore.isConfigured();
    let publishedRows: PublicMetric[] = [];

    if (isConfigured) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Reads ONLY from public_metrics view using anon key!
      const anonClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await anonClient
        .from('public_metrics')
        .select('*');

      if (error) {
        throw new Error(error.message);
      }

      publishedRows = (data || []).map((m: any) => ({
        metric_date: m.metric_date,
        source: m.source,
        total_users: Number(m.total_users),
        sessions: Number(m.sessions),
        bounce_rate: Number(m.bounce_rate),
        avg_session_duration: Number(m.avg_session_duration),
        new_users: Number(m.new_users),
        organic_bounce_rate: Number(m.organic_bounce_rate),
      }));
    } else {
      publishedRows = DemoStore.getPublishedMetrics();
    }

    // Generate all dates in the requested range [startDate, endDate] safely with UTC
    const daysInRange: string[] = [];
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);
    const curr = new Date(Date.UTC(sY, sM - 1, sD));
    const end = new Date(Date.UTC(eY, eM - 1, eD));

    while (curr <= end) {
      daysInRange.push(curr.toISOString().split('T')[0]);
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const missingDays: { date: string; reason: string }[] = [];
    const adhyantraRecordsInRange: PublicMetric[] = [];
    const mrigankaRecordsInRange: PublicMetric[] = [];
    const dailyTrend: any[] = [];

    const adhyantraMap = new Map<string, PublicMetric>();
    const mrigankaMap = new Map<string, PublicMetric>();

    publishedRows.forEach((row) => {
      if (row.source === 'adhyantra') {
        adhyantraMap.set(row.metric_date, row);
      } else {
        mrigankaMap.set(row.metric_date, row);
      }
    });

    for (const d of daysInRange) {
      // 10th Oct -> 21st Sep, 11th Oct -> 22nd Sep, and so on
      const baselineDate = getBaselineDate(d, 'festival');

      const adhy = adhyantraMap.get(d);
      const mrig = mrigankaMap.get(baselineDate);

      if (!adhy) {
        missingDays.push({ date: d, reason: 'Adhyantra data not published or missing' });
      }
      if (!mrig) {
        missingDays.push({
          date: d,
          reason: `Mriganka baseline data not published or missing (${baselineDate})`,
        });
      }

      if (adhy) adhyantraRecordsInRange.push(adhy);
      if (mrig) mrigankaRecordsInRange.push(mrig);

      dailyTrend.push({
        date: d,
        baselineDate,
        hasAdhyantra: !!adhy,
        hasMriganka: !!mrig,
        adhyantra: adhy
          ? {
              total_users: adhy.total_users,
              sessions: adhy.sessions,
              bounce_rate: adhy.bounce_rate,
              avg_session_duration: adhy.avg_session_duration,
              new_users: adhy.new_users,
              organic_bounce_rate: adhy.organic_bounce_rate,
            }
          : null,
        mriganka: mrig
          ? {
              total_users: mrig.total_users,
              sessions: mrig.sessions,
              bounce_rate: mrig.bounce_rate,
              avg_session_duration: mrig.avg_session_duration,
              new_users: mrig.new_users,
              organic_bounce_rate: mrig.organic_bounce_rate,
            }
          : null,
      });
    }

    // Range Aggregation
    const adhyAgg = aggregateMetrics(adhyantraRecordsInRange);
    const mrigAgg = aggregateMetrics(mrigankaRecordsInRange);

    const metricKeys: MetricKey[] = [
      'total_users',
      'sessions',
      'bounce_rate',
      'avg_session_duration',
      'new_users',
      'organic_bounce_rate',
    ];

    const kpis: Record<
      MetricKey,
      {
        key: MetricKey;
        label: string;
        description: string;
        adhyantraVal: number;
        mrigankaVal: number;
        changePct: number;
        isFavourable: boolean;
        direction: string;
      }
    > = {} as any;

    for (const key of metricKeys) {
      const adhyVal = adhyAgg[key];
      const mrigVal = mrigAgg[key];
      const changePct = mrigVal > 0 ? calculateChangePct(adhyVal, mrigVal) : 0;
      const direction = DEFAULT_SETTINGS.metric_directions[key];
      const favourable = isMetricFavourable(changePct, direction);

      kpis[key] = {
        key,
        label: METRIC_CONFIG[key].label,
        description: METRIC_CONFIG[key].description,
        adhyantraVal: adhyVal,
        mrigankaVal: mrigVal,
        changePct,
        isFavourable: favourable,
        direction,
      };
    }

    const baselineStartDate = getBaselineDate(startDate, 'festival');
    const baselineEndDate = getBaselineDate(endDate, 'festival');

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      baselineStartDate,
      baselineEndDate,
      kpis,
      dailyTrend,
      missingDays,
      totalPublishedDays: adhyantraRecordsInRange.length,
      isConfigured,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch public metrics' },
      { status: 500 }
    );
  }
}
