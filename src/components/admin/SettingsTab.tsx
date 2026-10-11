'use client';

import React, { useState, useEffect } from 'react';
import { DashboardSettings, MetricDirection, MetricKey } from '@/types';
import { METRIC_CONFIG, DEFAULT_SETTINGS } from '@/lib/metrics';
import { Settings, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface SettingsTabProps {
  initialSettings: DashboardSettings;
  onSaved: () => void;
}

export default function SettingsTab({ initialSettings, onSaved }: SettingsTabProps) {
  const [threshold, setThreshold] = useState<number>(
    initialSettings.underperform_threshold_pct ?? 2
  );
  const [directions, setDirections] = useState<Record<MetricKey, MetricDirection>>(
    initialSettings.metric_directions ?? DEFAULT_SETTINGS.metric_directions
  );
  const [baselineMode, setBaselineMode] = useState<'yoy' | 'same_date'>(
    initialSettings.baseline_mode ?? 'yoy'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setThreshold(initialSettings.underperform_threshold_pct);
      setDirections(initialSettings.metric_directions);
      setBaselineMode(initialSettings.baseline_mode);
    }
  }, [initialSettings]);

  const handleDirectionChange = (key: MetricKey, dir: MetricDirection) => {
    setDirections((prev) => ({
      ...prev,
      [key]: dir,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          underperform_threshold_pct: threshold,
          metric_directions: directions,
          baseline_mode: baselineMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setSuccessMsg('Settings updated successfully!');
      onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const metricKeys: MetricKey[] = [
    'total_users',
    'sessions',
    'bounce_rate',
    'avg_session_duration',
    'new_users',
    'organic_bounce_rate',
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Performance Thresholds & Direction Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure rules governing non-performing metric flags (red highlights) and baseline alignment.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Threshold Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <label className="block text-sm font-bold text-slate-900">
            Underperformance Threshold Percentage (%)
          </label>
          <p className="text-xs text-slate-500">
            Metrics where Adhyantra underperforms Mriganka by this percentage or worse are flagged red.
            Default is 2%.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
              className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <span className="text-sm font-semibold text-slate-600">% relative drop</span>
          </div>
        </div>

        {/* Baseline Alignment Mode */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <label className="block text-sm font-bold text-slate-900">
            Baseline Date Matching Mode
          </label>
          <p className="text-xs text-slate-500">
            Controls how daily live metrics (Adhyantra) are paired against historical baseline data (Mriganka).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                baselineMode === 'yoy'
                  ? 'bg-indigo-50/60 border-indigo-300 text-indigo-950 ring-1 ring-indigo-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="baselineMode"
                value="yoy"
                checked={baselineMode === 'yoy'}
                onChange={() => setBaselineMode('yoy')}
                className="mt-0.5 text-indigo-600"
              />
              <div>
                <div className="font-bold text-xs">Year-over-Year (YoY)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Pairs live campaign dates with the identical calendar day 1 year earlier (e.g. 2026-10-10 vs 2025-10-10).
                </div>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                baselineMode === 'same_date'
                  ? 'bg-indigo-50/60 border-indigo-300 text-indigo-950 ring-1 ring-indigo-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="baselineMode"
                value="same_date"
                checked={baselineMode === 'same_date'}
                onChange={() => setBaselineMode('same_date')}
                className="mt-0.5 text-indigo-600"
              />
              <div>
                <div className="font-bold text-xs">Same Calendar Date</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Pairs records sharing the exact same date string (e.g. 2026-10-10 vs 2026-10-10).
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Per-Metric Direction Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-900">
              Per-Metric Direction Definitions
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify whether a higher or lower numerical value signifies positive campaign performance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metricKeys.map((key) => {
              const cfg = METRIC_CONFIG[key];
              const currentDir = directions[key] || 'higher_better';

              return (
                <div
                  key={key}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{cfg.label}</div>
                    <div className="text-[10px] text-slate-400">{cfg.description}</div>
                  </div>

                  <select
                    value={currentDir}
                    onChange={(e) =>
                      handleDirectionChange(key, e.target.value as MetricDirection)
                    }
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="higher_better">Higher is Better</option>
                    <option value="lower_better">Lower is Better</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
