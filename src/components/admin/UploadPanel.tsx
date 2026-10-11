'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Check, AlertCircle, Calendar, Sparkles, Layers } from 'lucide-react';
import { parseGA4File, ParsedGA4Data, DailyParsedRow } from '@/lib/parser';
import { MetricSource } from '@/types';
import { formatIndianNumber, formatDuration, formatPercent } from '@/lib/metrics';

interface UploadPanelProps {
  onSuccess: () => void;
}

export default function UploadPanel({ onSuccess }: UploadPanelProps) {
  const [source, setSource] = useState<MetricSource>('adhyantra');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [organicBounceRateInput, setOrganicBounceRateInput] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedGA4Data | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [multiDayMode, setMultiDayMode] = useState<'per_day' | 'aggregate'>('per_day');
  const [isMultiDayConfirmed, setIsMultiDayConfirmed] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // If multiple files selected, we can process the first or notify
    // If multiple files or multi-row export, handle parsing all files
    const fileList = Array.from(files);
    setFileName(
      fileList.length > 1
        ? `${fileList.length} files selected (${fileList.map((f) => f.name).slice(0, 2).join(', ')}${fileList.length > 2 ? '...' : ''})`
        : fileList[0].name
    );

    try {
      const allDailyRows: DailyParsedRow[] = [];
      let lastSingleResult: ParsedGA4Data | null = null;

      for (const file of fileList) {
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        let result;

        if (isCsv) {
          const text = await file.text();
          result = parseGA4File(text, file.name);
        } else {
          const buffer = await file.arrayBuffer();
          result = parseGA4File(buffer, file.name);
        }

        if (!result.success || !result.data) {
          setErrorMsg(`Error in ${file.name}: ${result.error || 'Failed to parse'}`);
          setParsedData(null);
          return;
        }

        const data = result.data;
        lastSingleResult = data;

        if (data.dailyRows && data.dailyRows.length > 0) {
          allDailyRows.push(...data.dailyRows);
        } else if (data.detectedDate) {
          allDailyRows.push({
            metric_date: data.detectedDate,
            total_users: data.total_users,
            sessions: data.sessions,
            bounce_rate: data.bounce_rate,
            avg_session_duration: data.avg_session_duration,
            new_users: data.new_users,
            organic_bounce_rate: data.organic_bounce_rate,
          });
        }
      }

      // Deduplicate rows by metric_date (later files overwrite earlier ones if duplicate)
      const dateMap = new Map<string, DailyParsedRow>();
      for (const row of allDailyRows) {
        dateMap.set(row.metric_date, row);
      }
      const uniqueDailyRows = Array.from(dateMap.values()).sort((a, b) =>
        a.metric_date.localeCompare(b.metric_date)
      );

      if (uniqueDailyRows.length > 1) {
        // Multi-date detected!
        const totalUsers = uniqueDailyRows.reduce((acc, r) => acc + r.total_users, 0);
        const totalSessions = uniqueDailyRows.reduce((acc, r) => acc + r.sessions, 0);
        const totalNewUsers = uniqueDailyRows.reduce((acc, r) => acc + r.new_users, 0);
        const avgBounce =
          uniqueDailyRows.reduce((acc, r) => acc + r.bounce_rate, 0) / uniqueDailyRows.length;
        const avgDur =
          uniqueDailyRows.reduce((acc, r) => acc + r.avg_session_duration, 0) /
          uniqueDailyRows.length;

        const multiData: ParsedGA4Data = {
          isMultiDay: true,
          startDate: uniqueDailyRows[0].metric_date,
          endDate: uniqueDailyRows[uniqueDailyRows.length - 1].metric_date,
          detectedDate: uniqueDailyRows[0].metric_date,
          total_users: totalUsers,
          sessions: totalSessions,
          bounce_rate: avgBounce,
          avg_session_duration: avgDur,
          new_users: totalNewUsers,
          dailyRows: uniqueDailyRows,
          headersFound: lastSingleResult?.headersFound || [],
          grandTotalRow: lastSingleResult?.grandTotalRow || [],
        };

        setParsedData(multiData);
        setSelectedDate(uniqueDailyRows[0].metric_date);
        setMultiDayMode('per_day');
      } else if (lastSingleResult) {
        setParsedData(lastSingleResult);
        if (lastSingleResult.detectedDate) {
          setSelectedDate(lastSingleResult.detectedDate);
        }
        setMultiDayMode('aggregate');

        if (lastSingleResult.organic_bounce_rate !== undefined) {
          setOrganicBounceRateInput(
            String((lastSingleResult.organic_bounce_rate * 100).toFixed(2))
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(`Error reading files: ${err.message}`);
      setParsedData(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!parsedData) {
      setErrorMsg('Please select and parse a GA4 export file first.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let orgBounce = 0.5;
    if (organicBounceRateInput.trim()) {
      const num = parseFloat(organicBounceRateInput);
      orgBounce = num > 1 ? num / 100 : num;
    } else if (parsedData.organic_bounce_rate !== undefined) {
      orgBounce = parsedData.organic_bounce_rate;
    }

    try {
      // Check if saving as individual daily records
      if (parsedData.dailyRows && parsedData.dailyRows.length > 0 && multiDayMode === 'per_day') {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            records: parsedData.dailyRows.map((r) => ({
              ...r,
              organic_bounce_rate:
                organicBounceRateInput.trim() !== ''
                  ? orgBounce
                  : r.organic_bounce_rate ?? orgBounce,
            })),
            filename: fileName,
          }),
        });

        const resData = await res.json();
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || 'Failed to save daily drafts');
        }

        setSuccessMsg(
          `Successfully saved ${parsedData.dailyRows.length} daily drafts for ${source.toUpperCase()} (${parsedData.startDate} to ${parsedData.endDate})!`
        );
      } else {
        // Save as single total / aggregate for selectedDate
        if (!selectedDate) {
          setErrorMsg('Please enter or confirm the metric date.');
          setLoading(false);
          return;
        }

        if (parsedData.isMultiDay && !isMultiDayConfirmed && !parsedData.dailyRows) {
          setErrorMsg(
            `This file spans ${parsedData.startDate} to ${parsedData.endDate}. Please check the confirmation below to save it as a single total for ${selectedDate}.`
          );
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            metric_date: selectedDate,
            total_users: parsedData.total_users,
            sessions: parsedData.sessions,
            bounce_rate: parsedData.bounce_rate,
            avg_session_duration: parsedData.avg_session_duration,
            new_users: parsedData.new_users,
            organic_bounce_rate: orgBounce,
            filename: fileName,
          }),
        });

        const resData = await res.json();
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || 'Failed to save draft');
        }

        setSuccessMsg(
          `Draft successfully saved for ${source.toUpperCase()} on ${selectedDate}!`
        );
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
      setParsedData(null);
      setFileName('');
      setOrganicBounceRateInput('');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving draft');
    } finally {
      setLoading(false);
    }
  };

  const hasMultipleDailyRecords =
    parsedData?.dailyRows && parsedData.dailyRows.length > 1;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Upload GA4 Daily or Multi-Date Export
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Accepts raw GA4 exports (.csv or .xlsx). Supports single date, date ranges, multi-day breakdowns, and multi-file batch upload.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Destination:</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as MetricSource)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="adhyantra">Adhyantra (Live Campaign)</option>
            <option value="mriganka">Mriganka (Baseline)</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Upload & Config Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date override / Default */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            {hasMultipleDailyRecords && multiDayMode === 'per_day'
              ? 'Multi-Day Date Range'
              : 'Metric Date'}
          </label>
          <div className="relative">
            {hasMultipleDailyRecords && multiDayMode === 'per_day' ? (
              <div className="px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {parsedData?.startDate} to {parsedData?.endDate} ({parsedData?.dailyRows?.length} days)
                </span>
              </div>
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {hasMultipleDailyRecords && multiDayMode === 'per_day'
              ? 'Each day will be saved under its own date.'
              : 'Auto-detected from file headers; override if needed.'}
          </span>
        </div>

        {/* Organic Bounce Rate */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Organic Bounce Rate (%)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={organicBounceRateInput}
            onChange={(e) => setOrganicBounceRateInput(e.target.value)}
            placeholder="e.g. 52.00 or 0.52"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Optional; entered manually or read from file column.
          </span>
        </div>

        {/* File Drag and Drop Zone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            GA4 Files (.csv, .xlsx)
          </label>
          <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all">
            <UploadCloud className="w-6 h-6 text-indigo-500 mb-1" />
            <span className="text-xs font-medium text-slate-700 truncate max-w-full text-center px-1">
              {fileName ? fileName : 'Choose or drop GA4 file(s)'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Select one or multiple files
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Multi-Day Mode Selection Toggle if multiple days detected */}
      {hasMultipleDailyRecords && parsedData?.dailyRows && (
        <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold text-indigo-950">
              Multiple Dates Detected ({parsedData.dailyRows.length} Days: {parsedData.startDate} to {parsedData.endDate})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                multiDayMode === 'per_day'
                  ? 'bg-white border-indigo-600 shadow-xs'
                  : 'bg-white/60 border-slate-200 hover:bg-white'
              }`}
            >
              <input
                type="radio"
                name="multiDayOption"
                checked={multiDayMode === 'per_day'}
                onChange={() => setMultiDayMode('per_day')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Save as {parsedData.dailyRows.length} Separate Daily Records (Recommended)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Creates an individual draft for each calendar day so you can analyze day-over-day trends.
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                multiDayMode === 'aggregate'
                  ? 'bg-white border-indigo-600 shadow-xs'
                  : 'bg-white/60 border-slate-200 hover:bg-white'
              }`}
            >
              <input
                type="radio"
                name="multiDayOption"
                checked={multiDayMode === 'aggregate'}
                onChange={() => setMultiDayMode('aggregate')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Combine into 1 Aggregated Total
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Sums users/sessions and calculates averages, saving a single draft row for {selectedDate || 'the selected date'}.
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Date Range without daily rows fallback confirmation */}
      {parsedData?.isMultiDay && !hasMultipleDailyRecords && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Multi-Day Range Detected in Header ({parsedData.startDate} to {parsedData.endDate})</span>
          </div>
          <p className="text-amber-800">
            This file represents an aggregated total over multiple days without a daily column breakdown. Please confirm saving as a single total row for {selectedDate}:
          </p>
          <label className="inline-flex items-center gap-2 font-semibold cursor-pointer text-amber-950 pt-1">
            <input
              type="checkbox"
              checked={isMultiDayConfirmed}
              onChange={(e) => setIsMultiDayConfirmed(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            Confirm saving aggregated total for {selectedDate}
          </label>
        </div>
      )}

      {/* Parsed Preview Card */}
      {parsedData && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              {multiDayMode === 'per_day' && hasMultipleDailyRecords
                ? `Daily Breakdown Preview (${parsedData.dailyRows?.length} Days)`
                : 'Parsed GA4 Metrics Preview'}
            </span>
            <span className="text-xs font-medium text-slate-500">
              Source: <strong className="text-slate-800">{source.toUpperCase()}</strong> | Date:{' '}
              <strong className="text-slate-800">
                {multiDayMode === 'per_day' && hasMultipleDailyRecords
                  ? `${parsedData.startDate} to ${parsedData.endDate}`
                  : selectedDate || 'Not set'}
              </strong>
            </span>
          </div>

          {/* If per_day mode: preview table of individual dates */}
          {multiDayMode === 'per_day' && hasMultipleDailyRecords && parsedData.dailyRows ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Total Users</th>
                    <th className="py-2 px-3">Sessions</th>
                    <th className="py-2 px-3">Bounce Rate</th>
                    <th className="py-2 px-3">Avg Duration</th>
                    <th className="py-2 px-3">New Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                  {parsedData.dailyRows.map((row) => (
                    <tr key={row.metric_date} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-semibold text-indigo-900 font-sans">
                        {row.metric_date}
                      </td>
                      <td className="py-2 px-3">{formatIndianNumber(row.total_users)}</td>
                      <td className="py-2 px-3">{formatIndianNumber(row.sessions)}</td>
                      <td className="py-2 px-3">{formatPercent(row.bounce_rate)}</td>
                      <td className="py-2 px-3">{formatDuration(row.avg_session_duration)}</td>
                      <td className="py-2 px-3">{formatIndianNumber(row.new_users)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Aggregate total summary cards */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-400 font-medium">Total Users</div>
                <div className="text-base font-bold text-slate-900">
                  {formatIndianNumber(parsedData.total_users)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-400 font-medium">Sessions</div>
                <div className="text-base font-bold text-slate-900">
                  {formatIndianNumber(parsedData.sessions)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-400 font-medium">Bounce Rate</div>
                <div className="text-base font-bold text-slate-900">
                  {formatPercent(parsedData.bounce_rate)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-400 font-medium">Avg Duration</div>
                <div className="text-base font-bold text-slate-900">
                  {formatDuration(parsedData.avg_session_duration)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-400 font-medium">New Users</div>
                <div className="text-base font-bold text-slate-900">
                  {formatIndianNumber(parsedData.new_users)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-400 font-medium">Organic Bounce</div>
                <div className="text-base font-bold text-slate-900">
                  {organicBounceRateInput
                    ? `${organicBounceRateInput}%`
                    : parsedData.organic_bounce_rate !== undefined
                    ? formatPercent(parsedData.organic_bounce_rate)
                    : '50.00%'}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveDraft}
              disabled={
                loading ||
                (multiDayMode === 'aggregate' && !selectedDate) ||
                (parsedData.isMultiDay && !hasMultipleDailyRecords && !isMultiDayConfirmed)
              }
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Draft{hasMultipleDailyRecords && multiDayMode === 'per_day' ? 's' : ''}...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {hasMultipleDailyRecords && multiDayMode === 'per_day'
                    ? `Save All ${parsedData.dailyRows?.length} Daily Drafts`
                    : 'Save as Draft'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
