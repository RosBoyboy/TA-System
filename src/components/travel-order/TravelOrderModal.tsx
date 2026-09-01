'use client';

import React, { useRef } from 'react';
import { TARequestDTO } from '@/types';
import { formatDateDisplay, formatFullDateTimeDisplay, parseUtcDate } from '@/lib/date';

interface TravelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: TARequestDTO | null;
}

export default function TravelOrderModal({ isOpen, onClose, request }: TravelOrderModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !request) return null;

  // Single source of truth for employee name from Step 2
  const employeeName = request.createdBy?.name || 'Juan Dela Cruz';
  const employeePosition = (request.createdBy as any)?.position || 'Administrative Officer V';
  const employeeSection = request.createdBy?.section || 'Technical Services Division';
  const trackingNo = request.trackingNumber ? request.trackingNumber.replace('TA-', 'TO-') : 'TO-2026-0001';

  const formatDocDate = (d?: string | Date | null) => {
    const obj = parseUtcDate(d);
    if (!obj) return 'N/A';
    return obj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (d?: string | Date | null) => {
    const obj = parseUtcDate(d);
    if (!obj) return 'N/A';
    return obj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const dateFiled = formatDocDate(request.createdAt);
  const departureDate = formatShortDate(request.startDate);
  const arrivalDate = formatShortDate(request.endDate);

  // Approval step records
  const step2 = request.approvalSteps?.find((s: any) => s.order === 2);
  const step3 = request.approvalSteps?.find((s: any) => s.order === 3);

  const divChiefName = "DIVISION CHIEF's name";
  const divChiefPosition = (step2?.approver as any)?.position || 'Chief, Technical Services Division';

  const penroName = "HEAD OF PENRO's name";
  const penroPosition = (step3?.approver as any)?.position || 'OIC, PENR Officer';
  const dateApproved = formatDocDate(step3?.actionDate || request.updatedAt || request.createdAt);

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      alert('Please allow popups to print the Travel Order.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Travel Order - ${trackingNo}</title>
          <style>
            @page {
              size: letter portrait;
              margin: 10mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
              color: #000;
              background: #fff;
              font-size: 10.5pt;
              line-height: 1.35;
              padding: 10px;
            }
            .header-container {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .header-logo {
              width: 65px;
              height: 65px;
              object-fit: contain;
            }
            .header-text {
              text-align: center;
              flex: 1;
              padding: 0 10px;
            }
            .header-text h3 {
              font-size: 9.5pt;
              font-weight: normal;
            }
            .header-text h2 {
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            .header-text h4 {
              font-size: 9.5pt;
              font-weight: 600;
            }
            .doc-title {
              text-align: center;
              font-size: 15pt;
              font-weight: bold;
              letter-spacing: 1px;
              margin-top: 4px;
            }
            .doc-number {
              text-align: center;
              font-size: 11pt;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .date-filed {
              text-align: right;
              font-size: 10pt;
              font-weight: bold;
              margin-bottom: 6px;
            }
            table.form-grid {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            table.form-grid td {
              border: 1px solid #000;
              padding: 4px 6px;
              font-size: 10pt;
              vertical-align: top;
            }
            .lbl {
              font-weight: bold;
              width: 18%;
              background-color: #fafafa;
            }
            .val {
              width: 32%;
            }
            .section-block {
              margin-bottom: 6px;
              font-size: 10pt;
            }
            .section-block strong {
              display: inline-block;
              min-width: 140px;
            }
            .purpose-box {
              margin: 4px 0 6px 0;
              padding: 6px 8px;
              border: 1px dashed #777;
              background-color: #fcfcfc;
              font-size: 10pt;
            }
            .cert-heading {
              text-align: center;
              font-weight: bold;
              font-size: 11pt;
              margin: 10px 0 3px 0;
              text-decoration: underline;
            }
            .cert-text {
              text-align: center;
              font-size: 9.5pt;
              margin-bottom: 8px;
              padding: 0 16px;
            }
            table.sig-grid {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0 4px 0;
            }
            table.sig-grid td {
              width: 50%;
              vertical-align: top;
              padding: 0 14px;
              text-align: center;
            }
            .sig-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
              min-height: 60px;
              width: 100%;
              max-width: 280px;
              margin: 0 auto;
            }
            .sig-img {
              height: 56px;
              max-width: 190px;
              object-fit: contain;
              margin-bottom: -18px;
              display: block;
              position: relative;
              z-index: 2;
              mix-blend-mode: multiply;
              background: transparent !important;
              pointer-events: none;
            }
            .sig-line {
              width: 100%;
              border-top: 1px solid #000;
              padding-top: 3px;
              position: relative;
              z-index: 1;
            }
            .sig-name {
              font-weight: bold;
              font-size: 10.5pt;
              text-transform: uppercase;
            }
            .sig-pos {
              font-size: 9pt;
              color: #333;
              margin-top: 1px;
            }
            .auth-heading {
              text-align: center;
              font-weight: bold;
              font-size: 11pt;
              margin: 10px 0 3px 0;
              text-decoration: underline;
            }
            .auth-text {
              font-size: 8.5pt;
              text-align: justify;
              line-height: 1.3;
              margin-bottom: 8px;
            }
            .emp-auth-box {
              text-align: center;
              margin: 6px auto;
              max-width: 280px;
            }
            .footer-notice {
              border-top: 1px solid #777;
              margin-top: 8px;
              padding-top: 4px;
              text-align: center;
              font-size: 8pt;
              font-style: italic;
              color: #444;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 border border-slate-200">
        {/* Top Control Bar (Exclusively Print/Save PDF & Close) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📄</span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Official Travel Order (Approved)
              </h3>
              <p className="text-sm font-extrabold text-white font-mono">{trackingNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              title="Print document or save as PDF"
            >
              <span>🖨️</span>
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-1"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Document Sheet Preview */}
        <div className="p-6 sm:p-10 bg-slate-100/70 overflow-y-auto max-h-[78vh] flex justify-center">
          <div
            ref={printAreaRef}
            className="bg-white w-full max-w-[780px] p-8 sm:p-12 shadow-md rounded-lg border border-slate-300/80 text-black text-[13px] leading-snug space-y-3"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* 1. Header with Logos */}
            <div className="header-container flex items-center justify-between border-b-2 border-black pb-2.5 mb-3">
              <img
                src="/template_media/image4.png"
                alt="DENR Logo"
                className="header-logo w-16 h-16 object-contain shrink-0"
              />
              <div className="header-text text-center flex-1 px-3">
                <h3 className="text-[11px] font-normal tracking-wide">Republic of the Philippines</h3>
                <h2 className="text-[13px] font-bold uppercase tracking-wide">
                  Department of Environment and Natural Resources
                </h2>
                <h4 className="text-[11px] font-semibold text-slate-800">
                  Provincial Environment and Natural Resources Office - Agusan del Norte
                </h4>
              </div>
              <img
                src="/template_media/image5.jpeg"
                alt="Bagong Pilipinas"
                className="header-logo w-16 h-16 object-contain shrink-0"
              />
            </div>

            {/* 2. Document Title & Numbers */}
            <div className="text-center pt-1">
              <h1 className="doc-title text-xl font-bold tracking-wider">TRAVEL ORDER</h1>
              <p className="doc-number text-xs font-bold text-slate-900 mt-0.5">({trackingNo})</p>
            </div>
            <div className="date-filed text-right text-xs font-bold pb-1">
              DF: <span className="font-semibold">{dateFiled}</span>
            </div>

            {/* 3. Table 1: Employee & Schedule Grid */}
            <table className="form-grid w-full border-collapse border border-black text-xs">
              <tbody>
                <tr>
                  <td className="lbl border border-black p-1.5 font-bold bg-slate-50/70 w-[20%]">Name:</td>
                  <td className="val border border-black p-1.5 font-bold w-[30%] text-[#0F4C2E]">{employeeName}</td>
                  <td className="lbl border border-black p-1.5 font-bold bg-slate-50/70 w-[20%]">Salary:</td>
                  <td className="val border border-black p-1.5 w-[30%]">SG-18 / ₱46,725.00</td>
                </tr>
                <tr>
                  <td className="lbl border border-black p-1.5 font-bold bg-slate-50/70">Position:</td>
                  <td className="val border border-black p-1.5">{employeePosition}</td>
                  <td className="lbl border border-black p-1.5 font-bold bg-slate-50/70">Div./Sec./Unit:</td>
                  <td className="val border border-black p-1.5">{employeeSection}</td>
                </tr>
                <tr>
                  <td className="lbl border border-black p-1.5 font-bold bg-slate-50/70">Departure Date:</td>
                  <td className="val border border-black p-1.5 font-semibold">{departureDate}</td>
                  <td className="lbl border border-black p-1.5 font-bold bg-slate-50/70">Official Station:</td>
                  <td className="val border border-black p-1.5">PENRO Agusan del Norte</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 bg-slate-50/30"></td>
                  <td className="border border-black p-1.5"></td>
                  <td className="lbl border border-black p-1.5 font-bold bg-slate-50/70">Arrival Date:</td>
                  <td className="val border border-black p-1.5 font-semibold">{arrivalDate}</td>
                </tr>
              </tbody>
            </table>

            {/* 4. Travel Details */}
            <div className="space-y-1.5 pt-1 text-xs">
              <p className="section-block">
                <strong className="font-bold">Destination:</strong> <span className="font-semibold text-slate-900">{request.destination}</span>
              </p>
              <div>
                <strong className="font-bold block mb-1">Purpose of Travel:</strong>
                <div className="purpose-box p-2.5 border border-dashed border-slate-400 bg-slate-50/50 rounded-sm text-slate-800 leading-relaxed font-normal">
                  {request.purpose}
                </div>
              </div>
              <p className="section-block text-[11.5px]">
                <strong className="font-bold">Per Diems/Expense Allowed:</strong> Official Business / Actual Expenses Allowed subject to availability of funds
              </p>
              <p className="section-block text-[11.5px]">
                <strong className="font-bold">Company/Assistant/Laborers:</strong>{' '}
                {request.teamMembers && request.teamMembers.length > 0
                  ? request.teamMembers.map((m: any) => m.name).join(', ')
                  : 'None'}
              </p>
              <p className="section-block text-[11.5px]">
                <strong className="font-bold">Appropriations:</strong> PENRO Agusan del Norte Regular Funds / Traveling Expenses (50201010-00)
              </p>
              <p className="section-block text-[11.5px]">
                <strong className="font-bold">Remarks / Special Instructions:</strong> Submit Certificate of Appearance and Travel Report upon completion of travel.
              </p>
            </div>

            {/* 5. Certification & Signatures */}
            <div className="pt-2">
              <h3 className="cert-heading text-center font-bold text-xs uppercase underline tracking-wide mb-1">
                CERTIFICATION
              </h3>
              <p className="cert-text text-center text-[11px] text-slate-700 mb-2 px-4 italic">
                This is to certify that the travel is necessary and is connected with the functions of the official/employee and this Div/Sec./Units.
              </p>

              <table className="sig-grid w-full text-center mt-1">
                <tbody>
                  <tr>
                    <td className="w-1/2 align-top px-4">
                      <div className="text-[11px] font-bold text-left mb-1">Recommending Approval:</div>
                      <div className="sig-container flex flex-col items-center justify-end min-h-[64px] max-w-[260px] mx-auto">
                        <img
                          src="/signatures/signature_div_chief.png"
                          alt="Division Chief Signature"
                          className="sig-img h-14 max-w-[190px] object-contain -mb-5 relative z-10 pointer-events-none"
                          style={{ mixBlendMode: 'multiply', background: 'transparent' }}
                        />
                        <div className="sig-line w-full border-t border-black pt-1 relative z-0">
                          <div className="sig-name font-bold text-xs uppercase">{divChiefName}</div>
                          <div className="sig-pos text-[10.5px] text-slate-600 mt-0.5">{divChiefPosition}</div>
                        </div>
                      </div>
                    </td>
                    <td className="w-1/2 align-top px-4">
                      <div className="text-[11px] font-bold text-left mb-1">Approved by:</div>
                      <div className="sig-container flex flex-col items-center justify-end min-h-[64px] max-w-[260px] mx-auto">
                        <img
                          src="/signatures/signature_penro.png"
                          alt="Head of PENRO Signature"
                          className="sig-img h-14 max-w-[190px] object-contain -mb-5 relative z-10 pointer-events-none"
                          style={{ mixBlendMode: 'multiply', background: 'transparent' }}
                        />
                        <div className="sig-line w-full border-t border-black pt-1 relative z-0">
                          <div className="sig-name font-bold text-xs uppercase">{penroName}</div>
                          <div className="sig-pos text-[10.5px] text-slate-600 mt-0.5">{penroPosition}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-right text-xs font-bold mt-1 pr-4">
                DA: <span className="font-semibold">{dateApproved}</span>
              </div>
            </div>

            {/* 6. Authorization Section */}
            <div className="pt-2 border-t border-slate-300">
              <h3 className="auth-heading text-center font-bold text-xs uppercase underline tracking-wide mb-1">
                AUTHORIZATION
              </h3>
              <p className="auth-text text-[10px] text-justify text-slate-700 leading-normal mb-2">
                I hereby authorize the accountant to deduct the corresponding amount of the unliquidated cash advance from my succeeding salary for my failure to liquidate this travel within the prescribed thirty-day period upon return to my permanent official station pursuant to item 5.1.3 COA Circular 97-002 dated February 10, 1997, and Sec. 16 EO No. 248 dated May 29, 1995.
              </p>

              <div className="emp-auth-box text-center max-w-xs mx-auto">
                <div className="sig-container flex flex-col items-center justify-end min-h-[64px] max-w-[260px] mx-auto">
                  <img
                    src="/signatures/signature_employee.png"
                    alt="Employee Signature"
                    className="sig-img h-14 max-w-[190px] object-contain -mb-5 relative z-10 pointer-events-none"
                    style={{ mixBlendMode: 'multiply', background: 'transparent' }}
                  />
                  <div className="sig-line w-full border-t border-black pt-1 relative z-0">
                    <div className="sig-name font-bold text-xs uppercase">{employeeName.toUpperCase()}</div>
                    <div className="sig-pos text-[10.5px] text-slate-600 mt-0.5">{employeePosition}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Electronic Notice Footer */}
            <div className="footer-notice border-t border-slate-300 pt-2 text-center text-[10px] italic text-slate-500">
              This is an official travel order approved electronically and generated from the Enhanced Travel Authority Processing System (ETAPS). No original signature is required.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
