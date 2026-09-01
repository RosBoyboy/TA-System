import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = (token as any)?.role;
    const pathname = req.nextUrl.pathname;

    // Role-based protection for /staff route (signatories & admin only)
    if (pathname.startsWith('/staff')) {
      if (role === 'EMPLOYEE') {
        return NextResponse.redirect(new URL('/employee', req.url));
      }
    }

    // Role-based protection for /account-manager route
    if (pathname.startsWith('/account-manager')) {
      if (role !== 'ACCOUNT_MANAGER' && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/employee', req.url));
      }
    }

    // Role-based protection for /admin route
    if (pathname.startsWith('/admin')) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/employee', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/employee/:path*',
    '/staff/:path*',
    '/account-manager/:path*',
    '/admin/:path*',
  ],
};
