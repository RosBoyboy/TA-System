'use client';

import React from 'react';
import { ApprovalStepDTO, TARequestStatus } from '@/types';

interface ApprovalTrailProps {
  status: TARequestStatus;
  approvalSteps?: ApprovalStepDTO[];
}

export default function ApprovalTrail({ status, approvalSteps = [] }: ApprovalTrailProps) {
  const stepsConfig = [
    { order: 1, title: 'Section Chief', role: 'SECTION_CHIEF' },
    { order: 2, title: 'Division Chief', role: 'DIVISION_CHIEF' },
    { order: 3, title: 'Head of PENRO', role: 'HEAD_PENRO' },
  ];

  const getStepStatus = (order: number) => {
    const step = approvalSteps.find((s) => s.order === order);
    if (!step) return { state: 'PENDING', label: 'Pending', stepData: null };

    if (step.action === 'APPROVED') {
      return { state: 'APPROVED', label: 'Approved', stepData: step };
    }
    if (step.action === 'REJECTED') {
      return { state: 'REJECTED', label: 'Rejected', stepData: step };
    }
    return { state: 'PENDING', label: 'Pending', stepData: step };
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Approval Trail Timeline</h4>
          <p className="text-xs text-gray-500">Strict 3-step sequential authorization progress</p>
        </div>

        {/* Overall Status Badge */}
        <span
          className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${
            status === 'APPROVED'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : status === 'REJECTED_MANUAL'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : status === 'REJECTED_OVERDUE'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-sky-50 text-sky-800 border-sky-300'
          }`}
        >
          {status.replace('_', ' ')}
        </span>
      </div>

      <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
        {stepsConfig.map((config) => {
          const { state, label, stepData } = getStepStatus(config.order);

          return (
            <div key={config.order} className="relative flex items-start gap-4">
              {/* Dot Icon */}
              <div
                className={`absolute -left-6 top-0 w-6.5 h-6.5 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm border-2 ${
                  state === 'APPROVED'
                    ? 'bg-[#40916C] border-emerald-100'
                    : state === 'REJECTED'
                    ? 'bg-[#E63946] border-rose-100'
                    : 'bg-gray-300 border-gray-100 text-gray-600'
                }`}
              >
                {state === 'APPROVED' ? (
                  '✓'
                ) : state === 'REJECTED' ? (
                  '✕'
                ) : (
                  config.order
                )}
              </div>

              {/* Step Info Box */}
              <div className="flex-1 bg-gray-50/80 p-4 rounded-xl border border-gray-200/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Step {config.order}: {config.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      state === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : state === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {stepData?.approver && (
                  <p className="text-xs text-gray-600 font-medium mt-1">
                    Signatory: <strong className="text-gray-900">{stepData.approver.name}</strong> ({stepData.approver.email})
                  </p>
                )}

                {stepData?.actionDate && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Action Date: {new Date(stepData.actionDate).toLocaleString()}
                  </p>
                )}

                {stepData?.remarks && (
                  <div className="mt-2.5 p-2.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-700">
                    <span className="font-semibold text-gray-900 block text-[11px] uppercase tracking-wider mb-0.5">
                      Remarks / Reason:
                    </span>
                    "{stepData.remarks}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
