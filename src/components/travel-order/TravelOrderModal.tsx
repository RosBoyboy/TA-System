'use client';

import React, { useRef, useEffect } from 'react';
import { TARequestDTO } from '@/types';
import { parseUtcDate } from '@/lib/date';

interface TravelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: TARequestDTO | null;
}

export default function TravelOrderModal({ isOpen, onClose, request }: TravelOrderModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top whenever the modal opens or a new request is shown
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  const employeeName = request.createdBy?.name || 'Juan Dela Cruz';
  const employeePosition = (request.createdBy as any)?.position || 'Administrative Officer V';
  const employeeSection = request.createdBy?.section || 'Technical Services Division';
  const trackingNo = request.trackingNumber ? request.trackingNumber.replace('TA-', 'TO-') : 'TO-2026-0001';
  const employeeSignatureSrc = (request.createdBy as any)?.signatureUrl
    ? `/api/signatures/${request.createdById}`
    : '/signatures/signature_employee.png';

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

  const step2 = request.approvalSteps?.find((s: any) => s.order === 2);
  const step3 = request.approvalSteps?.find((s: any) => s.order === 3);

  const employeeDivision = request.createdBy?.division;
  const isMSD = employeeDivision?.toLowerCase().includes('management');
  const defaultDivTitle = isMSD ? 'Chief, Management Services Division' : 'Chief, Technical Services Division';

  const divChiefName = step2?.approver?.name || "DIVISION CHIEF's name";
  const divChiefPosition = (step2?.approver as any)?.position || defaultDivTitle;

  const penroName = step3?.approver?.name || "HEAD OF PENRO's name";
  const penroPosition = (step3?.approver as any)?.position || 'Provincial Environment and Natural Resources Officer';
  const dateApproved = formatDocDate(step3?.actionDate || request.updatedAt || request.createdAt);

  const handlePrint = () => {
    if (!printAreaRef.current) return;

    const CLONE_ID  = 'tops-print-clone';
    const STYLE_ID  = 'tops-print-style';

    // ── Clean up any leftovers from a rapid double-click ──────────────────
    document.getElementById(CLONE_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();

    // ── Clone the rendered travel-order node ──────────────────────────────
    // Cloning the live DOM means all images are already loaded and all
    // React-rendered content is captured without a second render pass.
    const clone = printAreaRef.current.cloneNode(true) as HTMLElement;
    clone.id = CLONE_ID;

    // Override only the layout-breaking inline styles; keep typography.
    // maxWidth: 780px would constrain width on paper — remove it.
    // boxShadow is visual-only — remove it.
    clone.style.maxWidth  = '100%';
    clone.style.width     = '100%';
    clone.style.boxShadow = 'none';
    clone.style.padding   = '0';   // @page margin handles outer spacing
    clone.style.margin    = '0';

    // Append as a DIRECT body child — completely outside the modal tree,
    // so no flex columns, overflow:hidden, or max-height can interfere.
    document.body.appendChild(clone);

    // ── Inject @media print stylesheet ───────────────────────────────────
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 12mm 15mm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }

        /* Hide EVERYTHING that is not the print clone.
           display:none actually removes layout space — unlike visibility:hidden
           which kept the sidebar occupying its column width. */
        body > *:not(#${CLONE_ID}) {
          display: none !important;
        }

        /* Show the clone cleanly */
        #${CLONE_ID} {
          display: block !important;
          position: static !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          background: white !important;
          overflow: visible !important;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        /* Keep certification / authorization blocks together */
        #${CLONE_ID} [class*="cert"],
        #${CLONE_ID} [class*="auth"],
        #${CLONE_ID} [class*="sig"] {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `;
    document.head.appendChild(style);

    // ── Clean up after the print dialog closes ────────────────────────────
    const cleanup = () => {
      document.getElementById(CLONE_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
  };




  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl max-h-[90dvh] min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 my-4 mx-auto">

        {/* â”€â”€ Top Control Bar â”€â”€ */}
        <div className="z-10 shrink-0 bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
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
              <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* â”€â”€ Document Sheet Preview â”€â”€ */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-100/70 p-6 sm:p-8 flex flex-col items-center">
          <div
            ref={printAreaRef}
            id="tops-to-print-area"
            className="bg-white w-full text-black"
            style={{
              maxWidth: '780px',
              padding: '36px 44px 40px 44px',
              fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
              fontSize: '12px',
              lineHeight: '1.45',
              boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
            }}
          >
            {/* 1. Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2.5px solid #000',
              paddingBottom: '10px',
              marginBottom: '10px',
            }}>
              <img
                src="/Tops-golo.png"
                alt="TOPS Logo"
                style={{ width: '68px', height: '68px', objectFit: 'contain', flexShrink: 0 }}
              />
              <div style={{ textAlign: 'center', flex: 1, padding: '0 14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'normal' }}>Republic of the Philippines</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.3', marginTop: '1px' }}>
                  Department of Environment and Natural Resources
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: '600', marginTop: '2px' }}>
                  Provincial Environment and Natural Resources Office &ndash; Agusan del Norte
                </div>
              </div>
              <img
                src="/template_media/image5.jpeg"
                alt="Bagong Pilipinas"
                style={{ width: '68px', height: '68px', objectFit: 'contain', flexShrink: 0 }}
              />
            </div>

            {/* 2. Document Title */}
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>TRAVEL ORDER</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#111', marginTop: '2px' }}>({trackingNo})</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10px', fontWeight: 'bold', marginBottom: '10px' }}>
              DF: <span style={{ fontWeight: 'normal' }}>{dateFiled}</span>
            </div>

            {/* 3. Employee & Schedule Grid */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '20%' }}>Name:</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: 'bold', color: '#0F4C2E', width: '30%' }}>{employeeName}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '20%' }}>Salary:</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', width: '30%' }}>SG-18 / &#8369;46,725.00</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Position:</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px' }}>{employeePosition}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Div./Sec./Unit:</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px' }}>{employeeSection}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Departure Date:</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: '600' }}>{departureDate}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Official Station:</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px' }}>PENRO Agusan del Norte</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', backgroundColor: '#f5f5f5' }}></td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px' }}></td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Arrival Date:</td>
                  <td style={{ border: '1px solid #000', padding: '4px 7px', fontWeight: '600' }}>{arrivalDate}</td>
                </tr>
              </tbody>
            </table>

            {/* 4. Destination */}
            <div style={{ marginBottom: '7px', fontSize: '11px' }}>
              <span style={{ fontWeight: 'bold' }}>Destination:</span>{' '}
              <span style={{ wordBreak: 'break-word' }}>{request.destination}</span>
            </div>

            {/* 5. Purpose of Travel */}
            <div style={{ marginBottom: '8px', fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Purpose of Travel:</div>
              <div style={{
                padding: '6px 9px',
                border: '1px solid #ccc',
                backgroundColor: '#fafafa',
                lineHeight: '1.55',
                wordBreak: 'break-word',
              }}>
                {request.purpose}
              </div>
            </div>

            {/* 6. Additional Travel Information */}
            <div style={{ fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold' }}>Per Diems/Expense Allowed:</span>{' '}
              Official Business / Actual Expenses Allowed subject to availability of funds
            </div>
            <div style={{ fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold' }}>Company/Assistant/Laborers:</span>{' '}
              {request.teamMembers && request.teamMembers.length > 0
                ? request.teamMembers.map((m: any) => m.name).join(', ')
                : 'None'}
            </div>
            <div style={{ fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold' }}>Appropriations:</span>{' '}
              PENRO Agusan del Norte Regular Funds / Traveling Expenses (50201010-00)
            </div>
            <div style={{ fontSize: '11px', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold' }}>Remarks / Special Instructions:</span>{' '}
              Submit Certificate of Appearance and Travel Report upon completion of travel.
            </div>

            {/* 7. Certification */}
            <div>
              <div style={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '12px',
                textDecoration: 'underline',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: '4px 0 5px 0',
              }}>
                CERTIFICATION
              </div>
              <div style={{
                textAlign: 'center',
                fontSize: '10.5px',
                fontStyle: 'italic',
                color: '#333',
                marginBottom: '12px',
                padding: '0 20px',
              }}>
                This is to certify that the travel is necessary and is connected with the functions of the official/employee and this Div/Sec./Units.
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '20px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 'bold', marginBottom: '4px' }}>Recommending Approval:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '240px' }}>
                        <img
                          src="/signatures/signature_div_chief.png"
                          alt="Division Chief Signature"
                          style={{
                            height: '52px', maxWidth: '180px', objectFit: 'contain',
                            display: 'block', marginBottom: '-16px',
                            position: 'relative', zIndex: 2, mixBlendMode: 'multiply',
                          }}
                        />
                        <div style={{ width: '100%', borderTop: '1px solid #000', paddingTop: '3px', position: 'relative', zIndex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>{divChiefName}</div>
                          <div style={{ fontSize: '10px', color: '#333', marginTop: '1px', textAlign: 'center' }}>{divChiefPosition}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '20px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 'bold', marginBottom: '4px' }}>Approved by:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '240px' }}>
                        <img
                          src="/signatures/signature_penro.png"
                          alt="Head of PENRO Signature"
                          style={{
                            height: '52px', maxWidth: '180px', objectFit: 'contain',
                            display: 'block', marginBottom: '-16px',
                            position: 'relative', zIndex: 2, mixBlendMode: 'multiply',
                          }}
                        />
                        <div style={{ width: '100%', borderTop: '1px solid #000', paddingTop: '3px', position: 'relative', zIndex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>{penroName}</div>
                          <div style={{ fontSize: '10px', color: '#333', marginTop: '1px', textAlign: 'center' }}>{penroPosition}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: 'right', fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>
                DA: <span style={{ fontWeight: 'normal' }}>{dateApproved}</span>
              </div>
            </div>

            {/* 8. Authorization */}
            <div style={{ borderTop: '1px solid #bbb', marginTop: '12px', paddingTop: '10px' }}>
              <div style={{
                textAlign: 'center', fontWeight: 'bold', fontSize: '12px',
                textDecoration: 'underline', textTransform: 'uppercase',
                letterSpacing: '1px', marginBottom: '6px',
              }}>
                AUTHORIZATION
              </div>
              <div style={{
                fontSize: '10px', textAlign: 'justify',
                lineHeight: '1.5', marginBottom: '12px', color: '#222',
              }}>
                I hereby authorize the accountant to deduct the corresponding amount of the unliquidated cash advance from my succeeding salary for my failure to liquidate this travel within the prescribed thirty-day period upon return to my permanent official station pursuant to item 5.1.3 COA Circular 97-002 dated February 10, 1997, and Sec. 16 EO No. 248 dated May 29, 1995.
              </div>
              <div style={{ textAlign: 'center', maxWidth: '280px', margin: '0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img
                    src={employeeSignatureSrc}
                    alt="Employee Signature"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/signatures/signature_employee.png';
                    }}
                    style={{
                      height: '52px',
                      maxWidth: '180px',
                      objectFit: 'contain',
                      display: 'block',
                      marginBottom: '-16px',
                      position: 'relative',
                      zIndex: 2,
                      mixBlendMode: 'multiply',
                      background: 'transparent',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ width: '100%', borderTop: '1px solid #000', paddingTop: '3px', position: 'relative', zIndex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>{employeeName.toUpperCase()}</div>
                    <div style={{ fontSize: '10px', color: '#333', marginTop: '1px' }}>{employeePosition}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 9. Footer */}
            <div style={{
              borderTop: '1px solid #bbb', marginTop: '14px', paddingTop: '5px',
              textAlign: 'center', fontSize: '9px', fontStyle: 'italic', color: '#666',
            }}>
              This is an official travel order approved electronically and generated from the Travel Order Processing System (TOPS). No original signature is required.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
