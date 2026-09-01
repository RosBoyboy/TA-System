/**
 * Export and Reporting Utilities for ETAPS
 * Provides CSV/Excel and Printable Official PDF Reports for Travel Authorities
 */

import { TARequestDTO } from '@/types';
import { formatDateDisplay, formatDateRangeShort, formatFullDateTimeDisplay } from '@/lib/date';

/**
 * Exports processed requests to a UTF-8 BOM encoded CSV file (Excel-ready).
 */
export function exportApprovalHistoryToCSV(
  requests: TARequestDTO[],
  userRole: string = 'VERIFIER',
  filename?: string
) {
  if (!requests || requests.length === 0) {
    alert('No records available to export.');
    return;
  }

  const headers = [
    'Tracking Number',
    'Personnel Name',
    'Section / Division',
    'Destination',
    'Purpose',
    'Departure Date',
    'Return Date',
    'Date Filed',
    'Overall Status',
    'Action Date',
    'Approver Remarks',
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = requests.map((req) => {
    const stepRoleMap: Record<string, number> = {
      SECTION_CHIEF: 1,
      DIVISION_CHIEF: 2,
      HEAD_PENRO: 3,
    };
    const myStepNum = stepRoleMap[userRole];
    const myStep = req.approvalSteps?.find((s: any) => s.order === myStepNum);
    const actionDate = myStep?.actionDate
      ? formatFullDateTimeDisplay(myStep.actionDate)
      : req.status === 'APPROVED'
      ? formatFullDateTimeDisplay(req.updatedAt || req.createdAt)
      : '-';

    const remarks = myStep?.remarks || '-';

    return [
      escapeCSV(req.trackingNumber),
      escapeCSV(req.createdBy?.name || 'N/A'),
      escapeCSV(req.createdBy?.section || 'N/A'),
      escapeCSV(req.destination),
      escapeCSV(req.purpose),
      escapeCSV(formatDateDisplay(req.startDate)),
      escapeCSV(formatDateDisplay(req.endDate)),
      escapeCSV(formatDateDisplay(req.createdAt)),
      escapeCSV(req.status),
      escapeCSV(actionDate),
      escapeCSV(remarks),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    filename || `ETAPS_Approval_History_${userRole}_${dateStr}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an institutional government printable report (PDF-ready).
 */
export function printApprovalHistoryReport({
  requests,
  userRole,
  userName,
  userPosition,
  statusFilter,
  searchQuery,
}: {
  requests: TARequestDTO[];
  userRole: string;
  userName: string;
  userPosition?: string;
  statusFilter?: string;
  searchQuery?: string;
}) {
  if (!requests || requests.length === 0) {
    alert('No records available to print or export.');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) {
    alert('Please allow popups for this site to open the printable report window.');
    return;
  }

  const total = requests.length;
  const approved = requests.filter((r) => r.status === 'APPROVED').length;
  const pending = requests.filter((r) => r.status.startsWith('PENDING')).length;
  const rejected = requests.filter((r) => r.status.includes('REJECT')).length;

  const now = new Date();
  const generatedAt = now.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ETAPS Approval History Report - ${userName}</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 20px;
      font-size: 11px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f4c2e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header p { margin: 2px 0; }
    .republic { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
    .agency { font-size: 15px; font-weight: 800; color: #0f4c2e; }
    .office { font-size: 12px; font-weight: 600; color: #334155; }
    .system { font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 12px 0 6px 0;
      color: #0f172a;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 10px;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      text-align: center;
    }
    .stat-card .val { font-size: 16px; font-weight: 800; color: #0f4c2e; }
    .stat-card .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 2px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
    }
    td.track { font-family: monospace; font-weight: 700; color: #0f4c2e; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-approved { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-box {
      border-top: 1px solid #334155;
      padding-top: 6px;
      font-size: 10px;
    }
    .sig-name { font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .no-print-bar {
      position: sticky;
      top: 0;
      background: #0f4c2e;
      color: white;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -20px -20px 20px -20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .print-btn {
      background: white;
      color: #0f4c2e;
      border: none;
      font-weight: 700;
      font-size: 12px;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
    }
    @media print {
      .no-print-bar { display: none !important; }
      body { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span style="font-weight: 600;">📄 ETAPS Official Travel Authority Report Preview</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="header">
    <p class="republic">Republic of the Philippines</p>
    <p class="agency">DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES</p>
    <p class="office">Provincial Environment and Natural Resources Office (PENRO)</p>
    <p class="system">Enhanced Travel Authority Processing System (ETAPS)</p>
    <div class="title">Approval History & Travel Authority Activity Report</div>
  </div>

  <div class="meta-bar">
    <div><strong>Generated By:</strong> ${userName} (${userRole.replace('_', ' ')})</div>
    <div><strong>Filter Status:</strong> ${statusFilter || 'ALL'} ${searchQuery ? `| Query: "${searchQuery}"` : ''}</div>
    <div><strong>Date Generated:</strong> ${generatedAt}</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="val">${total}</div>
      <div class="lbl">Total Processed</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color: #166534;">${approved}</div>
      <div class="lbl">Approved</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color: #d97706;">${pending}</div>
      <div class="lbl">Under Review / Pending</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color: #dc2626;">${rejected}</div>
      <div class="lbl">Disapproved / Returned</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 14%;">TA NUMBER</th>
        <th style="width: 16%;">PERSONNEL & SECTION</th>
        <th style="width: 18%;">DESTINATION</th>
        <th style="width: 20%;">PURPOSE</th>
        <th style="width: 14%;">TRAVEL DATES</th>
        <th style="width: 8%;">STATUS</th>
        <th style="width: 10%;">ACTION DATE</th>
      </tr>
    </thead>
    <tbody>
      ${requests
        .map((req) => {
          const badgeClass =
            req.status === 'APPROVED'
              ? 'badge-approved'
              : req.status.includes('REJECT')
              ? 'badge-rejected'
              : 'badge-pending';

          const stepRoleMap: Record<string, number> = {
            SECTION_CHIEF: 1,
            DIVISION_CHIEF: 2,
            HEAD_PENRO: 3,
          };
          const myStepNum = stepRoleMap[userRole];
          const myStep = req.approvalSteps?.find((s: any) => s.order === myStepNum);
          const actDate = myStep?.actionDate
            ? formatDateDisplay(myStep.actionDate)
            : req.status === 'APPROVED'
            ? formatDateDisplay(req.updatedAt || req.createdAt)
            : '-';

          return `
            <tr>
              <td class="track">${req.trackingNumber}</td>
              <td>
                <strong>${req.createdBy?.name || 'N/A'}</strong><br/>
                <span style="font-size: 9px; color: #64748b;">${req.createdBy?.section || 'PENRO Office'}</span>
              </td>
              <td><strong>${req.destination}</strong></td>
              <td>${req.purpose}</td>
              <td>${formatDateRangeShort(req.startDate, req.endDate)}</td>
              <td><span class="badge ${badgeClass}">${req.status.replace('PENDING_', '')}</span></td>
              <td>${actDate}</td>
            </tr>
          `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <div class="sig-box">
        <div class="sig-name">${userName}</div>
        <div>${userPosition || 'Authorized Reviewing Official'}</div>
        <div style="color: #64748b; font-size: 9px; margin-top: 2px;">Certified Correct / Transmitted Official Record</div>
      </div>
    </div>
    <div>
      <div class="sig-box">
        <div class="sig-name">Office of the Provincial Environment and Natural Resources Officer</div>
        <div>DENR-PENRO Document Verification System</div>
        <div style="color: #64748b; font-size: 9px; margin-top: 2px;">Official ETAPS Institutional Electronic Log</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
