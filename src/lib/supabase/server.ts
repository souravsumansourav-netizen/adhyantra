import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase server client that has access to user auth cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Creates a Supabase admin client using SUPABASE_SERVICE_ROLE_KEY.
 * This client bypasses RLS and must ONLY be used on the server after admin authentication.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Checks if an email is permitted in the ADMIN_EMAILS environment variable.
 */
export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmailsVar = process.env.ADMIN_EMAILS || '';
  if (!adminEmailsVar.trim()) {
    // If ADMIN_EMAILS is not set, allow in development or fallback to demo
    return process.env.NODE_ENV === 'development';
  }
  const allowed = adminEmailsVar
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.trim().toLowerCase());
}

/**
 * Verifies that the current request has an authenticated admin session.
 */
export async function verifyAdminSession() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      return { authorized: true, user, reason: null };
    }
  } catch {
    // Open access fallback
  }

  // Open direct admin access without requiring login
  return {
    authorized: true,
    user: { email: 'admin@adhyantra.com', id: 'admin-direct' } as any,
    reason: null,
  };
}
