import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/server';
import { DemoStore } from '@/lib/store';
import { MetricSource } from '@/types';

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
    const source = body.source as MetricSource;
    const filename = body.filename as string | undefined;

    if (!source) {
      return NextResponse.json(
        { error: 'Source is required' },
        { status: 400 }
      );
    }

    // Determine if single record or multiple records
    const rawRecords = Array.isArray(body.records) && body.records.length > 0
      ? body.records
      : [body];

    const validPayloads = rawRecords
      .filter((r: any) => !!r.metric_date)
      .map((rec: any) => ({
        metric_date: rec.metric_date,
        source,
        total_users: Math.round(Number(rec.total_users) || 0),
        sessions: Math.round(Number(rec.sessions) || 0),
        bounce_rate: Number(rec.bounce_rate) || 0,
        avg_session_duration: Number(rec.avg_session_duration) || 0,
        new_users: Math.round(Number(rec.new_users) || 0),
        organic_bounce_rate: Number(rec.organic_bounce_rate ?? 0.5),
        raw_total_users: Math.round(Number(rec.total_users) || 0),
        raw_sessions: Math.round(Number(rec.sessions) || 0),
        raw_bounce_rate: Number(rec.bounce_rate) || 0,
        raw_avg_session_duration: Number(rec.avg_session_duration) || 0,
        raw_new_users: Math.round(Number(rec.new_users) || 0),
        raw_organic_bounce_rate: Number(rec.organic_bounce_rate ?? 0.5),
        status: 'draft' as const,
        adjustment_note: null,
      }));

    if (validPayloads.length === 0) {
      return NextResponse.json(
        { error: 'metric_date is required for uploaded record(s)' },
        { status: 400 }
      );
    }

    if (isConfigured) {
      const supabaseAdmin = createAdminClient();

      // Upsert into daily_metrics on conflict (metric_date, source)
      const { error: upsertError } = await supabaseAdmin
        .from('daily_metrics')
        .upsert(validPayloads, { onConflict: 'metric_date,source' });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      // Log to audit_log for each date
      const auditEntries = validPayloads.map((p: any) => ({
        actor: userEmail,
        action: 'upload' as const,
        metric_date: p.metric_date,
        source,
        field: 'all',
        old_value: null,
        new_value: `Users: ${p.total_users}, Sessions: ${p.sessions}, Bounce: ${(p.bounce_rate * 100).toFixed(1)}%`,
        note: `Uploaded GA4 file (${filename || 'file'}) as draft`,
      }));

      await supabaseAdmin.from('audit_log').insert(auditEntries);
    } else {
      validPayloads.forEach((p: any) => {
        DemoStore.upsertMetric(p);
        DemoStore.addAuditLog({
          actor: userEmail,
          action: 'upload',
          metric_date: p.metric_date,
          source,
          field: 'all',
          old_value: null,
          new_value: `Users: ${p.total_users}, Sessions: ${p.sessions}, Bounce: ${(p.bounce_rate * 100).toFixed(1)}%`,
          note: `Uploaded GA4 file (${filename || 'file'}) as draft`,
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: `Draft successfully saved for ${source} (${validPayloads.length} date record(s))`,
      count: validPayloads.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save uploaded draft' },
      { status: 500 }
    );
  }
}
