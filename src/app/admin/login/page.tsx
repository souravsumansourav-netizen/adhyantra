'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        if (email.trim()) {
          sessionStorage.setItem('demo_admin_email', email.trim());
          router.push('/admin');
          return;
        } else {
          setErrorMsg('Please enter an admin email.');
          setLoading(false);
          return;
        }
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      if (data?.user) {
        router.push('/admin');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    sessionStorage.setItem('demo_admin_email', 'admin@adhyantra.com');
    router.push('/admin');
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-8 relative overflow-hidden">
      {/* Decorative top gradient */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Adhyantra vs Mriganka Performance Management
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-6 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-800 text-xs flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Demo Mode Active:</strong> Supabase environment variables are not yet configured in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.local</code>. You can test admin controls directly.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDemoBypass}
            className="mt-1 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Enter Demo Admin
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Credentials Info / Autofill Helper */}
      <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">Admin Account:</span>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@adhyantra.com');
              setPassword('Admin@adhyantra2026!');
            }}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
          >
            Auto-fill Credentials
          </button>
        </div>
        <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 space-y-0.5">
          <div>Email: <strong className="text-slate-900">admin@adhyantra.com</strong></div>
          <div>Password: <strong className="text-slate-900">Admin@adhyantra2026!</strong></div>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Admin Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@adhyantra.com"
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm text-slate-900 transition-all outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required={isSupabaseConfigured}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm text-slate-900 transition-all outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Authenticating...
            </span>
          ) : (
            <>
              <span>Sign In to Admin</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 font-medium"
        >
          &larr; Back to Public Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-100 p-4">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
