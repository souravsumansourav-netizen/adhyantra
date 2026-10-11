'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { MetricComparisonItem, MetricKey } from '@/types';
import { METRIC_CONFIG, formatDuration, formatPercent, formatIndianNumber } from '@/lib/metrics';

interface FixDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  source: 'adhyantra' | 'mriganka';
  metricItem: MetricComparisonItem | null;
  onSuccess: () => void;
}

export default function FixDrawer({
  isOpen,
  onClose,
  date,
  source,
  metricItem,
  onSuccess,
}: FixDrawerProps) {
  const [adjustedVal, setAdjustedVal] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [approveReason, setApproveReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (metricItem) {
      const initialVal =
        source === 'mriganka' ? metricItem.mrigankaVal : metricItem.adhyantraVal;
      setAdjustedVal(String(initialVal));
      setAdjustReason('');
      setApproveReason('');
      setErrorMsg(null);
    }
  }, [metricItem, source]);

  if (!isOpen || !metricItem) return null;

  const config = METRIC_CONFIG[metricItem.key];
  const isEditingMriganka = source === 'mriganka';

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      setErrorMsg('A mandatory reason is required for any adjustment.');
      return;
    }

    const num = parseFloat(adjustedVal);
    if (isNaN(num)) {
      setErrorMsg('Please enter a valid numeric value.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_date: date,
          source,
          field: metricItem.key,
          action: 'edit',
          adjusted_value: num,
          note: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save adjustment');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving adjustment');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveReason.trim()) {
      setErrorMsg('A note is mandatory when approving as-is.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_date: date,
          source,
          field: metricItem.key,
          action: 'approve',
          note: approveReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve metric');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error approving metric');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop overlay - click to close */}
      <div
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer content */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 z-10">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  isEditingMriganka
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : metricItem.isNonPerforming
                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}
              >
                {isEditingMriganka
                  ? 'Edit Mriganka Baseline'
                  : metricItem.isNonPerforming
                  ? 'Fix Adhyantra Metric'
                  : 'Edit Adhyantra Metric'}
              </span>
              <span className="text-xs font-medium text-slate-500">{date}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{config.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Metric Overview Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Diagnostic Summary
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  !isEditingMriganka
                    ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-xs text-slate-500 font-medium">Adhyantra (Live)</div>
                <div className="text-base font-bold text-slate-900">
                  {config.format(metricItem.adhyantraVal)}
                </div>
                {!isEditingMriganka && (
                  <span className="text-[10px] font-bold text-indigo-600 block mt-0.5">Editing This</span>
                )}
              </div>
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  isEditingMriganka
                    ? 'bg-purple-50/50 border-purple-400 ring-2 ring-purple-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-xs text-slate-500 font-medium">Mriganka (Baseline)</div>
                <div className="text-base font-bold text-slate-900">
                  {config.format(metricItem.mrigankaVal)}
                </div>
                {isEditingMriganka && (
                  <span className="text-[10px] font-bold text-purple-600 block mt-0.5">Editing This</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-600">Relative Change:</span>
              <span className={`font-bold ${metricItem.isNonPerforming ? 'text-rose-600' : 'text-slate-700'}`}>
                {metricItem.changePct.toFixed(2)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Permanent Raw Value:</span>
              <span className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700">
                {config.format(isEditingMriganka ? metricItem.rawMrigankaVal : metricItem.rawAdhyantraVal)}
              </span>
            </div>
          </div>

          {/* Option 1: Adjust Value */}
          <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              <span>Adjust Metric Value ({isEditingMriganka ? 'Mriganka' : 'Adhyantra'})</span>
            </div>
            <p className="text-xs text-slate-500">
              Update the value for {isEditingMriganka ? 'Mriganka baseline' : 'Adhyantra campaign'}. The original raw uploaded value remains permanently archived.
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Value ({config.unit ? config.unit : 'Number'})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustedVal}
                  onChange={(e) => setAdjustedVal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. 52000"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason / Adjustment Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Verified data correction or revised baseline benchmark."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Save Adjustment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Option 2: Approve As-Is (Specific to Adhyantra variance) */}
          {!isEditingMriganka && metricItem.isNonPerforming && (
            <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Option 2: Approve As-Is</span>
              </div>
              <p className="text-xs text-slate-500">
                Acknowledge the variance and permit publication without modifying the metric value.
              </p>

              <form onSubmit={handleApproveSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mandatory Approval Note <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={approveReason}
                    onChange={(e) => setApproveReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Variance expected due to planned server migration downtime."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve As-Is</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
