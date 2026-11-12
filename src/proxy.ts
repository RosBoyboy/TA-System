import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const authProxy = withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const role = (token as any)?.role;
    const pathname = req.nextUrl.pathname;

    const getDesignatedPortal = (userRole: string) => {
      if (['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO'].includes(userRole)) {
        return '/staff';
      }
      if (userRole === 'ACCOUNT_MANAGER') {
        return '/account-manager';
      }
      if (userRole === 'ADMIN') {
        return '/admin';
      }
      return '/employee';
    };

    // 0. Auto-redirect already logged-in users visiting public landing or auth pages in new tabs
    const isPublicAuthRoute = pathname === '/' || pathname === '/login' || pathname === '/register';
    if (token && isPublicAuthRoute) {
      return NextResponse.redirect(new URL(getDesignatedPortal(role), req.url));
    }

    // 1. Role-based protection for /employee route (standard employees only)
    if (pathname.startsWith('/employee')) {
      if (role !== 'EMPLOYEE') {
        const dest = `${getDesignatedPortal(role)}?unauthorized=403`;
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }

    // 2. Role-based protection for /staff route (signatories & admin only)
    if (pathname.startsWith('/staff')) {
      if (!['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO', 'ADMIN'].includes(role)) {
        const dest = `${getDesignatedPortal(role)}?unauthorized=403`;
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }

    // 3. Role-based protection for /account-manager route (Account Manager & Admin only)
    if (pathname.startsWith('/account-manager')) {
      if (role !== 'ACCOUNT_MANAGER' && role !== 'ADMIN') {
        const dest = `${getDesignatedPortal(role)}?unauthorized=403`;
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }

    // 4. Role-based protection for /admin route (Admin only)
    if (pathname.startsWith('/admin')) {
      if (role !== 'ADMIN') {
        const dest = `${getDesignatedPortal(role)}?unauthorized=403`;
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Public pages (landing, login, register) are accessible whether token exists or not
        if (pathname === '/' || pathname === '/login' || pathname === '/register') {
          return true;
        }
        // Protected dashboard pages require an active authenticated session token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const proxy = authProxy;
export default authProxy;

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/employee/:path*',
    '/staff/:path*',
    '/account-manager/:path*',
    '/admin/:path*',
  ],
};
