import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes
  const publicRoutes = ['/login', '/api/auth'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  let response: NextResponse;

  if (isPublicRoute) {
    response = NextResponse.next();
  } else if (!isLoggedIn) {
    response = NextResponse.redirect(new URL('/login', req.url));
  } else {
    const userRole = (req.auth?.user as any)?.role;
    if (userRole === 'TECNICO' && !pathname.startsWith('/registro-personal') && !pathname.startsWith('/api/')) {
      response = NextResponse.redirect(new URL('/registro-personal', req.url));
    } else {
      response = NextResponse.next();
    }
  }

  // Prevent Safari and other browsers from caching pages and API responses
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.ico$).*)'],
};
