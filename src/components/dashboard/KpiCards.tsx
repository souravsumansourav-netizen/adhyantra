'use client';

import React from 'react';
import { MetricKey } from '@/types';
import { METRIC_CONFIG, formatGrowth } from '@/lib/metrics';
import {
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  UserPlus,
  Percent,
} from 'lucide-react';

interface KpiCardsProps {
  kpis: Record<
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
  >;
}

export default function KpiCards({ kpis }: KpiCardsProps) {
  const metricOrder: MetricKey[] = [
    'total_users',
    'sessions',
    'bounce_rate',
    'avg_session_duration',
    'new_users',
    'organic_bounce_rate',
  ];

  const getMetricIcon = (key: MetricKey) => {
    switch (key) {
      case 'total_users':
        return <Users className="w-5 h-5 text-indigo-600" />;
      case 'sessions':
        return <Activity className="w-5 h-5 text-blue-600" />;
      case 'bounce_rate':
        return <Percent className="w-5 h-5 text-purple-600" />;
      case 'avg_session_duration':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'new_users':
        return <UserPlus className="w-5 h-5 text-emerald-600" />;
      case 'organic_bounce_rate':
        return <Percent className="w-5 h-5 text-rose-600" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {metricOrder.map((key) => {
        const item = kpis[key];
        if (!item) return null;
        const config = METRIC_CONFIG[key];

        const isPositiveGrowth = item.changePct > 0;
        const isFavourable = item.isFavourable;

        return (
          <div
            key={key}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-4 group"
          >
            {/* Top row: Label & Icon */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm">{config.label}</h3>
                  {key === 'total_users' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Sum of daily users
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{config.description}</p>
              </div>

              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-100 transition-colors">
                {getMetricIcon(key)}
              </div>
            </div>

            {/* Middle row: Live Adhyantra Value & Growth Badge */}
            <div className="flex items-baseline justify-between gap-2 pt-1">
              <div>
                <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                  Adhyantra (Live)
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {config.format(item.adhyantraVal)}
                </div>
              </div>

              {/* Growth % Badge */}
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  isFavourable
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {isPositiveGrowth ? (
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{formatGrowth(item.changePct)}</span>
              </div>
            </div>

            {/* Bottom row: Baseline comparison */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Mriganka (Baseline):</span>
              <span className="font-bold text-slate-700">
                {config.format(item.mrigankaVal)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
