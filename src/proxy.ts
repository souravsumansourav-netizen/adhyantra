import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/admin/login';
  const sessionCookie = request.cookies.get('admin_session');
  const isAuthenticated = sessionCookie?.value === 'authenticated';

  if (isLoginPage) {
    // Already logged in → redirect to admin dashboard
    if (isAuthenticated) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin';
      return NextResponse.redirect(redirectUrl);
    }
    // Not logged in → show the login page
    return NextResponse.next();
  }

  // All other /admin/* routes require authentication
  if (!isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all admin routes: /admin, /admin/:path*
     */
    '/admin/:path*',
    '/admin',
  ],
};
