'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import ProfileModal from './ProfileModal';

const roleDisplayNames: Record<string, string> = {
  EMPLOYEE: 'Employee',
  SECTION_CHIEF: 'Section Chief',
  DIVISION_CHIEF: 'Division Chief',
  HEAD_PENRO: 'Head of PENRO',
  ACCOUNT_MANAGER: 'Account Manager',
  ADMIN: 'Administrator',
};

export default function ProfileDropdown() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    phoneNumber: string;
    section: string;
    position: string;
    image?: string | null;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync profile data from session
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || 'Juan Dela Cruz',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        section: user.section || 'PENRO Laguna',
        position: user.position || '',
        image: user.image || null,
      });
    }
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const name = profileData?.name || user?.name || 'Juan Dela Cruz';
  const email = profileData?.email || user?.email || 'user@denr.gov.ph';
  const phoneNumber = profileData?.phoneNumber || user?.phoneNumber || '';
  const section = profileData?.section || user?.section || 'PENRO General';
  const position = profileData?.position || user?.position || '';
  const image = profileData?.image ?? user?.image;
  const role = user?.role || 'EMPLOYEE';

  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleProfileUpdated = (updated: any) => {
    setProfileData({
      name: updated.name,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      section: updated.section,
      position: updated.position,
      image: updated.image,
    });
  };

  const displaySubtitle = position || roleDisplayNames[role] || (role === 'EMPLOYEE' ? 'Employee' : role.replace(/_/g, ' '));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Clickable Header Profile Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 pl-2 sm:pl-3 pr-1 py-1 rounded-2xl hover:bg-slate-100/90 transition-all border border-transparent hover:border-slate-200 cursor-pointer group select-none text-left"
        title="Open ETAPS Account Profile Menu"
      >
        {/* Avatar */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-[#C8E6C9] text-[#1B4332] font-black text-xs sm:text-sm flex items-center justify-center shadow-xs ring-2 ring-transparent group-hover:ring-emerald-500/30 transition-all shrink-0">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span>{initials.substring(0, 1)}</span>
          )}
        </div>

        {/* User Details in Header */}
        <div className="text-left hidden sm:block max-w-[130px] lg:max-w-[160px]">
          <p className="text-xs font-black text-slate-900 leading-tight truncate">{name}</p>
          <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">
            {displaySubtitle}
          </p>
        </div>

        {/* Chevron down indicator */}
        <svg
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-700' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Google Account Style Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-3xl shadow-2xl border border-slate-200/90 py-4 px-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
          
          {/* Top Email Info */}
          <p className="text-center text-[11px] font-bold text-slate-500 truncate px-2 mb-3">
            {email}
          </p>

          {/* Centered Large Avatar & Greeting */}
          <div className="flex flex-col items-center text-center px-3 pb-4 border-b border-slate-100">
            <div
              className="relative group/avatar cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
            >
              <div className="w-18 h-18 rounded-full overflow-hidden bg-[#C8E6C9] text-[#1B4332] font-black text-2xl flex items-center justify-center shadow-md ring-4 ring-emerald-50 mb-2">
                {image ? (
                  <img src={image} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="absolute bottom-1 right-0 w-6 h-6 rounded-full bg-[#1B4332] text-white flex items-center justify-center shadow-xs border-2 border-white">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
            </div>

            <h4 className="text-sm font-black text-slate-900 mt-1">Hi, {name}!</h4>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {role}
              </span>
              {position && (
                <span className="text-[10px] text-slate-600 font-semibold truncate max-w-[140px]">
                  {position}
                </span>
              )}
            </div>

            {/* Manage Profile Primary Pill Button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
              className="mt-4 w-full py-2.5 px-4 rounded-full border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Manage ETAPS Profile</span>
            </button>
          </div>

          {/* Clean Contact Details Summary Strip */}
          <div className="py-2.5 px-1 space-y-1.5">
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile (SMS)
              </span>
              <span className="font-mono font-bold text-slate-800">
                {phoneNumber ? phoneNumber : <span className="text-amber-600 font-sans">Not set</span>}
              </span>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Section
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                {section || 'General'}
              </span>
            </div>
          </div>

          {/* Bottom Actions (Sign out) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full py-2 px-4 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>

          <div className="text-center pt-2">
            <span className="text-[10px] text-slate-400">
              DENR-PENRO ETAPS Security
            </span>
          </div>
        </div>
      )}

      {/* Full Edit Profile Modal (Mounted at root level via Portal) */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}
