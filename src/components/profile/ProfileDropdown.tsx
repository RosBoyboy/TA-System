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
    division?: string;
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
        division: user.division || '',
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
  const division = profileData?.division || user?.division || '';
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
      division: updated.division,
      section: updated.section,
      position: updated.position,
      image: updated.image,
    });
  };

  const displaySubtitle = position || roleDisplayNames[role] || (role === 'EMPLOYEE' ? 'Employee' : role.replace(/_/g, ' '));

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Clickable Header Profile Button (macOS HIG compact toolbar control) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="h-8 flex items-center gap-2 pl-1.5 pr-2 rounded-[6px] hover:bg-[#F2F2F7] transition-colors border border-transparent hover:border-[#E5E5E7] cursor-pointer group select-none text-left"
        title="Open TOPS Account Profile Menu"
      >
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full overflow-hidden bg-[#C8E6C9] text-[#1B4332] font-bold text-[11px] flex items-center justify-center shrink-0 border border-emerald-600/30">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span>{initials.substring(0, 1)}</span>
          )}
        </div>

        {/* User Details in Header */}
        <div className="text-left hidden sm:block max-w-[130px] lg:max-w-[160px]">
          <p className="text-[12px] font-semibold text-[#1D1D1F] leading-none truncate">{name}</p>
          <p className="text-[10px] text-[#86868B] font-normal truncate mt-0.5 leading-none">
            {displaySubtitle}
          </p>
        </div>

        {/* Chevron down indicator */}
        <svg
          className={`w-3.5 h-3.5 text-[#86868B] group-hover:text-[#1D1D1F] transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-[#1B4332]' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* macOS HIG Account Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-76 bg-[#FFFFFF] rounded-[8px] shadow-lg border border-[#E5E5E7] py-3 px-3.5 z-50 text-[#1D1D1F]">
          
          {/* Top Email Info */}
          <p className="text-center text-[11px] font-medium text-[#86868B] truncate px-2 mb-2.5">
            {email}
          </p>

          {/* Centered Avatar & Greeting */}
          <div className="flex flex-col items-center text-center px-2 pb-3 border-b border-[#E5E5E7]">
            <div
              className="relative group/avatar cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[#C8E6C9] text-[#1B4332] font-bold text-lg flex items-center justify-center border-2 border-emerald-600/30 mb-2 shadow-2xs">
                {image ? (
                  <img src={image} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="absolute bottom-1 right-0 w-5 h-5 rounded-full bg-[#1B4332] text-white flex items-center justify-center border border-white">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
            </div>

            <h4 className="text-[13px] font-semibold text-[#1D1D1F] mt-0.5">{name}</h4>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
              <span className="h-5 inline-flex items-center px-2 rounded-[4px] text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                {roleDisplayNames[role] || (role ? role.replace(/_/g, ' ') : '')}
              </span>
              {position && (
                <span className="text-[11px] text-[#86868B] font-normal truncate max-w-[140px]">
                  {position}
                </span>
              )}
            </div>

            {/* Manage Profile Standard 32px Button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
              className="mt-3 w-full h-8 px-[14px] rounded-[6px] border border-[#E5E5E7] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Manage TOPS Profile</span>
            </button>
          </div>

          {/* Contact Details Summary Strip */}
          <div className="py-2 space-y-1">
            <div className="px-2.5 py-1.5 rounded-[6px] bg-[#F5F5F7] border border-[#E5E5E7] flex items-center justify-between text-[11px]">
              <span className="font-medium text-[#86868B] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile (SMS)
              </span>
              <span className="font-mono font-semibold text-[#1D1D1F]">
                {phoneNumber ? phoneNumber : <span className="text-amber-600 font-sans">Not set</span>}
              </span>
            </div>

            <div className="px-2.5 py-1.5 rounded-[6px] bg-[#F5F5F7] border border-[#E5E5E7] flex items-center justify-between text-[11px]">
              <span className="font-medium text-[#86868B] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Section
              </span>
              <span className="font-medium text-[#1D1D1F] truncate max-w-[150px]">
                {section || 'General'}
              </span>
            </div>
          </div>

          {/* Bottom Actions (Sign out) */}
          <div className="pt-2 border-t border-[#E5E5E7]">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full h-8 px-[14px] rounded-[6px] text-rose-700 hover:bg-rose-50 text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>
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
