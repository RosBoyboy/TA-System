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

  const formatStatus = (rawStatus: string) => {
    switch (rawStatus) {
      case 'PENDING_SECTION_CHIEF':
        return 'Pending Section Chief';
      case 'PENDING_DIVISION_CHIEF':
        return 'Pending Division Chief';
      case 'PENDING_HEAD_PENRO':
        return 'Pending Head of PENRO';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED_MANUAL':
        return 'Returned (Manual)';
      case 'REJECTED_OVERDUE':
        return 'Rejected (Overdue)';
      default:
        return (rawStatus || '').replace(/_/g, ' ');
    }
  };

  return (
    <div className="bg-[#FFFFFF] p-5 rounded-[8px] border border-[#E5E5E7]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5E7]">
        <div>
          <h4 className="text-[14px] font-semibold text-[#1D1D1F] tracking-tight">Approval Trail Timeline</h4>
          <p className="text-[11px] text-[#86868B]">Strict 3-step sequential authorization progress</p>
        </div>

        {/* Overall Status Badge (20px height, 10px semibold, 8px horizontal padding, 4px radius) */}
        <span
          className={`h-5 inline-flex items-center px-2 text-[10px] font-semibold rounded-[4px] border ${
            status === 'APPROVED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
              : status === 'REJECTED_MANUAL'
              ? 'bg-amber-50 text-amber-700 border-amber-200/80'
              : status === 'REJECTED_OVERDUE'
              ? 'bg-rose-50 text-rose-700 border-rose-200/80'
              : 'bg-sky-50 text-sky-700 border-sky-200/80'
          }`}
        >
          {formatStatus(status)}
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-[#E5E5E7]">
        {stepsConfig.map((config) => {
          const { state, label, stepData } = getStepStatus(config.order);

          return (
            <div key={config.order} className="relative flex items-start gap-3">
              {/* Dot Icon */}
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border ${
                  state === 'APPROVED'
                    ? 'bg-[#1B4332] border-emerald-100'
                    : state === 'REJECTED'
                    ? 'bg-[#E63946] border-rose-100'
                    : 'bg-[#F5F5F7] border-[#E5E5E7] text-[#86868B]'
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
              <div className="flex-1 bg-[#F5F5F7] p-3.5 rounded-[6px] border border-[#E5E5E7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#1D1D1F]">
                    Step {config.order}: {config.title}
                  </span>
                  <span
                    className={`h-5 inline-flex items-center text-[10px] font-semibold px-2 rounded-[4px] border ${
                      state === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : state === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                        : 'bg-white text-[#86868B] border-[#E5E5E7]'
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {stepData?.approver?.name && (
                  <p className="text-[12px] text-[#86868B] font-normal mt-0.5">
                    Signatory: <strong className="font-medium text-[#1D1D1F]">{stepData.approver.name}</strong>
                    {stepData.approver.email ? ` (${stepData.approver.email})` : ''}
                  </p>
                )}

                {stepData?.actionDate && (
                  <p className="text-[11px] text-[#86868B] mt-0.5">
                    Action Date: {new Date(stepData.actionDate).toLocaleString()}
                  </p>
                )}

                {stepData?.remarks && (
                  <div className="mt-2 p-2.5 bg-[#FFFFFF] rounded-[6px] border border-[#E5E5E7] text-[12px] text-[#1D1D1F]">
                    <span className="font-semibold text-[#86868B] block text-[10px] uppercase tracking-wider mb-0.5">
                      Remarks / Reason:
                    </span>
                    &ldquo;{stepData.remarks}&rdquo;
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
