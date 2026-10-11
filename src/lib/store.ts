import {
  DailyMetric,
  AuditLogEntry,
  DashboardSettings,
  PublicMetric,
} from '@/types';
import { DEFAULT_SETTINGS } from './metrics';

// Initial demo seed data matching supabase/seed.sql
let demoMetrics: DailyMetric[] = [
  {
    id: 'seed-mriganka-2025-10-10',
    metric_date: '2025-10-10',
    source: 'mriganka',
    total_users: 79110,
    sessions: 83332,
    bounce_rate: 0.609,
    avg_session_duration: 149.2,
    new_users: 58797,
    organic_bounce_rate: 0.52,
    raw_total_users: 79110,
    raw_sessions: 83332,
    raw_bounce_rate: 0.609,
    raw_avg_session_duration: 149.2,
    raw_new_users: 58797,
    raw_organic_bounce_rate: 0.52,
    status: 'draft',
    adjustment_note: null,
    created_at: new Date('2026-10-10T00:00:00Z').toISOString(),
    updated_at: new Date('2026-10-10T00:00:00Z').toISOString(),
  },
  {
    id: 'seed-adhyantra-2026-10-10',
    metric_date: '2026-10-10',
    source: 'adhyantra',
    total_users: 46948,
    sessions: 47839,
    bounce_rate: 0.64,
    avg_session_duration: 58.7,
    new_users: 48072, // Triggers amber warning (new_users > total_users)
    organic_bounce_rate: 0.61,
    raw_total_users: 46948,
    raw_sessions: 47839,
    raw_bounce_rate: 0.64,
    raw_avg_session_duration: 58.7,
    raw_new_users: 48072,
    raw_organic_bounce_rate: 0.61,
    status: 'draft',
    adjustment_note: null,
    created_at: new Date('2026-10-10T00:00:00Z').toISOString(),
    updated_at: new Date('2026-10-10T00:00:00Z').toISOString(),
  },
];

let demoAuditLogs: AuditLogEntry[] = [
  {
    id: 'seed-log-1',
    actor: 'system_seed',
    action: 'upload',
    metric_date: '2025-10-10',
    source: 'mriganka',
    field: 'all',
    old_value: null,
    new_value: 'Initial upload from GA4 export',
    note: 'Seeded baseline metrics for 2025-10-10',
    created_at: new Date('2026-10-10T00:00:00Z').toISOString(),
  },
  {
    id: 'seed-log-2',
    actor: 'system_seed',
    action: 'upload',
    metric_date: '2026-10-10',
    source: 'adhyantra',
    field: 'all',
    old_value: null,
    new_value: 'Initial upload from GA4 export',
    note: 'Seeded campaign metrics for 2026-10-10 (non-performing test date)',
    created_at: new Date('2026-10-10T00:00:00Z').toISOString(),
  },
];

let demoSettings: DashboardSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  ...DEFAULT_SETTINGS,
};

export const DemoStore = {
  isConfigured(): boolean {
    return !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    );
  },

  getAllMetrics(): DailyMetric[] {
    return [...demoMetrics];
  },

  getPublishedMetrics(): PublicMetric[] {
    return demoMetrics
      .filter((m) => m.status === 'published')
      .map((m) => ({
        metric_date: m.metric_date,
        source: m.source,
        total_users: m.total_users,
        sessions: m.sessions,
        bounce_rate: m.bounce_rate,
        avg_session_duration: m.avg_session_duration,
        new_users: m.new_users,
        organic_bounce_rate: m.organic_bounce_rate,
      }));
  },

  upsertMetric(
    record: Omit<DailyMetric, 'id' | 'created_at' | 'updated_at'>
  ): DailyMetric {
    const existingIndex = demoMetrics.findIndex(
      (m) => m.metric_date === record.metric_date && m.source === record.source
    );

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      const updated: DailyMetric = {
        ...demoMetrics[existingIndex],
        ...record,
        updated_at: now,
      };
      demoMetrics[existingIndex] = updated;
      return updated;
    } else {
      const created: DailyMetric = {
        id: `metric-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...record,
        created_at: now,
        updated_at: now,
      };
      demoMetrics.push(created);
      return created;
    }
  },

  updateStatus(date: string, status: 'draft' | 'published') {
    demoMetrics.forEach((m) => {
      if (m.metric_date === date || (m.source === 'mriganka' && (m.metric_date === date || m.metric_date === `${parseInt(date.split('-')[0]) - 1}-${date.split('-')[1]}-${date.split('-')[2]}`))) {
        m.status = status;
        m.updated_at = new Date().toISOString();
      }
    });
  },

  deleteMetrics(dates: string[], source?: 'adhyantra' | 'mriganka' | 'both'): number {
    const initialLen = demoMetrics.length;
    demoMetrics = demoMetrics.filter((m) => {
      const isDateMatch = dates.some((d) => {
        const [y, mon, day] = d.split('-');
        const yoyDate = `${parseInt(y, 10) - 1}-${mon}-${day}`;
        return m.metric_date === d || (m.source === 'mriganka' && m.metric_date === yoyDate);
      });

      if (!isDateMatch) return true;
      if (!source || source === 'both') return false;
      if (source === m.source) return false;
      return true;
    });
    return initialLen - demoMetrics.length;
  },

  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): AuditLogEntry {
    const log: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...entry,
      created_at: new Date().toISOString(),
    };
    demoAuditLogs.unshift(log);
    return log;
  },

  getAuditLogs(): AuditLogEntry[] {
    return [...demoAuditLogs];
  },

  getSettings(): DashboardSettings {
    return { ...demoSettings };
  },

  updateSettings(settings: Partial<DashboardSettings>): DashboardSettings {
    demoSettings = { ...demoSettings, ...settings, updated_at: new Date().toISOString() };
    return { ...demoSettings };
  },
};
