'use client';

import React, { useState } from 'react';
import {
  DateComparisonRow,
  MetricComparisonItem,
  MetricKey,
} from '@/types';
import { METRIC_CONFIG, formatGrowth } from '@/lib/metrics';
import {
  AlertTriangle,
  CheckCircle,
  Globe,
  Lock,
  RotateCcw,
  Sliders,
  Trash2,
  Pencil,
} from 'lucide-react';
import RowEditModal from './RowEditModal';

interface ReviewTableProps {
  rows: DateComparisonRow[];
  onOpenFixDrawer: (
    date: string,
    source: 'adhyantra' | 'mriganka',
    metricItem: MetricComparisonItem
  ) => void;
  onRefresh: () => void;
}

export default function ReviewTable({
  rows,
  onOpenFixDrawer,
  onRefresh,
}: ReviewTableProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<DateComparisonRow | null>(null);

  const handleBaselineChange = async (adhyantraDate: string, newBaselineDate: string) => {
    setErrorNotice(null);
    setSuccessNotice(null);
    try {
      const res = await fetch('/api/admin/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_date: adhyantraDate,
          source: 'adhyantra',
          action: 'set_baseline',
          note: newBaselineDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update comparison baseline');
      }
      setSuccessNotice(`Comparison benchmark for ${adhyantraDate} paired with Mriganka (${newBaselineDate})`);
      onRefresh();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error updating baseline pairing');
    }
  };

  const filteredRows = rows.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDates(filteredRows.map((r) => r.date));
    } else {
      setSelectedDates([]);
    }
  };

  const handleToggleSelect = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const handlePublish = async (datesToPublish: string[]) => {
    setErrorNotice(null);
    setSuccessNotice(null);
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: datesToPublish, action: 'publish' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish dates');
      }

      setSuccessNotice(`Published ${datesToPublish.length} date(s) successfully!`);
      setSelectedDates([]);
      onRefresh();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error publishing date(s)');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async (datesToUnpublish: string[]) => {
    setErrorNotice(null);
    setSuccessNotice(null);
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: datesToUnpublish, action: 'unpublish' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to unpublish dates');
      }

      setSuccessNotice(`Unpublished ${datesToUnpublish.length} date(s).`);
      setSelectedDates([]);
      onRefresh();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error unpublishing date(s)');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (datesToDelete: string[]) => {
    if (datesToDelete.length === 0) return;

    const confirmed = window.confirm(
      datesToDelete.length === 1
        ? `Are you sure you want to permanently delete all data for ${datesToDelete[0]}?`
        : `Are you sure you want to permanently delete data for ${datesToDelete.length} selected date(s)?`
    );

    if (!confirmed) return;

    setErrorNotice(null);
    setSuccessNotice(null);
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: datesToDelete, source: 'both' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete data');
      }

      setSuccessNotice(`Deleted data for ${datesToDelete.length} date(s) successfully.`);
      setSelectedDates((prev) => prev.filter((d) => !datesToDelete.includes(d)));
      onRefresh();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error deleting date(s)');
    } finally {
      setActionLoading(false);
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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Table Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            Daily Metrics Review & Publish Control
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adhyantra metrics underperforming Mriganka are highlighted in red for resolution before publishing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              All ({rows.length})
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'draft'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Drafts ({rows.filter((r) => r.status === 'draft').length})
            </button>
            <button
              onClick={() => setFilterStatus('published')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'published'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Published ({rows.filter((r) => r.status === 'published').length})
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedDates.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <button
                onClick={() => handlePublish(selectedDates)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                Bulk Publish ({selectedDates.length})
              </button>
              <button
                onClick={() => handleUnpublish(selectedDates)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                Bulk Unpublish ({selectedDates.length})
              </button>
              <button
                onClick={() => handleDelete(selectedDates)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedDates.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {errorNotice && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-rose-500 hover:text-rose-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-500 hover:text-emerald-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="relative overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1400px]">
          <colgroup>
            <col className="w-10" />
            <col className="w-40" />
            <col className="w-48" />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-36" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 z-20 py-3 px-3 shadow-[1px_0_0_0_#e2e8f0]">
                <input
                  type="checkbox"
                  checked={
                    filteredRows.length > 0 &&
                    selectedDates.length === filteredRows.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="sticky left-10 bg-slate-50 z-20 py-3 px-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                Date &amp; Status
              </th>
              <th className="py-3 px-3">Sanity Alerts</th>
              {metricKeys.map((key) => (
                <th key={key} className="py-3 px-3">
                  {METRIC_CONFIG[key].label}
                </th>
              ))}
              <th className="sticky right-0 bg-slate-50 z-20 py-3 px-4 text-right shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <div className="text-sm font-semibold text-slate-400">No data available</div>
                  <div className="text-[11px] text-slate-400 mt-1">Upload GA4 files above or reset filters</div>
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.date} className="group hover:bg-slate-50/70 transition-colors">
                  {/* Select - Sticky */}
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50/70 z-10 py-3 px-3 align-top shadow-[1px_0_0_0_#e2e8f0]">
                    <input
                      type="checkbox"
                      checked={selectedDates.includes(row.date)}
                      onChange={() => handleToggleSelect(row.date)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Date & Status - Sticky */}
                  <td className="sticky left-10 bg-white group-hover:bg-slate-50/70 z-10 py-3 px-4 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                    <div className="font-bold text-slate-900 text-sm">{row.date}</div>
                    <div className="mt-1">
                      {row.status === 'published' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Globe className="w-2.5 h-2.5" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Lock className="w-2.5 h-2.5" />
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Dynamic Baseline Comparison Date Selector */}
                    {row.hasAdhyantra && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                          Compare vs Mriganka:
                        </label>
                        <select
                          value={row.baselineDate}
                          onChange={(e) => handleBaselineChange(row.date, e.target.value)}
                          className="mt-1 w-full max-w-[130px] px-1.5 py-1 text-[11px] font-bold text-purple-900 bg-purple-50/80 hover:bg-purple-100 border border-purple-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer transition-colors"
                          title="Select any Mriganka baseline date to compare against this Adhyantra campaign"
                        >
                          {(row.availableMrigankaDates || []).map((mDate) => (
                            <option key={mDate} value={mDate}>
                              {mDate}
                            </option>
                          ))}
                          {!(row.availableMrigankaDates || []).includes(row.baselineDate) && row.baselineDate && (
                            <option value={row.baselineDate}>{row.baselineDate}</option>
                          )}
                        </select>
                      </div>
                    )}
                  </td>

                  {/* Sanity Alerts */}
                  <td className="py-3 px-3 align-top">
                    {row.sanityIssues.length === 0 ? (
                      <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Valid
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {row.sanityIssues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-start gap-1 p-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px] leading-tight font-medium"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <span>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* 6 Metrics Cells: ALL fields are editable; ONLY Adhyantra is highlighted red when underperforming */}
                  {metricKeys.map((key) => {
                    const item = row.metrics[key];
                    const cfg = METRIC_CONFIG[key];

                    const isRed = item.isNonPerforming;
                    const isUnresolved = isRed && !item.isAdjusted && !item.isApproved;

                    return (
                      <td key={key} className="py-3 px-3 align-top">
                        <div className="space-y-1.5">
                          {/* ADHYANTRA (LIVE) VALUE - Highlighted specifically if underperforming; click to edit */}
                          {isUnresolved ? (
                            <div
                              onClick={() => onOpenFixDrawer(row.date, 'adhyantra', item)}
                              className="p-2 rounded-lg bg-rose-50 border border-rose-300 hover:bg-rose-100/90 cursor-pointer transition-colors shadow-sm group/card"
                              title="Adhyantra is underperforming Mriganka. Click to adjust or approve."
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">
                                  Adhyantra
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-200 text-rose-800 group-hover/card:bg-rose-300">
                                  Fix
                                </span>
                              </div>
                              <div className="text-xs font-black text-rose-700 mt-0.5">
                                {cfg.format(item.adhyantraVal)}
                              </div>
                            </div>
                          ) : item.isAdjusted ? (
                            <div
                              onClick={() => onOpenFixDrawer(row.date, 'adhyantra', item)}
                              className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/60 cursor-pointer transition-colors"
                              title="Metric adjusted. Click to modify."
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">
                                  Adhyantra
                                </span>
                                <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                                  Adjusted
                                </span>
                              </div>
                              <div className="text-xs font-bold text-indigo-900 mt-0.5">
                                {cfg.format(item.adhyantraVal)}
                              </div>
                            </div>
                          ) : item.isApproved ? (
                            <div
                              onClick={() => onOpenFixDrawer(row.date, 'adhyantra', item)}
                              className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/60 cursor-pointer transition-colors"
                              title="Approved as-is. Click to view."
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                  Adhyantra
                                </span>
                                <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700">
                                  Approved
                                </span>
                              </div>
                              <div className="text-xs font-bold text-emerald-900 mt-0.5">
                                {cfg.format(item.adhyantraVal)}
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => onOpenFixDrawer(row.date, 'adhyantra', item)}
                              className="p-2 rounded-lg bg-slate-50/70 border border-slate-200/60 hover:bg-indigo-50/50 hover:border-indigo-200 cursor-pointer transition-colors group/card"
                              title="Click to edit Adhyantra metric"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight block group-hover/card:text-indigo-600">
                                  Adhyantra
                                </span>
                                <Pencil className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/card:opacity-100 group-hover/card:text-indigo-600 transition-opacity" />
                              </div>
                              <div className="text-xs font-bold text-slate-900 mt-0.5 group-hover/card:text-indigo-950">
                                {cfg.format(item.adhyantraVal)}
                              </div>
                            </div>
                          )}

                          {/* MRIGANKA (BASELINE) VALUE - Clickable & Editable */}
                          <div
                            onClick={() => onOpenFixDrawer(row.baselineDate, 'mriganka', item)}
                            className="px-1.5 py-1 rounded-md hover:bg-purple-50/80 cursor-pointer flex items-center justify-between text-[11px] transition-colors group/mrig"
                            title="Click to edit Mriganka baseline metric"
                          >
                            <span className="text-[10px] text-slate-400 font-medium">Mriganka:</span>
                            <span className="font-semibold text-slate-700 flex items-center gap-1 group-hover/mrig:text-purple-700">
                              {cfg.format(item.mrigankaVal)}
                              <Pencil className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/mrig:opacity-100 group-hover/mrig:text-purple-600 transition-opacity" />
                            </span>
                          </div>

                          {/* RELATIVE CHANGE % */}
                          <div className="px-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400 font-medium">Change:</span>
                            <span
                              className={`font-bold ${
                                isRed
                                  ? 'text-rose-600'
                                  : item.isFavourable
                                  ? 'text-emerald-600'
                                  : 'text-slate-600'
                              }`}
                            >
                              {formatGrowth(item.changePct)}
                            </span>
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  {/* Actions Column - Sticky Right */}
                  <td className="sticky right-0 bg-white group-hover:bg-slate-50/70 z-10 py-3 px-4 align-top text-right shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* Edit All Fields Button */}
                        <button
                          onClick={() => setEditingRow(row)}
                          disabled={actionLoading}
                          title="Edit all fields for this date"
                          className="px-2.5 py-1 text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>

                        {row.status === 'published' ? (
                          <>
                            <button
                              onClick={() => handleUnpublish([row.date])}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Unpublish
                            </button>
                            <button
                              onClick={() => handleDelete([row.date])}
                              disabled={actionLoading}
                              title="Delete this date's data"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handlePublish([row.date])}
                              disabled={actionLoading || !row.canPublish}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                                row.canPublish
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <Globe className="w-3 h-3" />
                              Publish
                            </button>
                            <button
                              onClick={() => handleDelete([row.date])}
                              disabled={actionLoading}
                              title="Delete this date's data"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      {!row.canPublish && row.status === 'draft' && (
                        <span className="text-[10px] text-rose-500 font-medium text-right max-w-[120px] leading-tight">
                          {row.unresolvedRedCount} red metric(s) unresolved
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row Edit Modal for editing all fields together */}
      <RowEditModal
        isOpen={!!editingRow}
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onSuccess={() => {
          setSuccessNotice('All fields updated successfully!');
          onRefresh();
        }}
      />
    </div>
  );
}
