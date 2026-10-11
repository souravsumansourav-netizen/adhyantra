export type MetricSource = 'adhyantra' | 'mriganka';
export type MetricStatus = 'draft' | 'published';
export type MetricDirection = 'higher_better' | 'lower_better';
export type BaselineMode = 'yoy' | 'same_date';

export type MetricKey =
  | 'total_users'
  | 'sessions'
  | 'bounce_rate'
  | 'avg_session_duration'
  | 'new_users'
  | 'organic_bounce_rate';

export interface DailyMetric {
  id: string;
  metric_date: string; // YYYY-MM-DD
  source: MetricSource;
  total_users: number;
  sessions: number;
  bounce_rate: number; // 0 to 1
  avg_session_duration: number; // in seconds
  new_users: number;
  organic_bounce_rate: number; // 0 to 1
  raw_total_users: number;
  raw_sessions: number;
  raw_bounce_rate: number;
  raw_avg_session_duration: number;
  raw_new_users: number;
  raw_organic_bounce_rate: number;
  status: MetricStatus;
  adjustment_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicMetric {
  metric_date: string;
  source: MetricSource;
  total_users: number;
  sessions: number;
  bounce_rate: number;
  avg_session_duration: number;
  new_users: number;
  organic_bounce_rate: number;
}

export type AuditAction = 'upload' | 'edit' | 'approve' | 'publish' | 'unpublish' | 'delete';

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: AuditAction;
  metric_date: string;
  source: MetricSource;
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  note?: string | null;
  created_at: string;
}

export interface DashboardSettings {
  id?: string;
  underperform_threshold_pct: number;
  metric_directions: Record<MetricKey, MetricDirection>;
  baseline_mode: BaselineMode;
  updated_at?: string;
}

export interface SanityIssue {
  type: 'users_mismatch' | 'invalid_bounce' | 'invalid_organic_bounce' | 'missing_baseline' | 'missing_campaign';
  severity: 'amber' | 'red';
  message: string;
}

export interface MetricComparisonItem {
  key: MetricKey;
  label: string;
  adhyantraVal: number;
  mrigankaVal: number;
  changePct: number; // (adhyantra - mriganka) / mriganka * 100
  isNonPerforming: boolean; // Flagged red
  isFavourable: boolean; // Green
  isAdjusted: boolean;
  isApproved: boolean;
  rawAdhyantraVal: number;
  rawMrigankaVal: number;
  direction: MetricDirection;
}

export interface DateComparisonRow {
  date: string; // Adhyantra date (e.g. 2026-10-10)
  baselineDate: string; // Matched Mriganka date (e.g. 2025-10-10)
  status: MetricStatus; // Draft or Published
  hasAdhyantra: boolean;
  hasMriganka: boolean;
  adhyantraRecord?: DailyMetric;
  mrigankaRecord?: DailyMetric;
  metrics: Record<MetricKey, MetricComparisonItem>;
  sanityIssues: SanityIssue[];
  unresolvedRedCount: number;
  canPublish: boolean;
  availableMrigankaDates?: string[];
}

export interface RangeAggregatedMetrics {
  total_users: number;
  sessions: number;
  bounce_rate: number;
  avg_session_duration: number;
  new_users: number;
  organic_bounce_rate: number;
}
