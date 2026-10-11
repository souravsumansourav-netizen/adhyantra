'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChangeRange: (start: string, end: string) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChangeRange,
}: DateRangePickerProps) {
  // Anchor on campaign reference date 2026-10-10
  const getPresetDates = (preset: 'yesterday' | '7days' | '30days') => {
    const anchor = new Date('2026-10-10T00:00:00Z');

    if (preset === 'yesterday') {
      const dStr = anchor.toISOString().split('T')[0];
      return { start: dStr, end: dStr };
    } else if (preset === '7days') {
      const start = new Date(anchor);
      start.setDate(anchor.getDate() - 6);
      return {
        start: start.toISOString().split('T')[0],
        end: anchor.toISOString().split('T')[0],
      };
    } else {
      // 30 days
      const start = new Date(anchor);
      start.setDate(anchor.getDate() - 29);
      return {
        start: start.toISOString().split('T')[0],
        end: anchor.toISOString().split('T')[0],
      };
    }
  };

  const isPresetActive = (preset: 'yesterday' | '7days' | '30days') => {
    const dates = getPresetDates(preset);
    return startDate === dates.start && endDate === dates.end;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Comparison Range:
        </span>
        <span className="text-sm font-extrabold text-slate-900">
          {startDate} &mdash; {endDate}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Presets */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            onClick={() => {
              const { start, end } = getPresetDates('yesterday');
              onChangeRange(start, end);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              isPresetActive('yesterday')
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              const { start, end } = getPresetDates('7days');
              onChangeRange(start, end);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              isPresetActive('7days')
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            Last 7 days
          </button>
          <button
            onClick={() => {
              const { start, end } = getPresetDates('30days');
              onChangeRange(start, end);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              isPresetActive('30days')
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            Last 30 days
          </button>
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
