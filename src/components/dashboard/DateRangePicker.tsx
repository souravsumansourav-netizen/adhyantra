'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  baselineStartDate?: string;
  baselineEndDate?: string;
  onChangeRange: (start: string, end: string) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  baselineStartDate,
  baselineEndDate,
  onChangeRange,
}: DateRangePickerProps) {
  const presets: { id: string; label: string; start: string; end: string }[] = [
    { id: 'oct10', label: '10th Oct', start: '2026-10-10', end: '2026-10-10' },
    { id: 'oct11', label: '11th Oct', start: '2026-10-11', end: '2026-10-11' },
    { id: 'range', label: '10th – 11th Oct', start: '2026-10-10', end: '2026-10-11' },
  ];

  const activePreset = presets.find((p) => p.start === startDate && p.end === endDate)?.id;

  const baselineText = baselineStartDate && baselineEndDate
    ? baselineStartDate === baselineEndDate
      ? baselineStartDate
      : `${baselineStartDate} — ${baselineEndDate}`
    : '';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2.5 text-slate-700">
        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Adhyantra:
          </span>
          <span className="text-sm font-extrabold text-slate-900">
            {startDate === endDate ? startDate : `${startDate} — ${endDate}`}
          </span>
          {baselineText && (
            <>
              <span className="text-slate-300 hidden sm:inline">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">vs Mriganka:</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {baselineText}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Presets */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onChangeRange(preset.start, preset.end)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activePreset === preset.id
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom date selectors */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs">
          <span className="text-slate-400 font-medium">Custom:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChangeRange(e.target.value, endDate)}
            className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChangeRange(startDate, e.target.value)}
            className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
