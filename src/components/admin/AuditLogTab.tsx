'use client';

import React, { useState, useEffect } from 'react';
import { AuditLogEntry, AuditAction } from '@/types';
import { History, Filter, RefreshCw, FileText } from 'lucide-react';

export default function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-log');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (filterAction === 'all') return true;
    return log.action === filterAction;
  });

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'upload':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'edit':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approve':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'publish':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'unpublish':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Audit Log Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable tracking of uploads, metric value adjustments, approvals, and publication events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-xs text-slate-700 outline-none"
            >
              <option value="all">All Actions</option>
              <option value="upload">Uploads</option>
              <option value="edit">Adjustments</option>
              <option value="approve">Approvals</option>
              <option value="publish">Publishes</option>
              <option value="unpublish">Unpublishes</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-3">Actor</th>
              <th className="py-3 px-3">Action</th>
              <th className="py-3 px-3">Target Date / Source</th>
              <th className="py-3 px-3">Field</th>
              <th className="py-3 px-3">Old &rarr; New Value</th>
              <th className="py-3 px-4">Note / Justification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  {loading ? 'Loading audit trail...' : 'No audit entries found.'}
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {log.actor}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">{log.metric_date}</span>{' '}
                    <span className="text-[10px] text-slate-500 uppercase">({log.source})</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {log.field || '-'}
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-700 max-w-[200px] truncate" title={log.new_value || ''}>
                      {log.old_value && (
                        <span className="line-through text-slate-400 mr-1.5">{log.old_value}</span>
                      )}
                      <span className="font-semibold text-slate-900">{log.new_value || '-'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-[240px]">
                    <span className="italic">{log.note || '-'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
