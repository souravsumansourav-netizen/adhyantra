'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Save, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { DateComparisonRow, MetricKey } from '@/types';
import { METRIC_CONFIG } from '@/lib/metrics';

interface RowEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: DateComparisonRow | null;
  onSuccess: () => void;
}

export default function RowEditModal({
  isOpen,
  onClose,
  row,
  onSuccess,
}: RowEditModalProps) {
  const [selectedBaselineDate, setSelectedBaselineDate] = useState<string>('');
  const [note, setNote] = useState<string>('Row updated via admin panel');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Adhyantra form state
  const [adhyantraForm, setAdhyantraForm] = useState<Record<MetricKey, string>>({
    total_users: '',
    sessions: '',
    bounce_rate: '',
    avg_session_duration: '',
    new_users: '',
    organic_bounce_rate: '',
  });

  // Mriganka form state
  const [mrigankaForm, setMrigankaForm] = useState<Record<MetricKey, string>>({
    total_users: '',
    sessions: '',
    bounce_rate: '',
    avg_session_duration: '',
    new_users: '',
    organic_bounce_rate: '',
  });

  useEffect(() => {
    if (row) {
      setSelectedBaselineDate(row.baselineDate);
      setErrorMsg(null);
      setNote('Row updated via admin panel');

      const adhy: Record<MetricKey, string> = {} as any;
      const mrig: Record<MetricKey, string> = {} as any;

      const keys: MetricKey[] = [
        'total_users',
        'sessions',
        'bounce_rate',
        'avg_session_duration',
        'new_users',
        'organic_bounce_rate',
      ];

      keys.forEach((k) => {
        const item = row.metrics[k];
        const aVal = item ? item.adhyantraVal : 0;
        const mVal = item ? item.mrigankaVal : 0;

        const cleanA = k.includes('rate')
          ? String(Number(aVal.toFixed(4)))
          : k === 'avg_session_duration'
          ? String(Number(aVal.toFixed(2)))
          : String(Math.round(aVal));

        const cleanM = k.includes('rate')
          ? String(Number(mVal.toFixed(4)))
          : k === 'avg_session_duration'
          ? String(Number(mVal.toFixed(2)))
          : String(Math.round(mVal));

        adhy[k] = cleanA;
        mrig[k] = cleanM;
      });

      setAdhyantraForm(adhy);
      setMrigankaForm(mrig);
    }
  }, [row]);

  if (!isOpen || !row) return null;

  const metricKeys: MetricKey[] = [
    'total_users',
    'sessions',
    'bounce_rate',
    'avg_session_duration',
    'new_users',
    'organic_bounce_rate',
  ];

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. If baseline date changed, save pairing
      if (selectedBaselineDate !== row.baselineDate) {
        const pairRes = await fetch('/api/admin/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric_date: row.date,
            source: 'adhyantra',
            action: 'set_baseline',
            note: selectedBaselineDate,
          }),
        });
        const pairData = await pairRes.json();
        if (!pairRes.ok || !pairData.success) {
          throw new Error(pairData.error || 'Failed to update baseline pairing');
        }
      }

      // 2. Save Adhyantra metrics
      if (row.hasAdhyantra) {
        const adhyNumbers: Record<string, number> = {};
        metricKeys.forEach((k) => {
          adhyNumbers[k] = parseFloat(adhyantraForm[k]) || 0;
        });

        const adhyRes = await fetch('/api/admin/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric_date: row.date,
            source: 'adhyantra',
            action: 'bulk_edit',
            metrics: adhyNumbers,
            note: note.trim() || 'Adhyantra metrics edited',
          }),
        });
        const adhyData = await adhyRes.json();
        if (!adhyRes.ok || !adhyData.success) {
          throw new Error(adhyData.error || 'Failed to update Adhyantra metrics');
        }
      }

      // 3. Save Mriganka metrics if Mriganka record exists
      if (row.hasMriganka && row.baselineDate) {
        const mrigNumbers: Record<string, number> = {};
        metricKeys.forEach((k) => {
          mrigNumbers[k] = parseFloat(mrigankaForm[k]) || 0;
        });

        const mrigRes = await fetch('/api/admin/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric_date: row.baselineDate,
            source: 'mriganka',
            action: 'bulk_edit',
            metrics: mrigNumbers,
            note: note.trim() || 'Mriganka metrics edited',
          }),
        });
        const mrigData = await mrigRes.json();
        if (!mrigRes.ok || !mrigData.success) {
          throw new Error(mrigData.error || 'Failed to update Mriganka metrics');
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const availableDates = row.availableMrigankaDates || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                Edit All Fields
              </span>
              <span className="text-xs text-slate-500 font-medium">Adhyantra Campaign Date: <strong>{row.date}</strong></span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Edit Adhyantra &amp; Mriganka Metrics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAll} className="p-6 space-y-6">
          {/* Baseline Pairing Selector */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                  Compared With Mriganka Date
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Any Adhyantra campaign date can be paired with any Mriganka baseline date.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <select
                  value={selectedBaselineDate}
                  onChange={(e) => setSelectedBaselineDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {availableDates.map((mDate) => (
                    <option key={mDate} value={mDate}>
                      {mDate}
                    </option>
                  ))}
                  {!availableDates.includes(selectedBaselineDate) && selectedBaselineDate && (
                    <option value={selectedBaselineDate}>{selectedBaselineDate}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Side-by-Side Metrics Grid */}
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 pb-1 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-4">Metric</div>
              <div className="col-span-4 text-indigo-700">Adhyantra (Live)</div>
              <div className="col-span-4 text-purple-700">Mriganka (Baseline: {selectedBaselineDate})</div>
            </div>

            {metricKeys.map((key) => {
              const cfg = METRIC_CONFIG[key];
              return (
                <div key={key} className="grid grid-cols-12 gap-3 items-center py-1.5 border-b border-slate-100">
                  <div className="col-span-4">
                    <span className="text-xs font-semibold text-slate-800 block">{cfg.label}</span>
                    <span className="text-[10px] text-slate-400">
                      {key.includes('rate') ? '0 to 1 (e.g. 0.64 = 64%)' : key === 'avg_session_duration' ? 'Seconds' : 'Count'}
                    </span>
                  </div>

                  <div className="col-span-4">
                    <input
                      type="number"
                      step="any"
                      required
                      value={adhyantraForm[key]}
                      onChange={(e) =>
                        setAdhyantraForm((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-600 rounded-lg text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>

                  <div className="col-span-4">
                    <input
                      type="number"
                      step="any"
                      required
                      value={mrigankaForm[key]}
                      onChange={(e) =>
                        setMrigankaForm((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-purple-600 rounded-lg text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Audit Note / Reason
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Reconciled metrics after data review"
              className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-600 rounded-xl text-xs text-slate-800 outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All Field Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
