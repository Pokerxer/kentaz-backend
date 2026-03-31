import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/products',
  '/inventory',
  '/purchases',
  '/orders',
  '/bookings',
  '/customers',
  '/users',
  '/staff',
  '/categories',
  '/discounts',
  '/gift-cards',
  '/shipping',
  '/reviews',
  '/wishlists',
  '/analytics',
  '/notifications',
  '/announcements',
  '/reports',
  '/settings',
];

const publicRoutes = ['/login', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for admin token
  const adminToken = request.cookies.get('admin_token')?.value ||
    request.cookies.get('admin-auth')?.value;

  const isAuthenticated = !!adminToken;
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};