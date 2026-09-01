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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1B4332] text-white p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">File Travel Authority (TA) Request</h3>
            <p className="text-xs text-emerald-200">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white text-xl font-bold p-1">
            ✕
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[
            { s: 1, label: '1. Basic Info' },
            { s: 2, label: '2. Destination & Map' },
            { s: 3, label: '3. Team Members' },
            { s: 4, label: '4. Review & Submit' },
          ].map((item) => (
            <div
              key={item.s}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
                step === item.s
                  ? 'border-[#40916C] text-[#1B4332] bg-emerald-50/50'
                  : step > item.s
                  ? 'border-emerald-300 text-emerald-800'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Purpose of Travel *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g. Conduct field verification and boundary delineation in Sector 4"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#40916C] outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Travel Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#40916C] outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Travel End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#40916C] outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Destination Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="e.g. Brgy. San Jose, Sector 3 Reserve Area"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#40916C] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Interactive Leaflet Destination Location Picker (Drag pin or click map)
                </label>
                <DynamicMapPicker
                  initialLat={formData.destinationLat}
                  initialLng={formData.destinationLng}
                  onLocationSelect={(lat, lng) =>
                    setFormData((prev) => ({ ...prev, destinationLat: lat, destinationLng: lng }))
                  }
                />
                <div className="mt-2 text-xs text-gray-500 font-mono">
                  Coordinates: Lat {formData.destinationLat.toFixed(5)}, Lng {formData.destinationLng.toFixed(5)}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Add team members traveling together. All team members are treated equally (no designated lead).
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Member Name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="Position / Designation"
                  value={newMemberPosition}
                  onChange={(e) => setNewMemberPosition(e.target.value)}
                  className="w-40 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="px-4 py-2 bg-[#40916C] hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                >
                  + Add
                </button>
              </div>

              {formData.teamMembers.length > 0 ? (
                <div className="space-y-2 mt-4">
                  {formData.teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs"
                    >
                      <div>
                        <span className="font-bold text-gray-900">{member.name}</span>
                        <span className="ml-2 text-gray-500">({member.position})</span>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(idx)}
                        className="text-rose-600 hover:text-rose-800 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-300 text-center text-xs text-gray-500 rounded-xl">
                  No additional team members added. (Filing as solo travel).
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Confirm TA Request Summary</h4>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                  <span className="text-gray-500 block">Purpose:</span>
                  <span className="font-bold text-gray-900">{formData.purpose}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                  <span className="text-gray-500 block">Destination:</span>
                  <span className="font-bold text-gray-900">{formData.destination}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                  <span className="text-gray-500 block">Travel Period:</span>
                  <span className="font-bold text-gray-900">
                    {formData.startDate} to {formData.endDate}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                  <span className="text-gray-500 block">Team Members:</span>
                  <span className="font-bold text-gray-900">
                    {formData.teamMembers.length > 0
                      ? `${formData.teamMembers.length} member(s)`
                      : 'Solo Travel'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                ⚡ Upon submission, this request will enter <strong>PENDING_SECTION_CHIEF</strong> status and be routed to the Section Chief for Step 1 approval.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            disabled={step === 1 || loading}
            onClick={handleBack}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-30"
          >
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-[#1B4332] hover:bg-[#40916C] text-white rounded-xl text-xs font-semibold"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 py-2 bg-[#40916C] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
            >
              {loading ? 'Submitting TA Request...' : 'Submit TA Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
