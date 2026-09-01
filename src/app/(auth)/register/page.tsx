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
            <span>←</span>
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex flex-col justify-center py-10 px-4 sm:px-6 font-sans text-slate-800">
      <div className="w-full max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100/90">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/taps-logo.png" alt="TAPS Logo" className="w-14 h-14 object-contain mx-auto mb-2 drop-shadow-sm" />
          <h1 className="text-xl font-black text-[#0F4C2E] tracking-tight">TAPS</h1>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            TRAVEL AUTHORITY PROCESSING SYSTEM
          </p>
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
              <>
                <span>Submit Registration for HR Review</span>
                <span>→</span>
              </>
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
  );
}
