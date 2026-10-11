import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/server';
import { DemoStore } from '@/lib/store';
import { AuditLogEntry } from '@/types';

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
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({ success: true, logs: (data || []) as AuditLogEntry[] });
    } else {
      const logs = DemoStore.getAuditLogs();
      return NextResponse.json({ success: true, logs });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
