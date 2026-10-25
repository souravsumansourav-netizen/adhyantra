'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DateComparisonRow,
  MetricComparisonItem,
  DashboardSettings,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/metrics';
import ReviewTable from '@/components/admin/ReviewTable';
import UploadPanel from '@/components/admin/UploadPanel';
import AuditLogTab from '@/components/admin/AuditLogTab';
import SettingsTab from '@/components/admin/SettingsTab';
import FixDrawer from '@/components/admin/FixDrawer';

import {
  Sliders,
  UploadCloud,
  History,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Database,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'review' | 'upload' | 'audit' | 'settings'>('review');
  const [rows, setRows] = useState<DateComparisonRow[]>([]);
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('admin');
  const [isConfigured, setIsConfigured] = useState<boolean>(true);

  // Fix Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<string>('');
  const [drawerSource, setDrawerSource] = useState<'adhyantra' | 'mriganka'>('adhyantra');
  const [drawerMetricItem, setDrawerMetricItem] = useState<MetricComparisonItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.success) {
        setRows(data.rows || []);
        if (data.settings) setSettings(data.settings);
        if (data.userEmail) setUserEmail(data.userEmail);
        setIsConfigured(!!data.isConfigured);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenFixDrawer = (
    date: string,
    source: 'adhyantra' | 'mriganka',
    metricItem: MetricComparisonItem
  ) => {
    setDrawerDate(date);
    setDrawerSource(source);
    setDrawerMetricItem(metricItem);
    setIsDrawerOpen(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    router.push('/');
  };

  // Count pending red issues across drafts
  const totalUnresolvedReds = rows.reduce((acc, r) => acc + r.unresolvedRedCount, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Admin Navbar */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              AVM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base leading-none">
                  Performance Admin
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Console
                </span>
                {!isConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Sparkles className="w-2.5 h-2.5" />
                    Demo Seed Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Database className="w-2.5 h-2.5" />
                    Supabase Live
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Adhyantra vs Mriganka baseline validation & publishing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors"
            >
              <span>Public Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">{userEmail}</span>
              <span className="text-[10px] text-slate-400">Authorized Admin</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Exit to Public Dashboard"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('review')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'review'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Review & Publish</span>
            {totalUnresolvedReds > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono">
                {totalUnresolvedReds}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload GA4 Data</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Log</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6 min-w-0">
        {initialLoading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-8 h-8 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <span className="text-xs font-semibold text-slate-500">Loading performance data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'review' && (
              <ReviewTable
                rows={rows}
                onOpenFixDrawer={handleOpenFixDrawer}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'upload' && (
              <UploadPanel
                onSuccess={() => {
                  fetchData();
                  setActiveTab('review');
                }}
              />
            )}

            {activeTab === 'audit' && <AuditLogTab />}

            {activeTab === 'settings' && (
              <SettingsTab initialSettings={settings} onSaved={fetchData} />
            )}
          </>
        )}
      </main>

      {/* Fix Flow Slide-Over Drawer */}
      <FixDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        date={drawerDate}
        source={drawerSource}
        metricItem={drawerMetricItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
