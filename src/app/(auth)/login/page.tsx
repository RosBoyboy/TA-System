'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/employee';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        username: identifier.trim(),
        email: identifier.trim(),
        password,
        callbackUrl,
      });

      if (res?.error) {
        if (res.error.includes('ACCOUNT_PENDING')) {
          setError('Your account registration is currently pending review and activation by the Account Manager.');
        } else if (res.error.includes('ACCOUNT_DEACTIVATED')) {
          setError('Your account has been deactivated. Please contact your system administrator.');
        } else {
          setError(res.error || 'Invalid username or password.');
        }
        setLoading(false);
        return;
      }

      // Hard redirect to dashboard based on authenticated user's role
      let targetUrl = callbackUrl && callbackUrl !== '/' && callbackUrl !== '/employee' ? callbackUrl : '';

      if (!targetUrl) {
        try {
          const sessionRes = await fetch('/api/auth/session');
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            const userRole = sessionData?.user?.role || 'EMPLOYEE';
            if (userRole === 'ADMIN') {
              targetUrl = '/admin';
            } else if (['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO'].includes(userRole)) {
              targetUrl = '/staff';
            } else if (userRole === 'ACCOUNT_MANAGER') {
              targetUrl = '/account-manager';
            } else {
              targetUrl = '/employee';
            }
          }
        } catch (sErr) {
          console.error('Failed to resolve role-based target URL', sErr);
        }
      }

      window.location.href = targetUrl || '/employee';
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoUsername: string) => {
    setIdentifier(demoUsername);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex flex-col lg:flex-row font-sans text-slate-800">
      {/* Left Split Hero Panel */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-emerald-950 flex-col justify-between p-12 overflow-hidden border-r border-emerald-900/30">
        {/* Real photo background */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url('/hero%20banner2.jpg')`,
            backgroundPosition: 'center 35%',
          }}
        />

        {/* Dark DENR Green Overlay */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(0, 55, 35, 0.92) 0%, rgba(0, 55, 35, 0.70) 55%, rgba(0, 55, 35, 0.45) 100%)',
          }}
        />
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(5, 30, 15, 0.50) 0%, rgba(5, 30, 15, 0.0) 30%, rgba(5, 30, 15, 0.20) 70%, rgba(5, 30, 15, 0.75) 100%)',
          }}
        />

        {/* Top Header Logo on Hero Panel - Clickable to Landing Page */}
        <Link
          href="/"
          className="relative z-10 flex items-center gap-3 group w-fit transition-transform hover:scale-[1.02]"
          title="Return to Landing Page"
        >
          <img src="/taps-logo.png" alt="TAPS Logo" className="w-11 h-11 object-contain drop-shadow-md group-hover:brightness-110 transition-all" />
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-none">TAPS</h1>
            <p className="text-[9px] font-bold tracking-widest text-emerald-300 uppercase mt-0.5">
              TRAVEL AUTHORITY PROCESSING SYSTEM
            </p>
          </div>
        </Link>

        {/* Middle Hero Content */}
        <div className="relative z-10 my-auto py-12 max-w-xl space-y-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            DENR-PENRO DIGITAL SERVICE
          </span>

          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            Secure access to your <br />
            <span className="text-emerald-400">Travel Authority</span> Processing System
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
            Submit requests, monitor approval progress, receive real-time notifications, and manage travel authority records through one centralized platform.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-600/40 shadow-sm mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sequential three-level approval</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Section Chief → Division Chief → Head of PENRO</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-600/40 shadow-sm mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">In-app, Email & SMS alerts</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Dual-channel notification via Resend Email and Semaphore SMS.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-600/40 shadow-sm mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Destination mapping integration</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Visualize and confirm travel destinations with interactive maps.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 pt-6 border-t border-emerald-800/60 flex items-center justify-center gap-4 text-[10px] font-bold text-emerald-400 tracking-widest uppercase">
          <span className="h-[1px] w-12 bg-emerald-800"></span>
          <span>PROTECT • CONSERVE • SUSTAIN</span>
          <span className="h-[1px] w-12 bg-emerald-800"></span>
        </div>
      </div>

      {/* Right Split Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100/80">
          {/* Logo Header - Clickable to Landing Page */}
          <div className="text-center mb-5">
            <Link
              href="/"
              className="inline-block group transition-transform hover:scale-[1.02]"
              title="Return to Landing Page"
            >
              <img src="/taps-logo.png" alt="TAPS Logo" className="w-16 h-16 object-contain mx-auto mb-2 drop-shadow-sm group-hover:brightness-105 transition-all" />
              <h1 className="text-xl font-black text-[#0F4C2E] tracking-tight group-hover:text-emerald-700 transition-colors">TAPS</h1>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                TRAVEL AUTHORITY PROCESSING SYSTEM
              </p>
            </Link>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h3>
            <p className="text-xs text-slate-500 mt-1">Sign in with your official account credentials.</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g., employee, juan.delacruz, or name@denr.gov.ph"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs transition-all font-medium"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs transition-all font-medium"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 012.122-.063c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0F4C2E] focus:ring-[#0F4C2E]"
                />
                <span className="text-xs text-slate-600 font-medium">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Please contact the Account Manager or Administrator to reset your password.')}
                className="text-xs font-bold text-[#0F4C2E] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#0F4C2E] hover:bg-[#165E3A] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>→</span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Create Account Button */}
          <div className="mt-5 text-center space-y-3">
            <span className="text-xs text-slate-400 block font-medium">New to TAPS?</span>
            <Link
              href="/register"
              className="w-full py-2.5 px-4 bg-white border border-[#0F4C2E] text-[#0F4C2E] hover:bg-emerald-50 font-bold text-xs rounded-xl transition-all inline-flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Register Employee Credentials</span>
            </Link>
          </div>

          {/* Account Manager Approval Notice */}
          <div className="mt-6 p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="leading-snug font-medium">New employee registrations are reviewed by the Account Manager who generates official login credentials.</span>
          </div>

          {/* Quick Demo Test Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Quick Test Accounts (Password: password123)
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('employee')}
                className="px-2 py-1.5 bg-slate-50 text-slate-700 rounded-lg hover:bg-emerald-50 font-medium text-left border border-slate-200 truncate cursor-pointer"
              >
                👤 Employee
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('sectionchief')}
                className="px-2 py-1.5 bg-slate-50 text-slate-700 rounded-lg hover:bg-emerald-50 font-medium text-left border border-slate-200 truncate cursor-pointer"
              >
                👔 Section Chief
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('divchief')}
                className="px-2 py-1.5 bg-slate-50 text-slate-700 rounded-lg hover:bg-emerald-50 font-medium text-left border border-slate-200 truncate cursor-pointer"
              >
                🏢 Division Chief
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('headpenro')}
                className="px-2 py-1.5 bg-slate-50 text-slate-700 rounded-lg hover:bg-emerald-50 font-medium text-left border border-slate-200 truncate cursor-pointer"
              >
                🏛️ Head of PENRO
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('acctmgr')}
                className="px-2 py-1.5 bg-slate-50 text-slate-700 rounded-lg hover:bg-emerald-50 font-medium text-left border border-slate-200 truncate cursor-pointer"
              >
                🔑 Acct Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="px-2 py-1.5 bg-slate-50 text-slate-700 rounded-lg hover:bg-emerald-50 font-medium text-left border border-slate-200 truncate cursor-pointer"
              >
                ⚙️ Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading sign in portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
