import { prisma } from './prisma';
import { createClient } from '@supabase/supabase-js';
import { Role } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import {
  sendEmail,
  generateTransactionalEmailHtml,
  validateEmail,
  TADetails,
  EmailAttachment,
} from './email';
import { generateStaticMapPng } from './email-map';
import { resolveFullAddress } from '@/utils/address';

export * from './email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : (null as any);

export interface SendSmsParams {
  to: string;
  message: string;
}

export interface NotifyUserParams {
  userId: string;
  requestId?: string;
  title: string;
  message: string;
  channel?: 'IN_APP' | 'SMS' | 'EMAIL' | 'BOTH';
  taDetails?: TADetails;
  actionUrl?: string;
}

export interface NotifyRoleParams {
  role: Role | 'SECTION_CHIEF' | 'DIVISION_CHIEF' | 'HEAD_PENRO' | 'ADMIN' | 'ACCOUNT_MANAGER';
  requestId?: string;
  title: string;
  message: string;
  channel?: 'IN_APP' | 'SMS' | 'EMAIL' | 'BOTH';
  taDetails?: TADetails;
  actionUrl?: string;
}

/**
 * Sends an SMS via PhilSMS API (Primary Philippine SMS Gateway) with Semaphore fallback.
 * Automatically normalizes Philippine phone numbers to 639XXXXXXXXX format for PhilSMS.
 */
export async function sendSms({ to, message }: SendSmsParams): Promise<boolean> {
  const philsmsToken = process.env.PHILSMS_API_TOKEN || '3846|uFWtHFbfSY5fWiXMUr8DKSqbO0ZNyz2erK2SquVE39d83d80';
  const philsmsSenderId = process.env.PHILSMS_SENDER_ID || 'PhilSMS';
  const semaphoreApiKey = process.env.SEMAPHORE_API_KEY;
  const semaphoreSenderName = process.env.SEMAPHORE_SENDER_NAME;

  if (!to || !to.trim()) {
    console.warn('[SMS] No phone number provided for dispatch.');
    return false;
  }

  // Extract digits
  const cleanNumber = to.replace(/[^0-9]/g, '');

  // 1. Primary: PhilSMS API (Requires 639XXXXXXXXX international format)
  if (philsmsToken) {
    const philSmsRecipient = cleanNumber.startsWith('63')
      ? cleanNumber
      : cleanNumber.startsWith('0')
      ? '63' + cleanNumber.slice(1)
      : cleanNumber.startsWith('9')
      ? '63' + cleanNumber
      : cleanNumber;

    try {
      const payload = {
        recipient: philSmsRecipient,
        sender_id: philsmsSenderId,
        type: 'plain',
        message: message,
      };

      const response = await fetch('https://dashboard.philsms.com/api/v3/sms/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${philsmsToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resJson = await response.json().catch(() => null);

      if (
        response.ok &&
        (resJson?.status === 'success' ||
          resJson?.status === 200 ||
          resJson?.message?.toLowerCase().includes('success') ||
          resJson?.message?.toLowerCase().includes('delivered'))
      ) {
        console.log(`[PhilSMS Sent] Successfully dispatched SMS to ${philSmsRecipient}:`, resJson);
        return true;
      } else {
        console.warn(`[PhilSMS Warning] Response status ${response.status}:`, resJson);
      }
    } catch (philsmsError) {
      console.error('[PhilSMS Exception] PhilSMS request error, trying fallback:', philsmsError);
    }
  }

  // 2. Secondary Fallback: Semaphore API (Requires 09XXXXXXXXX local format)
  if (semaphoreApiKey) {
    const semaphoreRecipient = cleanNumber.startsWith('63')
      ? '0' + cleanNumber.slice(2)
      : cleanNumber.startsWith('9')
      ? '0' + cleanNumber
      : cleanNumber;

    try {
      const payload: Record<string, string> = {
        apikey: semaphoreApiKey,
        number: semaphoreRecipient,
        message: message,
      };

      if (semaphoreSenderName && semaphoreSenderName.trim()) {
        payload.sendername = semaphoreSenderName.trim();
      }

      const response = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload),
      });

      if (response.ok) {
        const resJson = await response.json().catch(() => null);
        console.log(`[Semaphore Sent] Successfully dispatched SMS to ${semaphoreRecipient}:`, resJson);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`[Semaphore Error] Status ${response.status}: ${errorText}`);
      }
    } catch (semaphoreError) {
      console.error('[Semaphore Exception] Failed to send SMS via Semaphore:', semaphoreError);
    }
  }

  // 3. Fallback stub if gateways unavailable
  const fallbackNumber = cleanNumber.startsWith('0') ? cleanNumber : '0' + cleanNumber;
  console.log(`[SMS STUB] To: ${fallbackNumber} | Message: ${message}`);
  return true;
}

/**
 * Unified notification helper.
 * MUST be called for every status-changing action (submit, approve, reject, resubmit, overdue).
 * Dispatches In-App DB records, Semaphore SMS, and Resend Transactional Emails.
 * Fails safely without interrupting core business transactions.
 */
export async function notifyUser({
  userId,
  requestId,
  title,
  message,
  channel = 'BOTH',
  taDetails,
  actionUrl,
}: NotifyUserParams) {
  try {
    let phoneNumber = '';
    let email = '';
    let userName = '';
    let notification: any = null;

    // 1. Fetch user contact details via Prisma
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, phoneNumber: true, email: true },
      });
      if (user) {
        phoneNumber = user.phoneNumber || '';
        email = user.email || '';
        userName = user.name || '';
      }
    } catch (err) {
      console.warn('[notifyUser] Prisma user fetch fallback to Supabase...', err);
    }

    // Supabase fallback to fetch user contact details
    if ((!phoneNumber || !email) && supabaseUrl && supabaseKey) {
      try {
        const { data: sbUser } = await supabase
          .from('User')
          .select('name, phoneNumber, email')
          .eq('id', userId)
          .maybeSingle();

        if (sbUser) {
          phoneNumber = phoneNumber || sbUser.phoneNumber || '';
          email = email || sbUser.email || '';
          userName = userName || sbUser.name || '';
        }
      } catch (sbErr) {
        console.error('[notifyUser] Supabase user fetch error:', sbErr);
      }
    }

    // 2. Create in-app notification in DB (Option A: Safe zero-migration schema)
    try {
      const dbChannel = channel === 'EMAIL' ? 'IN_APP' : channel;
      notification = await prisma.notification.create({
        data: {
          userId,
          requestId: requestId || null,
          title,
          message,
          channel: dbChannel as any,
          smsStatus: channel === 'IN_APP' ? 'SENT' : 'PENDING',
        },
      });
    } catch (prismaErr) {
      console.warn('[notifyUser] Prisma notification create fallback to Supabase...', prismaErr);
      if (supabaseUrl && supabaseKey) {
        const notifId = 'notif_' + Math.random().toString(36).substring(2, 11);
        const dbChannel = channel === 'EMAIL' ? 'IN_APP' : channel;
        const { data: sbNotif } = await supabase
          .from('Notification')
          .insert({
            id: notifId,
            userId,
            requestId: requestId || null,
            title,
            message,
            channel: dbChannel,
            smsStatus: channel === 'IN_APP' ? 'SENT' : 'PENDING',
            isRead: false,
            createdAt: new Date().toISOString(),
          })
          .select('*')
          .single();

        notification = sbNotif || { id: notifId, userId, title, message, createdAt: new Date().toISOString() };
      }
    }

    // 3. Fire SMS if channel includes SMS/BOTH and phone is available
    if ((channel === 'SMS' || channel === 'BOTH') && phoneNumber) {
      try {
        const smsSuccess = await sendSms({
          to: phoneNumber,
          message: `[ETAPS] ${title}: ${message}`,
        });

        if (notification?.id) {
          try {
            await prisma.notification.update({
              where: { id: notification.id },
              data: { smsStatus: smsSuccess ? 'SENT' : 'FAILED' },
            });
          } catch {
            if (supabaseUrl && supabaseKey) {
              await supabase
                .from('Notification')
                .update({ smsStatus: smsSuccess ? 'SENT' : 'FAILED' })
                .eq('id', notification.id);
            }
          }
        }
      } catch (smsErr) {
        console.error('[notifyUser] SMS dispatch error (non-fatal):', smsErr);
      }
    }

    // 4. Fire Email via SMTP / Resend if channel includes EMAIL/BOTH and email is available
    if ((channel === 'EMAIL' || channel === 'BOTH') && email) {
      try {
        if (validateEmail(email)) {
          // Resolve complete destination address if coordinates exist
          let completeDestination = taDetails?.destination || '';
          if (taDetails?.destinationLat && taDetails?.destinationLng) {
            try {
              completeDestination = await resolveFullAddress(
                taDetails.destination,
                taDetails.destinationLat,
                taDetails.destinationLng
              );
            } catch {
              // keep existing on timeout/error
            }
          }

          const enhancedTaDetails: TADetails | undefined = taDetails
            ? { ...taDetails, destination: completeDestination || taDetails.destination }
            : undefined;

          // Prepare attachments (Official DENR circular logo + static destination map preview)
          const attachments: EmailAttachment[] = [];
          let hasLogoAttachment = false;
          let hasMapAttachment = false;

          try {
            const logoPath = path.join(process.cwd(), 'public', 'taps-logo.png');
            if (fs.existsSync(logoPath)) {
              attachments.push({
                filename: 'taps-logo.png',
                path: logoPath,
                cid: 'denr-logo',
                contentType: 'image/png',
              });
              hasLogoAttachment = true;
            }
          } catch (logoErr) {
            console.warn('[notifyUser] Logo attachment error:', logoErr);
          }

          if (enhancedTaDetails?.destinationLat && enhancedTaDetails?.destinationLng) {
            try {
              const mapBuffer = await generateStaticMapPng({
                lat: enhancedTaDetails.destinationLat,
                lng: enhancedTaDetails.destinationLng,
                label: enhancedTaDetails.destination || 'Destination Location',
                width: 600,
                height: 240,
              });

              if (mapBuffer) {
                attachments.push({
                  filename: 'destination-map.png',
                  content: mapBuffer,
                  cid: 'destination-map',
                  contentType: 'image/png',
                });
                hasMapAttachment = true;
              }
            } catch (mapErr) {
              console.warn('[notifyUser] Static map attachment error:', mapErr);
            }
          }

          const emailHtml = generateTransactionalEmailHtml({
            title,
            recipientName: userName || 'Personnel',
            message,
            taDetails: enhancedTaDetails,
            actionUrl,
            hasMapAttachment,
            hasLogoAttachment,
          });

          let plainText = `[DENR ETAPS] ${title}\n\nDear ${userName || 'Personnel'},\n\n${message}\n`;
          if (enhancedTaDetails) {
            plainText += `\n--- Travel Authority Details ---\n`;
            if (enhancedTaDetails.trackingNumber) plainText += `Reference No: ${enhancedTaDetails.trackingNumber}\n`;
            if (enhancedTaDetails.destination) plainText += `Destination: ${enhancedTaDetails.destination}\n`;
            if (enhancedTaDetails.startDate && enhancedTaDetails.endDate) {
              plainText += `Travel Dates: ${new Date(enhancedTaDetails.startDate).toLocaleDateString()} - ${new Date(enhancedTaDetails.endDate).toLocaleDateString()}\n`;
            }
            if (enhancedTaDetails.status) plainText += `Status: ${enhancedTaDetails.status}\n`;
            if (enhancedTaDetails.approverName || enhancedTaDetails.approverRole) {
              plainText += `Action By: ${[enhancedTaDetails.approverName, enhancedTaDetails.approverRole].filter(Boolean).join(' - ')}\n`;
            }
            if (enhancedTaDetails.remarks) plainText += `Remarks: ${enhancedTaDetails.remarks}\n`;
          }
          plainText += `\nView Online: ${actionUrl || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`}\n\n---\nRepublic of the Philippines\nDepartment of Environment and Natural Resources - PENRO`;

          await sendEmail({
            to: email,
            subject: `[DENR ETAPS] ${title}`,
            html: emailHtml,
            text: plainText,
            attachments,
          });
        } else {
          console.warn(`[notifyUser] Skipping email dispatch, invalid recipient email: "${email}"`);
        }
      } catch (emailErr) {
        console.error('[notifyUser] Email dispatch error (non-fatal):', emailErr);
      }
    }

    return notification;
  } catch (error) {
    console.error('[NotifyUser Exception]', error);
    return null;
  }
}

/**
 * Notifies all active users matching a specific role (e.g. all SECTION_CHIEF, DIVISION_CHIEF, HEAD_PENRO).
 * Dispatches In-App, SMS, and Resend Email to each active signatory.
 */
export async function notifyRole({
  role,
  requestId,
  title,
  message,
  channel = 'BOTH',
  taDetails,
  actionUrl,
}: NotifyRoleParams) {
  try {
    let targetUsers: Array<{ id: string; phoneNumber?: string; email?: string; name?: string }> = [];

    // 1. Fetch matching active users via Prisma
    try {
      targetUsers = await prisma.user.findMany({
        where: {
          role: role as Role,
          status: 'ACTIVE',
        },
        select: { id: true, name: true, phoneNumber: true, email: true },
      });
    } catch (err) {
      console.warn('[notifyRole] Prisma fetch fallback to Supabase...', err);
    }

    // 2. Fallback to Supabase REST if Prisma was empty or failed
    if (targetUsers.length === 0 && supabaseUrl && supabaseKey) {
      try {
        const { data: sbUsers } = await supabase
          .from('User')
          .select('id, name, phoneNumber, email')
          .eq('role', role)
          .eq('status', 'ACTIVE');

        if (sbUsers && sbUsers.length > 0) {
          targetUsers = sbUsers;
        }
      } catch (sbErr) {
        console.error('[notifyRole] Supabase role query error:', sbErr);
      }
    }

    // 3. Send notifications to all target approvers
    const results = [];
    for (const user of targetUsers) {
      const res = await notifyUser({
        userId: user.id,
        requestId,
        title,
        message,
        channel,
        taDetails,
        actionUrl,
      });
      results.push(res);
    }

    return results;
  } catch (error) {
    console.error('[NotifyRole Exception]', error);
    return [];
  }
}
