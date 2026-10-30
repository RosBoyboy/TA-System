'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import { OFFICIAL_DIVISIONS } from '@/lib/constants/organization';
import SignaturePad from '@/components/signature/SignaturePad';

// ─── DENR-PENRO Agusan del Norte Organizational Structure ──────────────────────
// Single source of truth lives in src/lib/constants/organization.ts
const DIVISIONS: string[] = OFFICIAL_DIVISIONS.map((d) => d.name);

type Division = string;

const SECTIONS_BY_DIVISION: Record<Division, string[]> = Object.fromEntries(
  OFFICIAL_DIVISIONS.map((d) => [d.name, d.sections.map((s) => s.name)])
);

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    division: '' as Division | '',
    position: '',
    section: '',
    birthday: '',
    address: '',
    email: '',
    phoneNumber: '',
  });

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Derived state
  const selectedDivision = formData.division as Division | '';
  const availableSections =
    selectedDivision && selectedDivision in SECTIONS_BY_DIVISION
      ? SECTIONS_BY_DIVISION[selectedDivision as Division]
      : [];
  const requiresSection = availableSections.length > 0;
  const showDynamicFields = !!selectedDivision;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDivision = e.target.value as Division | '';
    // Clear dependent fields when division changes
    setFormData((prev) => ({
      ...prev,
      division: newDivision,
      section: '',
      position: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Please provide your Full Name.');
      setLoading(false);
      return;
    }
    if (!formData.division) {
      setError('Please select your Division.');
      setLoading(false);
      return;
    }
    if (!formData.position.trim()) {
      setError('Please enter your Position / Designation.');
      setLoading(false);
      return;
    }
    if (requiresSection && !formData.section) {
      setError('Please select your Section.');
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
    if (!signatureData || !signatureData.trim()) {
      setError('Official Employee E-Signature is required. Please sign using a stylus pen, board, or mouse before submitting.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        division: formData.division,
        position: formData.position.trim(),
        section: requiresSection ? formData.section : null,
        birthday: formData.birthday || null,
        address: formData.address.trim() || null,
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        signatureData: signatureData,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // ── Success Screen ─────────────────────────────────────────────────────────
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

          {/* Summary of submitted info */}
          <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 space-y-2 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Submitted Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div>
                <span className="text-slate-400 block">Division:</span>
                <span className="font-semibold text-slate-800">{formData.division}</span>
              </div>
              {formData.section && (
                <div>
                  <span className="text-slate-400 block">Section:</span>
                  <span className="font-semibold text-slate-800">{formData.section}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block">Position:</span>
                <span className="font-semibold text-slate-800">{formData.position}</span>
              </div>
              <div>
                <span className="text-slate-400 block">E-Signature:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <span>✓ Affixed &amp; Verified</span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Your employee credentials and official e-signature have been received and sent to the{' '}
            <strong>Account Manager (HRMO)</strong> for review.
            <br />
            <br />
            Once verified, the Account Manager will{' '}
            <strong>generate your official Username &amp; Temporary Password</strong> and send them
            to your mobile number (<strong>{formData.phoneNumber}</strong>) and email (
            <strong>{formData.email}</strong>).
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

  // ── Main Registration Form ─────────────────────────────────────────────────
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
          <img src="/Tops-golo.png" alt="TOPS Logo" className="w-11 h-11 object-contain drop-shadow-md group-hover:brightness-110 transition-all" />
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-none">TOPS</h1>
            <p className="text-[9px] font-bold tracking-widest text-emerald-300 uppercase mt-0.5">
              TRAVEL ORDER PROCESSING SYSTEM
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
            <span className="text-emerald-400">Onboarding &amp; Registration</span>
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
            Register your employee credentials and official e-signature to start requesting, endorsing, and processing official Travel Orders online.
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
                <p className="text-[11px] text-emerald-200/80 mt-0.5">All credentials and signatures are reviewed and activated by the Account Manager.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-600/40 shadow-sm mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">SMS &amp; Email Credentials Delivery</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Login credentials are sent directly to your verified phone and inbox.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-600/40 shadow-sm mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Integrated E-Signature Authentication</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Stylus pen, board, and mouse input to bind official Travel Order requests.</p>
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
              <img src="/Tops-golo.png" alt="TOPS Logo" className="w-14 h-14 object-contain mx-auto mb-2 drop-shadow-sm group-hover:brightness-105 transition-all" />
              <h1 className="text-xl font-black text-[#0F4C2E] tracking-tight group-hover:text-emerald-700 transition-colors">TOPS</h1>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                TRAVEL ORDER PROCESSING SYSTEM
              </p>
            </Link>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">Employee Registration</h2>
            <p className="text-xs text-slate-500 mt-1">
              Submit your personnel credentials and official e-signature for HR onboarding.
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

            {/* 1. Full Name */}
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

            {/* 2. Division */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Division <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="division"
                  value={formData.division}
                  onChange={handleDivisionChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium appearance-none pr-8"
                >
                  <option value="">— Select Division —</option>
                  {DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
                <svg
                  className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {formData.division && (
                <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    {availableSections.length} section{availableSections.length !== 1 ? 's' : ''} available.
                  </span>
                </p>
              )}
            </div>

            {/* 3 & 4. Dynamic Fields: Position / Designation + Section */}
            {/* Animated reveal container */}
            <div
              style={{
                maxHeight: showDynamicFields ? '400px' : '0px',
                opacity: showDynamicFields ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.35s ease, opacity 0.3s ease',
              }}
            >
              <div className="space-y-4 pt-1">
                {/* 3. Section — only shown if division has sections */}
                {requiresSection && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Section <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="section"
                        value={formData.section}
                        onChange={handleChange}
                        required={requiresSection}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium appearance-none pr-8"
                      >
                        <option value="">— Select Section —</option>
                        {availableSections.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 4. Position */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Position <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="e.g., Planning Officer II, Forest Ranger, Development Management Officer"
                    required={showDynamicFields}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C2E] outline-none text-xs font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Enter your official government designation.
                  </span>
                </div>
              </div>
            </div>

            {/* 5 & 6. Birthday & Home Address in 2 Columns */}
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
                Notification Channels (For Alerts &amp; Generated Logins)
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

            {/* Official Employee E-Signature Pad */}
            <div className="pt-2 border-t border-slate-100">
              <SignaturePad
                onChange={(data) => {
                  setSignatureData(data);
                  if (data && error.toLowerCase().includes('signature')) {
                    setError('');
                  }
                }}
                required={true}
                label="Official Employee E-Signature"
                description="Sign using a stylus pen & board, touch, or mouse. This e-signature is affixed to your official Travel Authority requests."
              />
            </div>

            {/* HR Credential Generation Notice */}
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-[11px] text-emerald-950 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <strong className="font-bold text-emerald-900">Official HR Account Creation:</strong>
                <p className="mt-0.5 text-emerald-800">
                  You do not need to set a password. The <strong>Account Manager</strong> will
                  review your credentials and e-signature before generating your official{' '}
                  <strong>Username</strong> and <strong>Temporary Password</strong>.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#0F4C2E] hover:bg-[#165E3A] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
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
