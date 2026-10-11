import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/server';
import { DemoStore } from '@/lib/store';
import { MetricKey, MetricSource } from '@/types';

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
    const {
      metric_date,
      source = 'adhyantra',
      field,
      action, // 'edit' | 'approve' | 'set_baseline' | 'bulk_edit'
      adjusted_value,
      metrics,
      note = 'Metric edited by admin',
    } = body as {
      metric_date: string;
      source: MetricSource;
      field?: MetricKey | 'baseline_pairing';
      action: 'edit' | 'approve' | 'set_baseline' | 'bulk_edit';
      adjusted_value?: number;
      metrics?: Record<string, number>;
      note?: string;
    };

    if (!metric_date || !action) {
      return NextResponse.json(
        { error: 'metric_date and action are required' },
        { status: 400 }
      );
    }

    const noteText = note && note.trim() ? note.trim() : 'Updated by admin';

    if (isConfigured) {
      const supabaseAdmin = createAdminClient();

      // Fetch existing record
      const { data: record, error: fetchError } = await supabaseAdmin
        .from('daily_metrics')
        .select('*')
        .eq('metric_date', metric_date)
        .eq('source', source)
        .single();

      if (fetchError || !record) {
        return NextResponse.json(
          { error: `Metric record not found for ${source} on ${metric_date}` },
          { status: 404 }
        );
      }

      let currentNotes: Record<string, any> = {};
      try {
        if (record.adjustment_note) currentNotes = JSON.parse(record.adjustment_note);
      } catch {}

      const updatePayload: Record<string, any> = {};
      const auditEntries: any[] = [];

      if (action === 'set_baseline') {
        const pairedDate = noteText;
        currentNotes.paired_baseline_date = pairedDate;
        updatePayload.adjustment_note = JSON.stringify(currentNotes);

        auditEntries.push({
          actor: userEmail,
          action: 'edit',
          metric_date,
          source,
          field: 'baseline_pairing',
          old_value: null,
          new_value: pairedDate,
          note: `Paired with Mriganka baseline date: ${pairedDate}`,
        });
      } else if (action === 'bulk_edit' && metrics) {
        Object.entries(metrics).forEach(([fKey, fVal]) => {
          const numVal = Number(fVal);
          if (!isNaN(numVal)) {
            updatePayload[fKey] = numVal;
            currentNotes[fKey] = {
              adjusted: true,
              approved: false,
              reason: noteText,
              updated_at: new Date().toISOString(),
            };
            auditEntries.push({
              actor: userEmail,
              action: 'edit',
              metric_date,
              source,
              field: fKey,
              old_value: String(record[fKey] ?? ''),
              new_value: String(numVal),
              note: noteText,
            });
          }
        });
        updatePayload.adjustment_note = JSON.stringify(currentNotes);
      } else if (action === 'edit' && field) {
        const numVal = Number(adjusted_value);
        if (isNaN(numVal)) {
          return NextResponse.json(
            { error: 'Invalid numeric value for adjustment.' },
            { status: 400 }
          );
        }
        updatePayload[field] = numVal;
        currentNotes[field] = {
          adjusted: true,
          approved: false,
          reason: noteText,
          updated_at: new Date().toISOString(),
        };
        updatePayload.adjustment_note = JSON.stringify(currentNotes);

        auditEntries.push({
          actor: userEmail,
          action: 'edit',
          metric_date,
          source,
          field,
          old_value: String(record[field] ?? ''),
          new_value: String(numVal),
          note: noteText,
        });
      } else if (action === 'approve' && field) {
        currentNotes[field] = {
          adjusted: false,
          approved: true,
          reason: noteText,
          updated_at: new Date().toISOString(),
        };
        updatePayload.adjustment_note = JSON.stringify(currentNotes);

        auditEntries.push({
          actor: userEmail,
          action: 'approve',
          metric_date,
          source,
          field,
          old_value: String(record[field] ?? ''),
          new_value: 'approved_as_is',
          note: noteText,
        });
      }

      // Update daily_metrics
      const { error: updateError } = await supabaseAdmin
        .from('daily_metrics')
        .update(updatePayload)
        .eq('id', record.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Add audit_log entry
      if (auditEntries.length > 0) {
        await supabaseAdmin.from('audit_log').insert(auditEntries);
      }
    } else {
      // Demo store update
      const allMetrics = DemoStore.getAllMetrics();
      const record = allMetrics.find(
        (m) => m.metric_date === metric_date && m.source === source
      );

      if (!record) {
        return NextResponse.json(
          { error: `Metric record not found for ${source} on ${metric_date}` },
          { status: 404 }
        );
      }

      let currentNotes: Record<string, any> = {};
      try {
        if (record.adjustment_note) currentNotes = JSON.parse(record.adjustment_note);
      } catch {}

      if (action === 'set_baseline') {
        currentNotes.paired_baseline_date = noteText;
        record.adjustment_note = JSON.stringify(currentNotes);
        DemoStore.addAuditLog({
          actor: userEmail,
          action: 'edit',
          metric_date,
          source,
          field: 'baseline_pairing',
          old_value: null,
          new_value: noteText,
          note: `Paired with Mriganka baseline date: ${noteText}`,
        });
      } else if (action === 'bulk_edit' && metrics) {
        Object.entries(metrics).forEach(([fKey, fVal]) => {
          const numVal = Number(fVal);
          if (!isNaN(numVal)) {
            const oldV = String((record as any)[fKey] ?? '');
            (record as any)[fKey] = numVal;
            currentNotes[fKey] = {
              adjusted: true,
              approved: false,
              reason: noteText,
              updated_at: new Date().toISOString(),
            };
            DemoStore.addAuditLog({
              actor: userEmail,
              action: 'edit',
              metric_date,
              source,
              field: fKey,
              old_value: oldV,
              new_value: String(numVal),
              note: noteText,
            });
          }
        });
        record.adjustment_note = JSON.stringify(currentNotes);
      } else if (action === 'edit' && field) {
        const numVal = Number(adjusted_value);
        const oldV = String((record as any)[field] ?? '');
        (record as any)[field] = numVal;

        currentNotes[field] = {
          adjusted: true,
          approved: false,
          reason: noteText,
          updated_at: new Date().toISOString(),
        };
        record.adjustment_note = JSON.stringify(currentNotes);

        DemoStore.addAuditLog({
          actor: userEmail,
          action: 'edit',
          metric_date,
          source,
          field,
          old_value: oldV,
          new_value: String(numVal),
          note: noteText,
        });
      } else if (action === 'approve' && field) {
        currentNotes[field] = {
          adjusted: false,
          approved: true,
          reason: noteText,
          updated_at: new Date().toISOString(),
        };
        record.adjustment_note = JSON.stringify(currentNotes);

        DemoStore.addAuditLog({
          actor: userEmail,
          action: 'approve',
          metric_date,
          source,
          field,
          old_value: String((record as any)[field] ?? ''),
          new_value: 'approved_as_is',
          note: noteText,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully resolved ${field} on ${metric_date}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to adjust metric' },
      { status: 500 }
    );
  }
}
