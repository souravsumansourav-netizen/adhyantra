'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/dashboard/Header';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import MissingNotice from '@/components/dashboard/MissingNotice';
import KpiCards from '@/components/dashboard/KpiCards';
import TrendChart from '@/components/dashboard/TrendChart';
import ComparisonTable from '@/components/dashboard/ComparisonTable';
import { MetricKey } from '@/types';

export default function PublicDashboardPage() {
  const [startDate, setStartDate] = useState('2026-10-10');
  const [endDate, setEndDate] = useState('2026-10-10');
  const [baselineRange, setBaselineRange] = useState<{ start: string; end: string }>({
    start: '2025-09-21',
    end: '2025-09-21',
  });
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any | null>(null);
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [missingDays, setMissingDays] = useState<{ date: string; reason: string }[]>([]);
  const [totalPublishedDays, setTotalPublishedDays] = useState(0);

  const fetchPublicData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/public-metrics?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      if (data.success) {
        setKpis(data.kpis);
        setDailyTrend(data.dailyTrend || []);
        setMissingDays(data.missingDays || []);
        setTotalPublishedDays(data.totalPublishedDays || 0);
        if (data.baselineStartDate && data.baselineEndDate) {
          setBaselineRange({
            start: data.baselineStartDate,
            end: data.baselineEndDate,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load public metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  const handleRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-7">
        {/* Date Filter Bar */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          baselineStartDate={baselineRange.start}
          baselineEndDate={baselineRange.end}
          onChangeRange={handleRangeChange}
        />

        {/* Show notice only if some days have data but other days are missing */}
        {totalPublishedDays > 0 && <MissingNotice missingDays={missingDays} />}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-500">
              Loading...
            </span>
          </div>
        ) : totalPublishedDays === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">No data</p>
          </div>
        ) : (
          <>
            {/* 6 KPI Cards */}
            {kpis && <KpiCards kpis={kpis} />}

            {/* Daily Trend Line Chart */}
            <TrendChart trendData={dailyTrend} />

            {/* Performance Breakdown Table */}
            {kpis && (
              <ComparisonTable
                kpis={kpis}
                startDate={startDate}
                endDate={endDate}
                baselineStartDate={baselineRange.start}
                baselineEndDate={baselineRange.end}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            &copy; 2026 Adhyantra Performance Analytics. Baseline benchmark: Mriganka.
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Live Reporting View
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
