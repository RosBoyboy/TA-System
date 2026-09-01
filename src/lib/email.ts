/**
 * Resend Email Dispatch Engine for ETAPS (Enhanced Travel Authority Processing System)
 * Department of Environment and Natural Resources - PENRO
 */

export interface TADetails {
  trackingNumber?: string;
  destination?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: string;
  approverName?: string;
  approverRole?: string;
  remarks?: string;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  cid?: string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface GenerateEmailParams {
  title: string;
  recipientName: string;
  message: string;
  taDetails?: TADetails;
  actionUrl?: string;
  hasMapAttachment?: boolean;
  hasLogoAttachment?: boolean;
}

/**
 * Validates standard email address syntax strictly against RFC standards and injection attacks.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254 || trimmed.length < 5) return false;

  // Standard RFC-compliant syntax: local part + domain + valid TLD
  const emailRegex = /^[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return false;

  // Guard against consecutive dots, leading/trailing dots in parts, and HTML/script injection characters
  if (
    trimmed.includes('..') ||
    trimmed.startsWith('.') ||
    trimmed.includes('.@') ||
    trimmed.includes('@.') ||
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.includes('"')
  ) {
    return false;
  }

  return true;
}

/**
 * Formats a Date object or ISO string to a clean human-readable date
 */
function formatDateDisplay(dateVal?: string | Date): string {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
}

/**
 * Returns status color theme for badges in email
 */
function getStatusTheme(status?: string): { bg: string; text: string; label: string } {
  const st = (status || '').toUpperCase();
  if (st === 'APPROVED') {
    return { bg: '#D1FAE5', text: '#065F46', label: 'APPROVED' };
  }
  if (st.includes('REJECT') || st.includes('RETURN')) {
    return { bg: '#FEE2E2', text: '#991B1B', label: 'RETURNED / REJECTED' };
  }
  if (st.includes('PENDING')) {
    return { bg: '#FEF3C7', text: '#92400E', label: 'UNDER REVIEW' };
  }
  return { bg: '#E2E8F0', text: '#334155', label: status || 'STATUS UPDATE' };
}

/**
 * Generates an institutional, responsive, government-grade transactional HTML email.
 * Strictly styled to match the official DENR-PENRO ETAPS specification (Image 2 reference).
 */
export function generateTransactionalEmailHtml({
  title,
  recipientName,
  message,
  taDetails,
  actionUrl,
  hasMapAttachment = false,
  hasLogoAttachment = false,
}: GenerateEmailParams): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const finalActionUrl = actionUrl || `${baseUrl}/employee?tab=requests`;

  const dateRangeStr =
    taDetails?.startDate && taDetails?.endDate
      ? `${formatDateDisplay(taDetails.startDate)} – ${formatDateDisplay(taDetails.endDate)}`
      : taDetails?.startDate
      ? formatDateDisplay(taDetails.startDate)
      : '';

  const statusTheme = getStatusTheme(taDetails?.status);

  // Build detail rows if TA details exist
  let detailsHtml = '';
  if (taDetails) {
    const rows: Array<{ label: string; value: string; isBadge?: boolean; isHighlight?: boolean }> = [];

    if (taDetails.trackingNumber) {
      rows.push({ label: 'TA Reference No.', value: taDetails.trackingNumber, isHighlight: true });
    }
    if (taDetails.destination) {
      rows.push({ label: 'Destination', value: taDetails.destination });
    }
    if (dateRangeStr) {
      rows.push({ label: 'Travel Dates', value: dateRangeStr });
    }
    if (taDetails.status) {
      rows.push({ label: 'Current Status', value: statusTheme.label, isBadge: true });
    }
    if (taDetails.approverName || taDetails.approverRole) {
      const approverStr = [taDetails.approverName, taDetails.approverRole].filter(Boolean).join(' - ');
      rows.push({ label: 'Action By', value: approverStr });
    }
    if (taDetails.remarks) {
      rows.push({ label: 'Remarks / Instructions', value: taDetails.remarks, isHighlight: true });
    }

    if (rows.length > 0) {
      detailsHtml = `
        <table role="presentation" class="detail-table" style="width: 100%; border-collapse: collapse; margin: 18px 0 0 0; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <tbody>
            ${rows
              .map(
                (row, idx) => `
              <tr class="detail-row" style="border-bottom: ${idx === rows.length - 1 ? 'none' : '1px solid #E2E8F0'};">
                <td class="detail-label" style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; width: 38%; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${row.label}
                </td>
                <td class="detail-value" style="padding: 12px 16px; font-size: 13px; color: #1E293B; font-weight: ${row.isHighlight ? '700' : '500'}; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${
                    row.isBadge
                      ? `<span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background-color: ${statusTheme.bg}; color: ${statusTheme.text}; font-family: monospace;">${row.value}</span>`
                      : row.value
                  }
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    }
  }

  // Build map section if coordinates exist
  let mapHtml = '';
  if (taDetails?.destinationLat && taDetails?.destinationLng) {
    const lat = taDetails.destinationLat;
    const lng = taDetails.destinationLng;
    const mapSrc = hasMapAttachment
      ? 'cid:destination-map'
      : `${baseUrl}/api/map-image?lat=${lat}&lng=${lng}&label=${encodeURIComponent(taDetails.destination || 'Destination')}`;

    mapHtml = `
      <div style="margin: 22px 0 6px 0;">
        <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #0F4C2E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          📍 Current Location (as entered on map)
        </p>
        <div style="border-radius: 12px; overflow: hidden; border: 1px solid #CBD5E1; background-color: #F8FAFC; text-align: center; margin: 0 0 8px 0;">
          <img src="${mapSrc}" alt="Current Location Map" width="536" style="display: block; width: 100%; max-width: 536px; height: auto; border: 0; margin: 0 auto;" />
        </div>
        <p style="margin: 0 0 20px 0; font-size: 12px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          The current location you entered is shown on the map above.
        </p>
      </div>
    `;
  }

  // Strip emojis from title for clean reference-accurate badge
  const cleanTitle = (title || 'TA Notification').replace(/^[🔔⚠️✅❌⏳📄\s]+/gu, '').trim();
  const logoSrc = hasLogoAttachment ? 'cid:denr-logo' : `${baseUrl}/taps-logo.png`;

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${cleanTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* CSS Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F1F5F9; }
    
    /* Responsive Media Queries for Mobile Screens (<= 600px) */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; margin: 0 auto !important; }
      .header-cell { padding: 18px 16px !important; }
      .header-title { font-size: 15px !important; line-height: 1.25 !important; }
      .content-cell { padding: 18px 16px 24px 16px !important; }
      .badge-cell { padding: 16px 16px 0 16px !important; }
      .footer-cell { padding: 18px 16px !important; }
      .detail-table { margin: 14px 0 0 0 !important; }
      .detail-row { display: block !important; width: 100% !important; padding: 10px 12px !important; box-sizing: border-box !important; }
      .detail-label { display: block !important; width: 100% !important; padding: 0 0 4px 0 !important; font-size: 10px !important; }
      .detail-value { display: block !important; width: 100% !important; padding: 0 !important; font-size: 13px !important; }
      .cta-button { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; padding: 14px 16px !important; font-size: 14px !important; }
      .body-text { font-size: 14px !important; line-height: 1.55 !important; }
      .sub-link { font-size: 10px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" class="email-wrapper" style="width: 100%; border-collapse: collapse; background-color: #F1F5F9; padding: 28px 0;">
    <tr>
      <td align="center">
        <!-- Main Responsive Container (Max 600px) -->
        <table role="presentation" class="email-container" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04); border: 1px solid #E2E8F0; margin: 16px 10px;">
          
          <!-- Header Banner (Official DENR Forest Green Theme matching reference) -->
          <tr>
            <td class="header-cell" style="background: linear-gradient(135deg, #1B4332 0%, #0F4C2E 100%); padding: 24px 28px; text-align: left; border-bottom: 3px solid #2E6F4E;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 52px; vertical-align: middle; padding-right: 14px;">
                    <img src="${logoSrc}" alt="DENR Logo" width="48" height="48" style="display: block; width: 48px; height: 48px; border-radius: 50%; object-fit: contain;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <p style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #A7F3D0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Republic of the Philippines
                    </p>
                    <h1 class="header-title" style="margin: 2px 0 0 0; font-size: 17px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Department of Environment and Natural Resources
                    </h1>
                    <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 600; color: #E2E8F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Provincial Environment and Natural Resources Office (PENRO)
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #86EFAC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Enhanced Travel Authority Processing System (ETAPS)
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notification Title Badge -->
          <tr>
            <td class="badge-cell" style="padding: 22px 32px 0 32px;">
              <div style="display: inline-block; padding: 4px 14px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; font-size: 12px; font-weight: 700; color: #0F4C2E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ${cleanTitle}
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="content-cell" style="padding: 16px 32px 28px 32px;">
              <p style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Dear ${recipientName || 'Valued Personnel'},
              </p>
              
              <p class="body-text" style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ${message}
              </p>

              <!-- Structured TA Details Box -->
              ${detailsHtml}

              <!-- Location Map Preview (Matching Image 2 Reference) -->
              ${mapHtml}

              <!-- Touch-Friendly Responsive Action Button CTA (Full Width Dark Green) -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 16px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${finalActionUrl}" target="_blank" class="cta-button" style="display: block; width: 100%; box-sizing: border-box; padding: 14px 20px; background-color: #0F4C2E; color: #FFFFFF; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(15, 76, 46, 0.25); letter-spacing: 0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      View Request Details &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p class="sub-link" style="font-size: 11px; color: #64748B; text-align: center; margin: 12px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Or copy and paste this link into your browser: <br/>
                <a href="${finalActionUrl}" style="color: #0F4C2E; word-break: break-all; font-size: 11px; text-decoration: underline;">${finalActionUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Institutional Footer (Matching Reference) -->
          <tr>
            <td class="footer-cell" style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748B; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                This is an automated message from ETAPS.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Bottom Seal / Tag -->
        <p style="font-size: 11px; color: #94A3B8; margin-top: 12px; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          &copy; ${new Date().getFullYear()} Republic of the Philippines &bull; Department of Environment and Natural Resources
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

import nodemailer from 'nodemailer';

// Global cached nodemailer transporter instance for reuse across serverless/node requests
let cachedTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter | null {
  const smtpUser = process.env.SMTP_USER?.replace(/["']/g, '').trim();
  const smtpPass = process.env.SMTP_PASS?.replace(/["']/g, '').trim().replace(/\s+/g, '');

  if (!smtpUser || !smtpPass) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST?.replace(/["']/g, '').trim() || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT?.replace(/["']/g, '').trim() || '465', 10);
  const secure = process.env.SMTP_SECURE === 'false' ? false : port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return cachedTransporter;
}

/**
 * Universal Email Dispatcher for ETAPS:
 * 1. Checks for Gmail / Standard SMTP (SMTP_USER + SMTP_PASS) -> sends via Nodemailer with zero recipient domain restrictions.
 * 2. Checks for Resend (RESEND_API_KEY) -> sends via Resend REST API.
 * 3. Falls back to console log stub in local development if neither is configured.
 * Never throws unhandled exceptions so TA approval workflow continues uninterrupted.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  attachments,
}: SendEmailParams): Promise<boolean> {
  const trimmedTo = to?.trim();
  if (!trimmedTo) {
    console.warn('[Email Warning] No recipient email address provided for dispatch.');
    return false;
  }

  if (!validateEmail(trimmedTo)) {
    console.warn(`[Email Warning] Invalid email format rejected: "${trimmedTo}"`);
    return false;
  }

  const defaultFromName = process.env.MAIL_FROM_NAME?.trim() || 'DENR-PENRO Travel Authority System';
  const smtpUser = process.env.SMTP_USER?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  // --------------------------------------------------------------------------
  // 1. SMTP Dispatch (Gmail / Institutional Mail Server via Nodemailer)
  // --------------------------------------------------------------------------
  const smtpTransporter = getSmtpTransporter();
  if (smtpTransporter && smtpUser) {
    try {
      const fromAddress = from || process.env.MAIL_FROM_ADDRESS?.trim() || `"${defaultFromName}" <${smtpUser}>`;
      const info = await smtpTransporter.sendMail({
        from: fromAddress,
        to: trimmedTo,
        subject,
        html,
        text: text || subject,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          path: a.path,
          cid: a.cid,
          contentType: a.contentType,
        })),
      });

      console.log(`[SMTP Success] Email dispatched to ${trimmedTo} (MessageID: ${info.messageId})`);
      return true;
    } catch (smtpError) {
      console.error('[SMTP Error] Failed to dispatch email via SMTP:', smtpError);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // 2. Resend REST API Dispatch
  // --------------------------------------------------------------------------
  if (resendApiKey) {
    const fromAddress =
      from ||
      process.env.MAIL_FROM_ADDRESS?.trim() ||
      `"${defaultFromName}" <onboarding@resend.dev>`;

    try {
      const payload: any = {
        from: fromAddress,
        to: [trimmedTo],
        subject: subject,
        html: html,
        text: text || subject,
      };

      if (attachments && attachments.length > 0) {
        payload.attachments = attachments.map((a) => ({
          filename: a.filename,
          content: a.content
            ? Buffer.isBuffer(a.content)
              ? a.content.toString('base64')
              : Buffer.from(a.content).toString('base64')
            : undefined,
          path: a.path,
        }));
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[Resend Error] API returned status ${response.status}: ${errorText}`);
        return false;
      }

      const resJson = await response.json().catch(() => null);
      console.log(`[Resend Success] Email dispatched to ${trimmedTo} (ID: ${resJson?.id || 'ok'})`);
      return true;
    } catch (error) {
      console.error('[Resend Exception] Network error during email dispatch:', error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // 3. Local Development Stub
  // --------------------------------------------------------------------------
  const stubFrom = from || process.env.MAIL_FROM_ADDRESS?.trim() || `"${defaultFromName}" <noreply@denr.gov.ph>`;
  console.log(`[EMAIL STUB (SMTP/Resend not configured)] To: ${trimmedTo} | Subject: "${subject}" | From: ${stubFrom}`);
  return true;
}
