'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const heroBackgrounds = [
    {
      src: '/hero banner2.jpg',
      alt: 'Orange arch bridge spanning over the river during golden hour',
      position: 'center 35%',
    },
    {
      src: '/hero banner1.jpg',
      alt: 'Historic gazebo belfry landmark shaded by an ancient banyan tree',
      position: 'center 50%',
    },
    {
      src: '/denr_hero_baner2.png',
      alt: 'Scenic dam and cascading waterfall surrounded by lush green mountain slopes',
      position: 'center 45%',
    },
  ];

  // Auto rotate hero slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroBackgrounds.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroBackgrounds.length]);

  // Handle sticky header scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F4F0] font-sans text-slate-800 flex flex-col selection:bg-emerald-800 selection:text-white">
      {/* ===================== Header / Navigation ===================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#051E0F]/90 backdrop-blur-md shadow-xl py-3 border-b border-emerald-900/50'
            : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 flex items-center justify-between">
          {/* Brand Logo Lockup */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/taps-logo.png"
              alt="TAPS Logo"
              className="w-11 h-11 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">TAPS</h1>
              <p className="text-[9px] font-bold tracking-widest text-white/80 uppercase mt-0.5">
                Travel Authority Processing System
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
            <a href="#home" className="hover:text-emerald-400 transition-colors py-1 border-b-2 border-transparent hover:border-emerald-400">
              Home
            </a>
            <a href="#features" className="hover:text-emerald-400 transition-colors py-1 border-b-2 border-transparent hover:border-emerald-400">
              Features
            </a>
            <a href="#process" className="hover:text-emerald-400 transition-colors py-1 border-b-2 border-transparent hover:border-emerald-400">
              Process
            </a>
            <a href="#about" className="hover:text-emerald-400 transition-colors py-1 border-b-2 border-transparent hover:border-emerald-400">
              About
            </a>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-semibold text-white hover:text-emerald-300 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-sm font-semibold rounded-full shadow-md transition-all hover:scale-105"
            >
              Register
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#051E0F] border-b border-emerald-800 px-6 py-6 space-y-4 animate-fade-in">
            <nav className="flex flex-col space-y-3 text-sm font-semibold text-white/90">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-400">Home</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-400">Features</a>
              <a href="#process" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-400">Process</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-400">About</a>
            </nav>
            <div className="pt-4 border-t border-emerald-900 flex flex-col gap-2.5">
              <Link href="/login" className="w-full text-center py-2.5 text-xs font-bold text-white border border-white/20 rounded-xl">
                Login
              </Link>
              <Link href="/register" className="w-full text-center py-2.5 text-xs font-bold bg-[#1B5E20] text-white rounded-xl">
                Register
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ===================== Hero Section (Immersive Large Screen Banner) ===================== */}
      <section
        id="home"
        className="relative min-h-[85vh] lg:min-h-screen flex items-center pt-28 pb-24 sm:pt-32 sm:pb-32 overflow-hidden bg-[#051E0F]"
      >
        {/* Preload hero images for instant transitions */}
        {heroBackgrounds.map((bg) => (
          <img
            key={`preload-${bg.src}`}
            src={bg.src}
            alt=""
            className="sr-only"
            aria-hidden="true"
            loading="eager"
          />
        ))}

        {/* Carousel Background Images with smooth 1.2s crossfade transition */}
        {heroBackgrounds.map((bg, idx) => (
          <div
            key={bg.src}
            className={`absolute inset-0 z-0 bg-cover bg-no-repeat transition-opacity duration-1200 ease-in-out motion-reduce:transition-none ${
              idx === activeSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              backgroundImage: `url('${encodeURI(bg.src)}')`,
              backgroundPosition: bg.position,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Dark DENR Green / Charcoal Gradient Overlay for strong typography contrast */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(0, 45, 25, 0.92) 0%, rgba(0, 45, 25, 0.78) 35%, rgba(0, 35, 20, 0.40) 70%, rgba(0, 20, 10, 0.15) 100%)',
          }}
        />

        {/* Subtle top/bottom vertical gradient for navbar contrast and smooth blend into wave */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(5, 30, 15, 0.50) 0%, rgba(5, 30, 15, 0.0) 25%, rgba(5, 30, 15, 0.0) 75%, rgba(5, 30, 15, 0.70) 100%)',
          }}
        />

        {/* Stationary Hero Content Container (stays rock-solid while backgrounds transition) */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12 w-full">
          <div className="max-w-[640px] text-left space-y-5">
            {/* Eyebrow Pill */}
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#003C14]/70 border border-[#A5D6A7]/40 text-xs font-semibold text-[#4ADE80] shadow-md backdrop-blur-sm">
              <svg className="w-3.5 h-3.5 text-[#A5D6A7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 21c9 0 13-6 13-15 0 0-9-1-13 4C2 14 2 21 6 21Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 21c0-5 2-9 6-12" />
              </svg>
              <span>Official DENR-PENRO Digital Service</span>
            </span>

            {/* Title matching clamp(40px, 5.5vw, 64px) */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-white tracking-tight leading-[1.1]">
              <span className="block">Travel Authority</span>
              <span className="block">Processing</span>
              <span className="block text-[#4ADE80]">Made Faster and Smarter</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-[500px] font-normal pt-1">
              Digitize travel authority requests, approvals, notifications, and destination tracking for DENR-PENRO.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/register"
                className="px-7 py-3.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white font-semibold text-sm rounded-full shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
              >
                <span>Get Started</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>

              <Link
                href="/login"
                className="px-7 py-3.5 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 font-semibold text-sm rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
              >
                Login
              </Link>
            </div>

            {/* Stats Strip inside Hero */}
            <div className="pt-6 flex flex-wrap items-center gap-8 text-xs">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                <div>
                  <p className="font-bold text-[#4ADE80] text-sm leading-tight">100%</p>
                  <p className="text-[11px] text-white/60 font-medium">Digital Workflow</p>
                </div>
              </div>

              <div className="h-8 w-[1px] bg-white/20 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3v5h5" />
                </svg>
                <div>
                  <p className="font-bold text-[#4ADE80] text-sm leading-tight">DPA 2012</p>
                  <p className="text-[11px] text-white/60 font-medium">Compliant</p>
                </div>
              </div>

              <div className="h-8 w-[1px] bg-white/20 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
                </svg>
                <div>
                  <p className="font-bold text-[#4ADE80] text-sm leading-tight">24/7</p>
                  <p className="text-[11px] text-white/60 font-medium">Availability</p>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Bottom Hero Smooth Wave Curve */}
        <div className="absolute bottom-0 left-0 right-0 z-10 leading-none pointer-events-none">
          <svg
            className="w-full h-14 sm:h-20 text-[#F0F4F0]"
            viewBox="0 0 1440 120"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,0 C240,120 480,120 720,60 C960,0 1200,80 1440,40 L1440,120 L0,120 Z" />
          </svg>
        </div>
      </section>

      {/* ===================== Key Statistics Section ===================== */}
      <section className="pt-6 pb-14 px-6 sm:px-10 lg:px-12 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="w-13 h-13 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <p className="text-4xl font-extrabold text-[#1B5E20]">3</p>
            <p className="text-sm font-bold text-[#1E293B] mt-2">Approval Levels</p>
            <p className="text-xs text-[#64748B] mt-1.5">Section Chief, Division Chief, and Head of PENRO</p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="w-13 h-13 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="9" cy="8" r="3" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="M3.5 20c0-3.5 2.7-6 5.5-6s5.5 2.5 5.5 6" />
                <circle cx="17" cy="9" r="2" strokeWidth={2} />
              </svg>
            </div>
            <p className="text-4xl font-extrabold text-[#1B5E20]">4</p>
            <p className="text-sm font-bold text-[#1E293B] mt-2">Role-Based Interfaces</p>
            <p className="text-xs text-[#64748B] mt-1.5">Employee, Staff, Account Manager, and Admin</p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="w-13 h-13 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <p className="text-4xl font-extrabold text-[#1B5E20]">2</p>
            <p className="text-sm font-bold text-[#1E293B] mt-2">Notification Channels</p>
            <p className="text-xs text-[#64748B] mt-1.5">In-app notifications and SMS updates</p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="w-13 h-13 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
                <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} />
              </svg>
            </div>
            <p className="text-4xl font-extrabold text-[#1B5E20]">1</p>
            <p className="text-sm font-bold text-[#1E293B] mt-2">Centralized Platform</p>
            <p className="text-xs text-[#64748B] mt-1.5">Requests, approvals, mapping, and records in one system</p>
          </div>
        </div>
      </section>

      {/* ===================== Features Section ===================== */}
      <section id="features" className="py-14 sm:py-18 px-6 sm:px-10 lg:px-12 max-w-[1400px] mx-auto w-full">
        <div className="text-center max-w-[600px] mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#1B5E20]/10 border border-[#1B5E20]/25 text-[#1B5E20] rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E293B] tracking-tight">
            Everything you need to process travel authorities
          </h2>
          <p className="text-sm text-[#64748B] mt-3">
            A complete digital toolkit built to modernize how DENR-PENRO manages field travel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3v5h5" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2.5">Online Travel Authority Requests</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Submit and track travel authority requests anytime through a secure online form — no more paper trails.
            </p>
          </article>

          <article className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2.5">Sequential Approval Workflow</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Requests move through Section Chief, Division Chief, and Head of PENRO approval in a clear, auditable sequence.
            </p>
          </article>

          <article className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2.5">SMS Notifications</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Requesters and approvers receive instant SMS alerts on every status change, keeping everyone informed.
            </p>
          </article>

          <article className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2.5">In-App Notifications</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              A built-in notification center delivers real-time updates directly within the TAPS dashboard.
            </p>
          </article>

          <article className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2.5">Interactive Map Integration</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Visualize and confirm travel destinations on an interactive map for accurate destination tracking.
            </p>
          </article>

          <article className="bg-white p-8 rounded-2xl border border-[#DDE5DD] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2.5">Printable Approved Travel Authority</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Generate an official, print-ready Travel Authority document once all approvals are complete.
            </p>
          </article>
        </div>
      </section>

      {/* ===================== Workflow Process Section ===================== */}
      <section id="process" className="py-14 sm:py-18 px-6 sm:px-10 lg:px-12 max-w-[1400px] mx-auto w-full">
        <div className="text-center max-w-[600px] mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#1B5E20]/10 border border-[#1B5E20]/25 text-[#1B5E20] rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E293B] tracking-tight">
            Simple 4-Step Process
          </h2>
          <p className="text-sm text-[#64748B] mt-3">
            From submission to approval in a few straightforward steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center relative">
          {/* Step 1 */}
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#1B5E20] text-white flex items-center justify-center mx-auto text-xl font-black shadow-lg ring-8 ring-[#1B5E20]/10">
              1
            </div>
            <h3 className="text-base font-bold text-[#1E293B]">Submit Request</h3>
            <p className="text-xs text-[#64748B]">Fill out and submit your travel authority request online.</p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#1B5E20] text-white flex items-center justify-center mx-auto text-xl font-black shadow-lg ring-8 ring-[#1B5E20]/10">
              2
            </div>
            <h3 className="text-base font-bold text-[#1E293B]">Staff Reviews</h3>
            <p className="text-xs text-[#64748B]">Assigned staff reviews documents and forwards to manager.</p>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#1B5E20] text-white flex items-center justify-center mx-auto text-xl font-black shadow-lg ring-8 ring-[#1B5E20]/10">
              3
            </div>
            <h3 className="text-base font-bold text-[#1E293B]">Manager Approves</h3>
            <p className="text-xs text-[#64748B]">Account Manager reviews and issues final approval or revision.</p>
          </div>

          {/* Step 4 */}
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#1B5E20] text-white flex items-center justify-center mx-auto text-xl font-black shadow-lg ring-8 ring-[#1B5E20]/10">
              4
            </div>
            <h3 className="text-base font-bold text-[#1E293B]">Receive Authority</h3>
            <p className="text-xs text-[#64748B]">Download and print your approved travel authority document.</p>
          </div>
        </div>
      </section>

      {/* ===================== About Section ===================== */}
      <section id="about" className="py-14 sm:py-18 px-6 sm:px-10 lg:px-12 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Visual Badge Card matching reference CSS */}
          <div className="bg-white rounded-2xl p-10 border border-[#DDE5DD] shadow-sm text-center max-w-sm mx-auto w-full space-y-4">
            <img src="/taps-logo.png" alt="TAPS Logo" className="w-16 h-16 object-contain mx-auto" />
            <div>
              <h3 className="text-lg font-black text-[#1E293B]">DENR-PENRO</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Official Digital Service</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <span className="px-3.5 py-1.5 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] text-xs font-semibold border border-[#1B5E20]/25">
                RA 10173 Compliant
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] text-xs font-semibold border border-[#1B5E20]/25">
                Role-Based Access
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] text-xs font-semibold border border-[#1B5E20]/25">
                Audit Trail
              </span>
            </div>
          </div>

          {/* Right Narrative */}
          <div className="space-y-4">
            <span className="inline-block px-4 py-1.5 bg-[#1B5E20]/10 border border-[#1B5E20]/25 text-[#1B5E20] rounded-full text-xs font-semibold uppercase tracking-wider">
              About TAPS
            </span>
            <h2 className="text-3xl font-extrabold text-[#1E293B] tracking-tight leading-tight">
              Built for transparency, accountability, and compliance
            </h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              TAPS is a secure digital platform developed for DENR-PENRO to simplify travel authority processing while maintaining transparency, accountability, and full compliance with government procedures.
            </p>
            <p className="text-sm text-[#64748B] leading-relaxed">
              It replaces manual, paper-based routing with a structured, auditable digital workflow accessible to every authorized user role, in full compliance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
            </p>

            <ul className="space-y-2.5 pt-2 text-sm font-semibold text-[#1E293B]">
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center text-xs shrink-0">✓</span>
                <span>End-to-end encrypted data handling</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center text-xs shrink-0">✓</span>
                <span>Role-based access control</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center text-xs shrink-0">✓</span>
                <span>Full audit trail on every request</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===================== Call To Action Section (Dark Theme matching reference CSS) ===================== */}
      <section className="bg-gradient-to-br from-[#082D1D] via-[#0F3D22] to-[#082D1D] text-white py-16 px-6 sm:px-12 text-center">
        <div className="max-w-[580px] mx-auto space-y-5">
          <span className="inline-block px-4 py-1.5 bg-emerald-900/60 border border-emerald-500/30 text-[#9FFAC2] rounded-full text-xs font-semibold uppercase tracking-wider">
            Get Started
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Ready to submit your Travel Authority online?
          </h2>
          <p className="text-base text-white/70">
            Join DENR-PENRO staff already using TAPS to streamline their travel approvals.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-9 py-4 bg-[#9FFAC2] hover:bg-[#57B178] text-[#051E0F] font-bold text-sm rounded-full shadow-lg transition-all hover:scale-105"
          >
            <span>Create Account</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ===================== Footer matching reference CSS ===================== */}
      <footer className="bg-[#0C632D]/90 text-white/80 py-12 px-6 sm:px-12 text-xs border-t border-white/10 mt-auto">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img src="/taps-logo.png" alt="TAPS Logo" className="w-11 h-11 object-contain" />
              <span className="font-extrabold text-xl text-white tracking-wider">TAPS</span>
            </div>
            <p className="text-white/60 font-medium">Travel Authority Processing System</p>
            <p className="text-[#9FFAC2] font-semibold">DENR-PENRO</p>
            <span className="inline-block px-3.5 py-1 bg-white/10 rounded-full text-[11px] text-[#A5D6A7] border border-white/20">
              Republic of the Philippines • DENR-PENRO
            </span>
          </div>

          <div>
            <h4 className="font-bold text-white/50 uppercase text-[11px] tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-white/90 font-medium">
              <li><a href="#home" className="hover:text-[#9FFAC2]">Home</a></li>
              <li><a href="#features" className="hover:text-[#9FFAC2]">Features</a></li>
              <li><a href="#process" className="hover:text-[#9FFAC2]">Process</a></li>
              <li><a href="#about" className="hover:text-[#9FFAC2]">About</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white/50 uppercase text-[11px] tracking-wider mb-4">Contact Information</h4>
            <ul className="space-y-3 text-white/90 font-medium">
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-[#9FFAC2] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>DENR-PENRO Tiniwisan, Butuan City, Agusan del Norte</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-[#9FFAC2] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:denr.penro.taps@gmail.com" className="hover:text-[#9FFAC2] transition-colors underline-offset-2 hover:underline">
                  denr.penro.taps@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-[#9FFAC2] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+63853412345" className="hover:text-[#9FFAC2] transition-colors">
                  +63 (085) 341-XXXX
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white/50 uppercase text-[11px] tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2.5 text-white/90 font-medium">
              <li><a href="#privacy" className="hover:text-[#9FFAC2]">Data Privacy Act of 2012</a></li>
              <li><a href="#terms" className="hover:text-[#9FFAC2]">Terms of Use</a></li>
              <li><a href="#foi" className="hover:text-[#9FFAC2]">Freedom of Information</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1240px] mx-auto pt-6 text-center text-[12px] text-white/50">
          <p>© 2026 TAPS — Travel Authority Processing System. DENR-PENRO. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
