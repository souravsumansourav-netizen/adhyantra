'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { MetricKey } from '@/types';
import { METRIC_CONFIG } from '@/lib/metrics';
import { LineChart as ChartIcon } from 'lucide-react';

interface DailyTrendPoint {
  date: string;
  baselineDate: string;
  hasAdhyantra: boolean;
  hasMriganka: boolean;
  adhyantra: Record<MetricKey, number> | null;
  mriganka: Record<MetricKey, number> | null;
}

interface TrendChartProps {
  trendData: DailyTrendPoint[];
}

export default function TrendChart({ trendData }: TrendChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('total_users');

  const metricKeys: MetricKey[] = [
    'total_users',
    'sessions',
    'bounce_rate',
    'avg_session_duration',
    'new_users',
    'organic_bounce_rate',
  ];

  const currentConfig = METRIC_CONFIG[selectedMetric];

  // Prepare chart dataset
  const chartData = trendData.map((d) => {
    const adhyVal = d.adhyantra ? d.adhyantra[selectedMetric] : null;
    const mrigVal = d.mriganka ? d.mriganka[selectedMetric] : null;

    return {
      date: d.date,
      displayDate: d.date.slice(5), // MM-DD
      adhyantra: adhyVal,
      mriganka: mrigVal,
      baselineDate: d.baselineDate,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xl text-xs space-y-2">
          <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between gap-4">
            <span>Date: {dataPoint.date}</span>
            <span className="text-[10px] text-slate-400">Baseline: {dataPoint.baselineDate}</span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 font-semibold text-indigo-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                Adhyantra:
              </span>
              <span className="font-bold text-slate-900">
                {dataPoint.adhyantra !== null
                  ? currentConfig.format(dataPoint.adhyantra)
                  : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Mriganka:
              </span>
              <span className="font-bold text-slate-900">
                {dataPoint.mriganka !== null
                  ? currentConfig.format(dataPoint.mriganka)
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Chart Header & Metric Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-indigo-600" />
            Daily Comparative Trend
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adhyantra vs Mriganka baseline performance tracking across selected dates
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
          {metricKeys.map((key) => {
            const isSelected = selectedMetric === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {METRIC_CONFIG[key].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts Container */}
      <div className="h-80 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No published trend data available for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  if (currentConfig.unit === '%') return `${(val * 100).toFixed(0)}%`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return val;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />
              <Line
                name="Adhyantra (Live)"
                type="monotone"
                dataKey="adhyantra"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#4f46e5' }}
              />
              <Line
                name="Mriganka (Baseline)"
                type="monotone"
                dataKey="mriganka"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#d97706', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#d97706' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
