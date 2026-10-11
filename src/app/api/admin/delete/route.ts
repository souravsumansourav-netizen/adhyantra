import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/server';
import { DemoStore } from '@/lib/store';

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
    const { dates, source = 'both' } = body as {
      dates: string[];
      source?: 'adhyantra' | 'mriganka' | 'both';
    };

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: 'An array of dates is required for deletion' },
        { status: 400 }
      );
    }

    if (isConfigured) {
      const supabaseAdmin = createAdminClient();

      for (const d of dates) {
        const [y, m, day] = d.split('-');
        const yoyDate = `${parseInt(y, 10) - 1}-${m}-${day}`;

        let query = supabaseAdmin.from('daily_metrics').delete();

        if (source === 'adhyantra') {
          query = query.eq('metric_date', d).eq('source', 'adhyantra');
        } else if (source === 'mriganka') {
          query = query.or(`and(metric_date.eq.${d},source.eq.mriganka),and(metric_date.eq.${yoyDate},source.eq.mriganka)`);
        } else {
          // both: delete adhyantra on d, and mriganka on d or yoyDate
          query = query.or(`metric_date.eq.${d},and(metric_date.eq.${yoyDate},source.eq.mriganka)`);
        }

        const { error } = await query;
        if (error) {
          throw new Error(error.message);
        }

        await supabaseAdmin.from('audit_log').insert({
          actor: userEmail,
          action: 'delete',
          metric_date: d,
          source: source === 'both' ? 'adhyantra' : source,
          field: 'all',
          old_value: 'metrics_data',
          new_value: null,
          note: `Deleted records for date ${d} (source: ${source}) via admin console`,
        });
      }
    } else {
      DemoStore.deleteMetrics(dates, source);
      for (const d of dates) {
        DemoStore.addAuditLog({
          actor: userEmail,
          action: 'delete',
          metric_date: d,
          source: source === 'both' ? 'adhyantra' : source,
          field: 'all',
          old_value: 'metrics_data',
          new_value: null,
          note: `Deleted records for date ${d} (source: ${source}) via admin console`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted metrics for ${dates.length} date(s).`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete metrics' },
      { status: 500 }
    );
  }
}
