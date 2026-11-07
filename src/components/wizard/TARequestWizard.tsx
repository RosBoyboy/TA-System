'use client';

import React, { useState } from 'react';
import DynamicMapPicker from '../map/DynamicMapPicker';

interface TARequestWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TARequestWizard({ isOpen, onClose, onSuccess }: TARequestWizardProps) {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    purpose: '',
    destination: '',
    destinationLat: 13.0,
    destinationLng: 122.0,
    startDate: '',
    endDate: '',
    teamMembers: [] as { name: string; position: string }[],
  });

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPosition, setNewMemberPosition] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.purpose || !formData.startDate || !formData.endDate) {
        setError('Please fill in purpose, start date, and end date.');
        return;
      }
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setError('End date must be after or equal to start date.');
        return;
      }
    } else if (step === 2) {
      if (!formData.destination) {
        setError('Please enter a destination name.');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        { name: newMemberName.trim(), position: newMemberPosition.trim() || 'Personnel' },
      ],
    }));
    setNewMemberName('');
    setNewMemberPosition('');
  };

  const handleRemoveMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ta-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: formData.purpose,
          destination: formData.destination,
          destinationLat: formData.destinationLat,
          destinationLng: formData.destinationLng,
          startDate: formData.startDate,
          endDate: formData.endDate,
          teamMembers: formData.teamMembers,
          submitImmediately: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to submit TA Request.');
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-[10px] shadow-2xl border border-[#E5E5E7] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1B4332] text-white px-5 h-[52px] border-b border-emerald-900 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-white leading-tight">File Travel Authority (TA) Request</h3>
            <p className="text-[11px] text-emerald-200">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-[6px] text-emerald-200 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm font-semibold">
            ✕
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="flex border-b border-[#E5E5E7] bg-slate-50">
          {[
            { s: 1, label: '1. Basic Info' },
            { s: 2, label: '2. Destination & Map' },
            { s: 3, label: '3. Team Members' },
            { s: 4, label: '4. Review & Submit' },
          ].map((item) => (
            <div
              key={item.s}
              className={`flex-1 py-2.5 text-center text-[11px] font-semibold transition-colors border-b-2 ${
                step === item.s
                  ? 'border-[#40916C] text-[#1B4332] bg-emerald-50/70'
                  : step > item.s
                  ? 'border-emerald-300 text-emerald-800'
                  : 'border-transparent text-[#86868B]'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-[6px] font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">
                  Purpose of Travel *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g. Conduct field verification and boundary delineation in Sector 4"
                  className="w-full px-2.5 py-2 bg-white border border-[#E5E5E7] rounded-[6px] focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none text-[13px] text-[#1D1D1F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">
                    Travel Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-[#E5E5E7] rounded-[6px] focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none text-[13px] text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">
                    Travel End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-[#E5E5E7] rounded-[6px] focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none text-[13px] text-[#1D1D1F]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">
                  Destination Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="e.g. Brgy. San Jose, Sector 3 Reserve Area"
                  className="w-full h-8 px-2.5 bg-white border border-[#E5E5E7] rounded-[6px] focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none text-[13px] text-[#1D1D1F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">
                  Interactive Leaflet Destination Location Picker (Drag pin or click map)
                </label>
                <DynamicMapPicker
                  initialLat={formData.destinationLat}
                  initialLng={formData.destinationLng}
                  onLocationSelect={(lat, lng) =>
                    setFormData((prev) => ({ ...prev, destinationLat: lat, destinationLng: lng }))
                  }
                />
                <div className="mt-2 text-[11px] text-[#86868B] font-mono">
                  Coordinates: Lat {formData.destinationLat.toFixed(5)}, Lng {formData.destinationLng.toFixed(5)}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[12px] text-[#86868B]">
                Add team members traveling together. All team members are treated equally (no designated lead).
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Member Name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 h-8 px-2.5 bg-white border border-[#E5E5E7] rounded-[6px] text-[13px] text-[#1D1D1F]"
                />
                <input
                  type="text"
                  placeholder="Position"
                  value={newMemberPosition}
                  onChange={(e) => setNewMemberPosition(e.target.value)}
                  className="w-40 h-8 px-2.5 bg-white border border-[#E5E5E7] rounded-[6px] text-[13px] text-[#1D1D1F]"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="h-8 px-[14px] bg-[#1B4332] hover:bg-[#143225] text-white rounded-[6px] text-[13px] font-medium"
                >
                  + Add
                </button>
              </div>

              {formData.teamMembers.length > 0 ? (
                <div className="space-y-2 mt-4">
                  {formData.teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7] text-[13px]"
                    >
                      <div>
                        <span className="font-semibold text-[#1D1D1F]">{member.name}</span>
                        <span className="ml-2 text-[#86868B]">({member.position})</span>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(idx)}
                        className="text-red-600 hover:text-red-700 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[#F5F5F7] border border-dashed border-[#E5E5E7] text-center text-[12px] text-[#86868B] rounded-[6px]">
                  No additional team members added. (Filing as solo travel).
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h4 className="text-[14px] font-semibold text-[#1D1D1F] border-b border-[#E5E5E7] pb-2">Confirm TA Request Summary</h4>

              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                  <span className="text-[#86868B] block">Purpose:</span>
                  <span className="font-semibold text-[#1D1D1F]">{formData.purpose}</span>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                  <span className="text-[#86868B] block">Destination:</span>
                  <span className="font-semibold text-[#1D1D1F]">{formData.destination}</span>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                  <span className="text-[#86868B] block">Travel Period:</span>
                  <span className="font-semibold text-[#1D1D1F]">
                    {formData.startDate} to {formData.endDate}
                  </span>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                  <span className="text-[#86868B] block">Team Members:</span>
                  <span className="font-semibold text-[#1D1D1F]">
                    {formData.teamMembers.length > 0
                      ? `${formData.teamMembers.length} member(s)`
                      : 'Solo Travel'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] text-[12px] text-amber-900">
                Upon submission, this request will enter <strong>PENDING_SECTION_CHIEF</strong> status and be routed to the Section Chief for Step 1 approval.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#F5F5F7] border-t border-[#E5E5E7] flex justify-between">
          <button
            type="button"
            disabled={step === 1 || loading}
            onClick={handleBack}
            className="h-8 px-[14px] bg-white border border-[#E5E5E7] rounded-[6px] text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F2F2F7] disabled:opacity-40"
          >
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="h-8 px-[14px] bg-[#1B4332] hover:bg-[#143225] text-white rounded-[6px] text-[13px] font-medium"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="h-8 px-[14px] bg-[#1B4332] hover:bg-[#143225] text-white rounded-[6px] text-[13px] font-medium disabled:opacity-50"
            >
              {loading ? 'Submitting TA Request...' : 'Submit TA Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
