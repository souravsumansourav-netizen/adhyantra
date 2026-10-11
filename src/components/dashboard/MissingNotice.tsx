import React from 'react';
import { Info } from 'lucide-react';

interface MissingNoticeProps {
  missingDays: { date: string; reason: string }[];
}

export default function MissingNotice({ missingDays }: MissingNoticeProps) {
  if (!missingDays || missingDays.length === 0) return null;

  return (
    <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 shadow-sm flex items-start gap-3">
      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="font-bold text-amber-950">
          Unpublished or Missing Data Notice
        </div>
        <p className="text-amber-800 leading-relaxed">
          Some dates within the selected range are currently unpublished or awaiting baseline upload. The aggregate metrics below reflect only approved and published days.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {missingDays.slice(0, 5).map((m, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-amber-100/90 border border-amber-200 rounded text-[10px] font-mono font-medium text-amber-900"
            >
              {m.date}: {m.reason}
            </span>
          ))}
          {missingDays.length > 5 && (
            <span className="text-[10px] text-amber-700 self-center">
              +{missingDays.length - 5} more dates
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
