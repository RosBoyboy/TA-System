'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession, signOut } from 'next-auth/react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updatedData: any) => void;
}

export default function ProfileModal({ isOpen, onClose, onProfileUpdated }: ProfileModalProps) {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as any;

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [section, setSection] = useState('');
  const [division, setDivision] = useState('');
  const [position, setPosition] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load initial data from session & API
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('info');

      if (user) {
        setName(user.name || '');
        setUsername(user.username || '');
        setEmail(user.email || '');
        setPhoneNumber(user.phoneNumber || '');
        const isHeadPenroUser = user.role === 'HEAD_PENRO';
        if (isHeadPenroUser) {
          setDivision('');
          setSection('');
        } else {
          const isAO5 = (user.position || '').toLowerCase().includes('admin') && (user.position || '').toLowerCase().includes('v');
          const defaultDiv = isAO5 ? (user.division || 'Management Services Division') : (user.division || '');
          const defaultSec = isAO5
            ? (user.section && user.section !== 'Forest Management Section' ? user.section : 'Admin & Finance Section')
            : (user.section || '');
          setDivision(defaultDiv);
          setSection(defaultSec);
        }
        setPosition(user.position || '');
        setBirthday(user.birthday || '');
        setAddress(user.address || '');
        setProfileImage(user.image || null);
      }

      // Fetch fresh data from backend
      const fetchProfile = async () => {
        setFetching(true);
        try {
          const res = await fetch('/api/user/profile');
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              const u = data.data;
              setName(u.name || '');
              setUsername(u.username || '');
              setEmail(u.email || '');
              setPhoneNumber(u.phoneNumber || '');
              const isHeadPenroUser = u.role === 'HEAD_PENRO';
              if (isHeadPenroUser) {
                setDivision('');
                setSection('');
              } else {
                const isAO5 = (u.position || '').toLowerCase().includes('admin') && (u.position || '').toLowerCase().includes('v');
                const resolvedDiv = isAO5 ? (u.division || 'Management Services Division') : (u.division || '');
                const resolvedSec = isAO5
                  ? (u.section && u.section !== 'Forest Management Section' ? u.section : 'Admin & Finance Section')
                  : (u.section || '');
                setDivision(resolvedDiv);
                setSection(resolvedSec);
              }
              setPosition(u.position || '');
              setBirthday(u.birthday || '');
              setAddress(u.address || '');
              setProfileImage(u.image || null);
            }
          }
        } catch (err) {
          console.error('Failed to load profile:', err);
        } finally {
          setFetching(false);
        }
      };

      fetchProfile();
    }
  }, [isOpen, user]);

  if (!isOpen || !mounted) return null;

  const userRole = user?.role || 'EMPLOYEE';
  const isHeadPenro = userRole === 'HEAD_PENRO' || user?.role === 'HEAD_PENRO';

  const initials = (name || user?.name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Handle Photo Upload (compresses image to base64 Data URL)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds 4MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfileImage(compressedDataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfileImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Validation for password change
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setErrorMsg('Please enter your current password to change your password.');
        setLoading(false);
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New passwords do not match.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        division: isHeadPenro ? '' : division.trim(),
        section: isHeadPenro ? '' : section.trim(),
        position: position.trim(),
        birthday: birthday.trim(),
        address: address.trim(),
        image: profileImage,
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to update profile.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Update NextAuth client-side session
      await updateSession({
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        division: payload.division,
        section: payload.section,
        position: payload.position,
        birthday: payload.birthday,
        address: payload.address,
        image: payload.image,
      });

      if (onProfileUpdated) {
        onProfileUpdated(data.data);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('taps:profile-updated', { detail: payload }));
      }

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving profile.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      style={{ zIndex: 99999 }}
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div
        className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        style={{ zIndex: 100000 }}
      >
        {/* Top Header Banner */}
        <div className="bg-[#1B4332] px-6 sm:px-8 py-5 text-white flex items-center justify-between relative shrink-0 border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                DENR-PENRO TOPS Account
              </h3>
              <p className="text-xs text-emerald-200/90 font-medium">Manage your profile, position, and contact details</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile management"
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-emerald-100 flex items-center justify-center transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile Identity Card (Google Style) */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center sm:items-start gap-5 shrink-0">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-emerald-600/30 shadow-md bg-[#C8E6C9] flex items-center justify-center text-[#1B4332] font-black text-2xl">
              {profileImage ? (
                <img src={profileImage} alt={name || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
              title="Upload new profile picture"
            >
              <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Change</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="text-lg font-black text-slate-900 truncate">{name || 'User Profile'}</h4>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                {userRole}
              </span>
              {username && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700 border border-slate-300">
                  @{username}
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-600 font-medium flex items-center justify-center sm:justify-start gap-1.5 truncate">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{email || 'No email set'}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-0.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {phoneNumber ? phoneNumber : 'No mobile registered'}
              </span>
              <span>&bull;</span>
              <span className="font-semibold text-slate-700">{position || 'Position not set'}</span>
              <span>&bull;</span>
              <span className="font-semibold text-slate-600">
                {isHeadPenro
                  ? 'PENRO Executive Office'
                  : section ? `${section}${division ? ` • ${division}` : ''}` : division || 'PENRO General Office'}
              </span>
            </div>

            {profileImage && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                >
                  Remove custom photo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 sm:px-8 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-[#0F4C2E] text-[#0F4C2E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Personal & Contact Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'border-[#0F4C2E] text-[#0F4C2E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Security & Password</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 bg-white">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2.5">
              <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL & CONTACT INFO */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Username & Full Name in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    System Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username ? `@${username}` : '@unassigned'}
                      readOnly
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-700 bg-slate-100/80 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                      Locked
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Permanent login username assigned by HR.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>
              </div>

              {/* Notification Channels: Email & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Notification Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com / denr.gov.ph"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile / SMS Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="09171234567"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Position <span className="text-slate-400 font-normal">(Editable)</span>
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => {
                    const newPos = e.target.value;
                    setPosition(newPos);
                    if (!isHeadPenro && newPos.toLowerCase().includes('admin') && newPos.toLowerCase().includes('v')) {
                      setDivision('Management Services Division');
                      setSection('Admin & Finance Section');
                    }
                  }}
                  placeholder={isHeadPenro ? 'e.g. Provincial Environment and Natural Resources Officer' : 'e.g. Administrative Officer V'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {isHeadPenro ? 'Official designation appearing on Travel Order approvals.' : 'Auto-fills in Step 2 when selected.'}
                </p>
              </div>

              {/* Division & Section as Separate Fields (Not applicable for Head of PENRO) */}
              {isHeadPenro ? (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-950 flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div>
                    <span className="font-bold text-emerald-900 block">PENRO Executive Office (Head of Office)</span>
                    <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                      As the Head of PENRO and final approving authority, your mandate oversees all operations across both Management Services Division and Technical Services Division. Division and Section assignments are not applicable.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Division
                    </label>
                    <select
                      value={division}
                      onChange={(e) => {
                        const newDiv = e.target.value;
                        setDivision(newDiv);
                        if (newDiv === 'Management Services Division') {
                          setSection('Admin & Finance Section');
                        } else if (newDiv === 'Technical Services Division') {
                          setSection('Conservation and Development Section');
                        } else {
                          setSection('');
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                    >
                      <option value="">Select Division</option>
                      <option value="Management Services Division">Management Services Division</option>
                      <option value="Technical Services Division">Technical Services Division</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Section
                    </label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                    >
                      <option value="">Select Section</option>
                      {division === 'Management Services Division' ? (
                        <>
                          <option value="Admin & Finance Section">Admin & Finance Section</option>
                          <option value="Planning Section">Planning Section</option>
                        </>
                      ) : division === 'Technical Services Division' ? (
                        <>
                          <option value="Conservation and Development Section">Conservation and Development Section</option>
                          <option value="Regulation and Permitting Section">Regulation and Permitting Section</option>
                          <option value="Monitoring and Enforcement Section">Monitoring and Enforcement Section</option>
                        </>
                      ) : (
                        <>
                          <option value="Admin & Finance Section">Admin & Finance Section</option>
                          <option value="Planning Section">Planning Section</option>
                          <option value="Conservation and Development Section">Conservation and Development Section</option>
                          <option value="Regulation and Permitting Section">Regulation and Permitting Section</option>
                          <option value="Monitoring and Enforcement Section">Monitoring and Enforcement Section</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Birthday & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Birthday
                  </label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Home Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Brgy. Libertad, Butuan City"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Leave these password fields blank if you do not wish to change your current password.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPasswordCheck"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="showPasswordCheck" className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Show passwords in plain text
                </label>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || fetching}
                className="px-6 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#0F4C2E] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
