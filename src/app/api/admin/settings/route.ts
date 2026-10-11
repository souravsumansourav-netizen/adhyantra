import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/server';
import { DemoStore } from '@/lib/store';
import { DEFAULT_SETTINGS } from '@/lib/metrics';
import { DashboardSettings } from '@/types';

export async function GET() {
  try {
    const isConfigured = DemoStore.isConfigured();

    if (isConfigured) {
      const auth = await verifyAdminSession();
      if (!auth.authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const supabaseAdmin = createAdminClient();
      const { data, error } = await supabaseAdmin
        .from('settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      const settings: DashboardSettings = data
        ? {
            id: data.id,
            underperform_threshold_pct: Number(data.underperform_threshold_pct),
            metric_directions: data.metric_directions,
            baseline_mode: data.baseline_mode || 'yoy',
            updated_at: data.updated_at,
          }
        : DEFAULT_SETTINGS;

      return NextResponse.json({ success: true, settings });
    } else {
      return NextResponse.json({ success: true, settings: DemoStore.getSettings() });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

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
    const { underperform_threshold_pct, metric_directions, baseline_mode } = body;

    const threshold = Number(underperform_threshold_pct);
    if (isNaN(threshold) || threshold < 0) {
      return NextResponse.json(
        { error: 'Threshold must be a positive number' },
        { status: 400 }
      );
    }

    if (isConfigured) {
      const supabaseAdmin = createAdminClient();

      const { data, error } = await supabaseAdmin
        .from('settings')
        .upsert(
          {
            id: '00000000-0000-0000-0000-000000000001',
            underperform_threshold_pct: threshold,
            metric_directions,
            baseline_mode: baseline_mode || 'yoy',
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await supabaseAdmin.from('audit_log').insert({
        actor: userEmail,
        action: 'edit',
        metric_date: new Date().toISOString().split('T')[0],
        source: 'adhyantra',
        field: 'settings',
        old_value: null,
        new_value: `Threshold: ${threshold}%, Mode: ${baseline_mode}`,
        note: 'Updated settings configuration',
      });

      return NextResponse.json({ success: true, settings: data });
    } else {
      const updated = DemoStore.updateSettings({
        underperform_threshold_pct: threshold,
        metric_directions,
        baseline_mode: baseline_mode || 'yoy',
      });

      DemoStore.addAuditLog({
        actor: userEmail,
        action: 'edit',
        metric_date: new Date().toISOString().split('T')[0],
        source: 'adhyantra',
        field: 'settings',
        old_value: null,
        new_value: `Threshold: ${threshold}%, Mode: ${baseline_mode}`,
        note: 'Updated settings configuration',
      });

      return NextResponse.json({ success: true, settings: updated });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
