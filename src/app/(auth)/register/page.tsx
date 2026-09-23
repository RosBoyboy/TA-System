'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    section: 'Planning Section',
    birthday: '',
    address: '',
    email: '',
    phoneNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const sectionsList = [
    'Planning Section',
    'Plans & Program Unit',
    'Monitoring & Evaluation Unit',
    'Information & Communications Technology Unit',
    'Conservation Section',
    'Forest Management Section',
    'Technical Services Division',
    'Management Services Division',
    'Human Resources Section',
    'PENRO Executive Office',
    'Other / Field Office',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name.trim()) {
      setError('Please provide your Full Name.');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Please provide your Email Address for notifications.');
      setLoading(false);
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError('Please provide your Mobile Number for SMS approval alerts.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to submit employee registration.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during registration.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center p-6 font-sans text-slate-800">
        <div className="w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Registration Submitted!</h3>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Status: PENDING_REVIEW
          </div>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Your employee credentials have been received and sent to the <strong>Account Manager (HRMO)</strong> for review.
            <br /><br />
            Once verified, the Account Manager will <strong>generate your official Username & Temporary Password</strong> and send them to your mobile number (<strong>{formData.phoneNumber}</strong>) and email (<strong>{formData.email}</strong>).
          </p>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-[#0F4C2E] hover:bg-[#165E3A] text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex flex-col lg:flex-row font-sans text-slate-800">
      {/* Left Split Hero Panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[48%] relative bg-emerald-950 flex-col justify-between p-12 overflow-hidden border-r border-emerald-900/30">
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
        <div className="relative z-10 my-auto py-8 max-w-lg space-y-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            DENR-PENRO DIGITAL SERVICE
          </span>

          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            Centralized Personnel <br />
            <span className="text-emerald-400">Onboarding & Registration</span>
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
            Register your employee credentials to start requesting, endorsing, and processing official Travel Authorities online.
          </p>

          <div className="space-y-4 pt-3">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-600/40 shadow-sm mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">HR-Verified Personnel Accounts</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">All credentials are reviewed and activated by the Account Manager.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-600/40 shadow-sm mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">SMS & Email Credentials Delivery</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Login credentials are sent directly to your verified phone and inbox.</p>
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
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Integrated Travel Workflow</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Access sequential approvals, printable orders, and destination mapping.</p>
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

      {/* Right Split Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-xl bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100/90 my-auto">
          {/* Header with Clickable TAPS Logo */}
          <div className="text-center mb-6">
            <Link
              href="/"
              className="inline-block group transition-transform hover:scale-[1.02]"
              title="Return to Landing Page"
            >
              <img src="/taps-logo.png" alt="TAPS Logo" className="w-14 h-14 object-contain mx-auto mb-2 drop-shadow-sm group-hover:brightness-105 transition-all" />
              <h1 className="text-xl font-black text-[#0F4C2E] tracking-tight group-hover:text-emerald-700 transition-colors">TAPS</h1>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                TRAVEL AUTHORITY PROCESSING SYSTEM
              </p>
            </Link>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">Employee Registration</h2>
            <p className="text-xs text-slate-500 mt-1">
              Submit your personnel credentials for centralized HR onboarding.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Juan Dela Cruz"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium"
              />
            </div>

            {/* Position & Unit/Section in 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Position / Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="position"
                  required
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g., Planning Officer II"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unit / Section <span className="text-rose-500">*</span>
                </label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium"
                >
                  {sectionsList.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Birthday & Address in 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Birthday
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Home Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., Brgy. Libertad, Butuan City"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium"
                />
              </div>
            </div>

            {/* Notification Channels: Email & Phone Number */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Notification Channels (For Alerts & Generated Logins)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@gmail.com / denr.gov.ph"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Used for Resend official email notifications</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="09171234567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Used for Semaphore SMS approval alerts</span>
                </div>
              </div>
            </div>

            {/* HR Credential Generation Notice */}
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-[11px] text-emerald-950 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <strong className="font-bold text-emerald-900">Official HR Account Creation:</strong>
                <p className="mt-0.5 text-emerald-800">
                  You do not need to set a password. The <strong>Account Manager</strong> will review your credentials and generate your official <strong>Username</strong> and <strong>Temporary Password</strong>.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#0F4C2E] hover:bg-[#165E3A] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting Credentials...</span>
                </>
              ) : (
                <span>Submit Registration for HR Review</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Already have an active account?{' '}
              <Link href="/login" className="font-bold text-[#0F4C2E] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
