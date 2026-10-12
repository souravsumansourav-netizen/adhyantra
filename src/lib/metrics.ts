import {
  MetricKey,
  MetricDirection,
  DashboardSettings,
  DailyMetric,
  DateComparisonRow,
  SanityIssue,
  MetricComparisonItem,
  RangeAggregatedMetrics,
  PublicMetric,
} from '@/types';

export const DEFAULT_SETTINGS: DashboardSettings = {
  underperform_threshold_pct: 2,
  metric_directions: {
    total_users: 'higher_better',
    sessions: 'higher_better',
    bounce_rate: 'lower_better',
    avg_session_duration: 'higher_better',
    new_users: 'higher_better',
    organic_bounce_rate: 'lower_better',
  },
  baseline_mode: 'yoy',
};

export const METRIC_CONFIG: Record<
  MetricKey,
  {
    label: string;
    description: string;
    unit: string;
    format: (val: number) => string;
    higherBetter: boolean;
  }
> = {
  total_users: {
    label: 'Total users',
    description: 'Sum of daily active users visiting the platform',
    unit: '',
    format: (val) => formatIndianNumber(Math.round(val)),
    higherBetter: true,
  },
  sessions: {
    label: 'Sessions',
    description: 'Total user browsing sessions recorded',
    unit: '',
    format: (val) => formatIndianNumber(Math.round(val)),
    higherBetter: true,
  },
  bounce_rate: {
    label: 'Bounce rate',
    description: 'Percentage of single-page or unengaged sessions',
    unit: '%',
    format: (val) => formatPercent(val),
    higherBetter: false,
  },
  avg_session_duration: {
    label: 'Avg session duration',
    description: 'Average time spent per session in minutes & seconds',
    unit: 's',
    format: (val) => formatDuration(val),
    higherBetter: true,
  },
  new_users: {
    label: 'New users',
    description: 'First-time users acquiring sessions',
    unit: '',
    format: (val) => formatIndianNumber(Math.round(val)),
    higherBetter: true,
  },
  organic_bounce_rate: {
    label: 'Organic bounce rate',
    description: 'Bounce rate specifically for organic traffic channels',
    unit: '%',
    format: (val) => formatPercent(val),
    higherBetter: false,
  },
};

/**
 * Format large numbers using Indian digit grouping (e.g. 79,110 or 1,46,948).
 */
export function formatIndianNumber(val: number): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('en-IN');
}

/**
 * Format duration in seconds to mm:ss (e.g. 149.2 -> 02:29).
 */
export function formatDuration(seconds: number): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '00:00';
  const totalSecs = Math.max(0, Math.round(seconds));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format decimal fraction (0-1) to percentage string (e.g. 0.6090 -> 60.90%).
 */
export function formatPercent(fraction: number, decimals = 2): string {
  if (fraction === null || fraction === undefined || isNaN(fraction)) return '0.00%';
  const pct = fraction * 100;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format relative change % string with sign.
 */
export function formatGrowth(changePct: number): string {
  if (changePct === null || changePct === undefined || isNaN(changePct)) return '0.00%';
  const prefix = changePct > 0 ? '+' : '';
  return `${prefix}${changePct.toFixed(2)}%`;
}

/**
 * Relative Change % = ((adhyantra - mriganka) / mriganka) * 100
 */
export function calculateChangePct(adhyantraVal: number, mrigankaVal: number): number {
  if (!mrigankaVal || mrigankaVal === 0) return 0;
  return ((adhyantraVal - mrigankaVal) / mrigankaVal) * 100;
}

/**
 * Determines whether a metric is non-performing (flagged red) based on threshold and direction.
 */
export function isMetricNonPerforming(
  changePct: number,
  direction: MetricDirection,
  thresholdPct = 2
): boolean {
  if (direction === 'higher_better') {
    // Flag when change <= -2%
    return changePct <= -thresholdPct;
  } else {
    // lower_better: Flag when change >= +2%
    return changePct >= thresholdPct;
  }
}

/**
 * Determines if change is favourable (green).
 */
export function isMetricFavourable(changePct: number, direction: MetricDirection): boolean {
  if (direction === 'higher_better') {
    return changePct > 0;
  } else {
    // For bounce rate, a decrease is green
    return changePct < 0;
  }
}

/**
 * Parse structured adjustment notes to check if a specific metric was adjusted or approved as-is.
 */
export function parseMetricResolution(
  note?: string | null
): Record<MetricKey, { adjusted: boolean; approved: boolean; reason?: string }> {
  const result: Record<MetricKey, { adjusted: boolean; approved: boolean; reason?: string }> = {
    total_users: { adjusted: false, approved: false },
    sessions: { adjusted: false, approved: false },
    bounce_rate: { adjusted: false, approved: false },
    avg_session_duration: { adjusted: false, approved: false },
    new_users: { adjusted: false, approved: false },
    organic_bounce_rate: { adjusted: false, approved: false },
  };

  if (!note) return result;

  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === 'object') {
      for (const key of Object.keys(result) as MetricKey[]) {
        if (parsed[key]) {
          result[key] = {
            adjusted: !!parsed[key].adjusted,
            approved: !!parsed[key].approved,
            reason: parsed[key].reason,
          };
        }
      }
    }
  } catch {
    // Note might be plain text
  }

  return result;
}

/**
 * Matches baseline date for an Adhyantra date.
 * Festival campaign alignment:
 *   Adhyantra Day 1 (2026-10-10) -> Mriganka Day 1 (2025-09-21)
 *   10th data is compared to 21st Sep, 11th compared to 22nd Sep, and so on.
 * Mode supports 'festival' (default), 'yoy', or 'same_date'.
 */
export function getBaselineDate(
  dateStr: string,
  mode: 'festival' | 'yoy' | 'same_date' = 'festival'
): string {
  if (mode === 'same_date') return dateStr;

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  // Campaign Day 1: October 10th (2026-10-10) corresponds to Mriganka Baseline Day 1: September 21st (2025-09-21)
  // 10th -> 21st Sep, 11th -> 22nd Sep, 12th -> 23rd Sep, and so on.
  const currentDate = new Date(Date.UTC(y, m - 1, d));
  const campaignAnchor = new Date(Date.UTC(y, 9, 10)); // October 10
  const diffDays = Math.round(
    (currentDate.getTime() - campaignAnchor.getTime()) / (24 * 60 * 60 * 1000)
  );

  const baselineAnchor = new Date(Date.UTC(y - 1, 8, 21)); // September 21
  baselineAnchor.setUTCDate(baselineAnchor.getUTCDate() + diffDays);
  return baselineAnchor.toISOString().split('T')[0];
}

/**
 * Pairs daily metrics for admin review table and validates sanity rules.
 */
export function buildDateComparisonRows(
  records: DailyMetric[],
  settings: DashboardSettings = DEFAULT_SETTINGS
): DateComparisonRow[] {
  const rows: DateComparisonRow[] = [];
  const adhyantraMap = new Map<string, DailyMetric>();
  const mrigankaMap = new Map<string, DailyMetric>();

  records.forEach((rec) => {
    if (rec.source === 'adhyantra') {
      adhyantraMap.set(rec.metric_date, rec);
    } else {
      mrigankaMap.set(rec.metric_date, rec);
    }
  });

  const availableMrigankaDates = Array.from(mrigankaMap.keys()).sort((a, b) => b.localeCompare(a));
  const pairedMrigankaDates = new Set<string>();

  // Process all Adhyantra records first
  const adhyantraDates = Array.from(adhyantraMap.keys()).sort((a, b) => b.localeCompare(a));

  for (const date of adhyantraDates) {
    const adhyantra = adhyantraMap.get(date)!;

    // Check if user set a manual paired_baseline_date in adjustment_note
    let manualBaselineDate: string | undefined;
    try {
      if (adhyantra.adjustment_note) {
        const parsed = JSON.parse(adhyantra.adjustment_note);
        if (parsed.paired_baseline_date) {
          manualBaselineDate = parsed.paired_baseline_date;
        }
      }
    } catch {}

    const pairedBaselineDate = getBaselineDate(date, settings.baseline_mode as any);

    // Resolve Mriganka record:
    // 1. Manually assigned baseline date
    // 2. Calculated festival baseline match (e.g. 10th -> 21st Sep, 11th -> 22nd Sep)
    // 3. Exact same date match
    // 4. Any available Mriganka date not yet paired, or the single available Mriganka date
    // 5. Fallback: first available Mriganka date
    let mriganka: DailyMetric | undefined;

    if (manualBaselineDate && mrigankaMap.has(manualBaselineDate)) {
      mriganka = mrigankaMap.get(manualBaselineDate);
    } else if (mrigankaMap.has(pairedBaselineDate)) {
      mriganka = mrigankaMap.get(pairedBaselineDate);
    } else if (mrigankaMap.has(date)) {
      mriganka = mrigankaMap.get(date);
    } else if (availableMrigankaDates.length === 1) {
      mriganka = mrigankaMap.get(availableMrigankaDates[0]);
    } else if (availableMrigankaDates.length > 0) {
      const unpaired = availableMrigankaDates.find((d) => !pairedMrigankaDates.has(d));
      mriganka = mrigankaMap.get(unpaired || availableMrigankaDates[0]);
    }

    if (mriganka) {
      pairedMrigankaDates.add(mriganka.metric_date);
    }

    const matchedBaselineDate = mriganka
      ? mriganka.metric_date
      : manualBaselineDate || pairedBaselineDate;
    const sanityIssues: SanityIssue[] = [];

    // Check missing sources
    if (!mriganka) {
      sanityIssues.push({
        type: 'missing_baseline',
        severity: 'amber',
        message: `No Mriganka baseline data uploaded yet (${matchedBaselineDate})`,
      });
    }

    // Check sanity failures on Adhyantra
    if (adhyantra.new_users > adhyantra.total_users) {
      sanityIssues.push({
        type: 'users_mismatch',
        severity: 'amber',
        message: `Sanity warning: New users (${formatIndianNumber(adhyantra.new_users)}) exceeds Total users (${formatIndianNumber(adhyantra.total_users)})`,
      });
    }
    if (adhyantra.bounce_rate < 0 || adhyantra.bounce_rate > 1) {
      sanityIssues.push({
        type: 'invalid_bounce',
        severity: 'amber',
        message: `Bounce rate (${formatPercent(adhyantra.bounce_rate)}) is outside valid range (0-100%)`,
      });
    }
    if (adhyantra.organic_bounce_rate < 0 || adhyantra.organic_bounce_rate > 1) {
      sanityIssues.push({
        type: 'invalid_organic_bounce',
        severity: 'amber',
        message: `Organic bounce rate (${formatPercent(adhyantra.organic_bounce_rate)}) is outside valid range (0-100%)`,
      });
    }

    // Parse resolutions from adjustment_note
    const resolutions = parseMetricResolution(adhyantra.adjustment_note);

    const metricsRecord = {} as Record<MetricKey, MetricComparisonItem>;
    let unresolvedRedCount = 0;

    const metricKeys: MetricKey[] = [
      'total_users',
      'sessions',
      'bounce_rate',
      'avg_session_duration',
      'new_users',
      'organic_bounce_rate',
    ];

    for (const key of metricKeys) {
      const adhyVal = Number(adhyantra[key]);
      const mrigVal = mriganka ? Number(mriganka[key]) : 0;
      const rawAdhyVal = Number(adhyantra[`raw_${key}` as keyof DailyMetric] ?? adhyVal);
      const rawMrigVal = mriganka ? Number(mriganka[`raw_${key}` as keyof DailyMetric] ?? mrigVal) : 0;

      const changePct = mrigVal > 0 ? calculateChangePct(adhyVal, mrigVal) : 0;
      const direction = settings.metric_directions[key] || 'higher_better';
      const isNonPerforming = isMetricNonPerforming(
        changePct,
        direction,
        settings.underperform_threshold_pct
      );
      const isFavourable = isMetricFavourable(changePct, direction);

      const isAdjusted = resolutions[key]?.adjusted || rawAdhyVal !== adhyVal;
      const isApproved = resolutions[key]?.approved || false;

      // If red and neither adjusted nor approved, count as unresolved
      if (isNonPerforming && !isAdjusted && !isApproved) {
        unresolvedRedCount++;
      }

      metricsRecord[key] = {
        key,
        label: METRIC_CONFIG[key].label,
        adhyantraVal: adhyVal,
        mrigankaVal: mrigVal,
        changePct,
        isNonPerforming,
        isFavourable,
        isAdjusted,
        isApproved,
        rawAdhyantraVal: rawAdhyVal,
        rawMrigankaVal: rawMrigVal,
        direction,
      };
    }

    const currentStatus = adhyantra.status || 'draft';
    const canPublish = unresolvedRedCount === 0;

    rows.push({
      date,
      baselineDate: matchedBaselineDate,
      status: currentStatus,
      hasAdhyantra: true,
      hasMriganka: !!mriganka,
      adhyantraRecord: adhyantra,
      mrigankaRecord: mriganka,
      metrics: metricsRecord,
      sanityIssues,
      unresolvedRedCount,
      canPublish,
      availableMrigankaDates,
    });
  }

  // Only add orphan Mriganka rows if they have NOT been paired with any Adhyantra row
  for (const mrigankaDate of availableMrigankaDates) {
    if (!pairedMrigankaDates.has(mrigankaDate)) {
      const mriganka = mrigankaMap.get(mrigankaDate)!;
      const metricsRecord = {} as Record<MetricKey, MetricComparisonItem>;

      const metricKeys: MetricKey[] = [
        'total_users',
        'sessions',
        'bounce_rate',
        'avg_session_duration',
        'new_users',
        'organic_bounce_rate',
      ];

      for (const key of metricKeys) {
        const mrigVal = Number(mriganka[key]);
        const rawMrigVal = Number(mriganka[`raw_${key}` as keyof DailyMetric] ?? mrigVal);
        const direction = settings.metric_directions[key] || 'higher_better';

        metricsRecord[key] = {
          key,
          label: METRIC_CONFIG[key].label,
          adhyantraVal: 0,
          mrigankaVal: mrigVal,
          changePct: 0,
          isNonPerforming: false,
          isFavourable: false,
          isAdjusted: false,
          isApproved: false,
          rawAdhyantraVal: 0,
          rawMrigankaVal: rawMrigVal,
          direction,
        };
      }

      rows.push({
        date: mrigankaDate,
        baselineDate: mrigankaDate,
        status: mriganka.status || 'draft',
        hasAdhyantra: false,
        hasMriganka: true,
        adhyantraRecord: undefined,
        mrigankaRecord: mriganka,
        metrics: metricsRecord,
        sanityIssues: [
          {
            type: 'missing_campaign',
            severity: 'amber',
            message: 'Baseline data uploaded; waiting to be compared with an Adhyantra date',
          },
        ],
        unresolvedRedCount: 0,
        canPublish: false,
        availableMrigankaDates,
      });
    }
  }

  return rows;
}

/**
 * Aggregates a list of daily metrics across a date range according to the rules:
 * - total_users, sessions, and new_users are summed across the dates
 * - bounce_rate, avg_session_duration, and organic_bounce_rate are averaged across the dates
 */
export function aggregateMetrics(records: (DailyMetric | PublicMetric)[]): RangeAggregatedMetrics {
  if (records.length === 0) {
    return {
      total_users: 0,
      sessions: 0,
      bounce_rate: 0,
      avg_session_duration: 0,
      new_users: 0,
      organic_bounce_rate: 0,
    };
  }

  let sumDailyUsers = 0;
  let sumSessions = 0;
  let sumNewUsers = 0;
  let sumBounce = 0;
  let countBounce = 0;
  let sumOrganicBounce = 0;
  let countOrganicBounce = 0;
  let sumDuration = 0;
  let countDuration = 0;

  for (const r of records) {
    sumDailyUsers += Number(r.total_users) || 0;
    sumSessions += Number(r.sessions) || 0;
    sumNewUsers += Number(r.new_users) || 0;

    if (r.bounce_rate !== null && r.bounce_rate !== undefined && !isNaN(Number(r.bounce_rate))) {
      sumBounce += Number(r.bounce_rate);
      countBounce++;
    }
    if (
      r.organic_bounce_rate !== null &&
      r.organic_bounce_rate !== undefined &&
      !isNaN(Number(r.organic_bounce_rate))
    ) {
      sumOrganicBounce += Number(r.organic_bounce_rate);
      countOrganicBounce++;
    }
    if (
      r.avg_session_duration !== null &&
      r.avg_session_duration !== undefined &&
      !isNaN(Number(r.avg_session_duration))
    ) {
      sumDuration += Number(r.avg_session_duration);
      countDuration++;
    }
  }

  const avgBounce = countBounce > 0 ? sumBounce / countBounce : 0;
  const avgOrganicBounce = countOrganicBounce > 0 ? sumOrganicBounce / countOrganicBounce : 0;
  const avgDuration = countDuration > 0 ? sumDuration / countDuration : 0;

  return {
    total_users: sumDailyUsers,
    sessions: sumSessions,
    bounce_rate: avgBounce,
    avg_session_duration: avgDuration,
    new_users: sumNewUsers,
    organic_bounce_rate: avgOrganicBounce,
  };
}
