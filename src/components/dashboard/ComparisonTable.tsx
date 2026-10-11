'use client';

import React from 'react';
import { MetricKey } from '@/types';
import { METRIC_CONFIG, formatGrowth } from '@/lib/metrics';
import { ArrowUpRight, ArrowDownRight, Table as TableIcon } from 'lucide-react';

interface ComparisonTableProps {
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

export default function ComparisonTable({ kpis }: ComparisonTableProps) {
  const metricOrder: MetricKey[] = [
    'total_users',
    'sessions',
    'bounce_rate',
    'avg_session_duration',
    'new_users',
    'organic_bounce_rate',
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-indigo-600" />
            Performance Breakdown Table
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Published final campaign results vs baseline with directional growth impact
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
              <th className="py-3 px-4">Metric</th>
              <th className="py-3 px-4 text-right">Adhyantra (Live)</th>
              <th className="py-3 px-4 text-right">Mriganka (Baseline)</th>
              <th className="py-3 px-4 text-right">Growth %</th>
              <th className="py-3 px-4 text-right">Benchmark Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {metricOrder.map((key) => {
              const item = kpis[key];
              if (!item) return null;
              const config = METRIC_CONFIG[key];

              const isPositive = item.changePct > 0;
              const isFavourable = item.isFavourable;

              return (
                <tr key={key} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div>{config.label}</div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      {key === 'total_users' ? 'Sum of daily users' : config.description}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                    {config.format(item.adhyantraVal)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-semibold text-slate-600 text-sm">
                    {config.format(item.mrigankaVal)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        isFavourable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      <span>{formatGrowth(item.changePct)}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right text-slate-400 font-medium text-[11px]">
                    {item.direction === 'higher_better'
                      ? 'Higher is better'
                      : 'Lower is better'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
