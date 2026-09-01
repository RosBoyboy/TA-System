/**
 * Comprehensive Automated Test Suite for ETAPS Email Notifications & Responsive Layout
 * Department of Environment and Natural Resources - PENRO
 */

import {
  validateEmail,
  generateTransactionalEmailHtml,
  sendEmail,
  TADetails,
} from '../lib/email';
import { notifyUser, notifyRole } from '../lib/sms';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, details?: string) {
  results.push({
    name,
    category,
    passed: condition,
    details: condition ? undefined : details || 'Assertion failed',
  });
  const icon = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${icon}: [${category}] ${name}`);
  if (!condition && details) {
    console.log(`     └─ Error: ${details}`);
  }
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('🧪 ETAPS Automated Email Notification & Responsive Test Suite');
  console.log('================================================================\n');

  /* -------------------------------------------------------------------------- */
  /* 1. EMAIL SYNTAX VALIDATION TESTS                                           */
  /* -------------------------------------------------------------------------- */
  console.log('📦 CATEGORY 1: Email Address Validation');

  const validEmails = [
    'employee@denr.gov.ph',
    'sectionchief@denr.gov.ph',
    'divchief@penro.gov.ph',
    'headpenro@denr.gov.ph',
    'user.firstname.lastname@region13.denr.gov.ph',
    'admin+etaps@subdomain.org',
    'juandelacruz123@gmail.com',
  ];

  for (const email of validEmails) {
    assert(validateEmail(email) === true, `Accept valid email: ${email}`, 'Email Validation');
  }

  const invalidEmails = [
    '',
    '   ',
    'plainaddress',
    'missingatsign.com',
    '@missingusername.com',
    'username@.com',
    'username@domain..com',
    'username@domain',
    null as any,
    undefined as any,
    'user name@denr.gov.ph',
    '<script>alert(1)</script>@denr.gov.ph',
  ];

  for (const email of invalidEmails) {
    assert(validateEmail(email) === false, `Reject invalid email: "${String(email)}"`, 'Email Validation');
  }

  /* -------------------------------------------------------------------------- */
  /* 2. RESPONSIVE HTML EMAIL STRUCTURE & CSS AUDIT                              */
  /* -------------------------------------------------------------------------- */
  console.log('\n📦 CATEGORY 2: Responsive HTML Email Architecture & Standards');

  const sampleTADetails: TADetails = {
    trackingNumber: 'TA-20260827-891011',
    destination: 'Brgy. Mahay, Butuan City, Agusan del Norte',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    status: 'PENDING_SECTION_CHIEF',
    approverName: 'Engr. Juan Dela Cruz',
    approverRole: 'Section Chief',
    remarks: 'Conduct technical investigation and boundary assessment.',
  };

  const html = generateTransactionalEmailHtml({
    title: 'New TA Request for Review',
    recipientName: 'Section Chief User',
    message: 'A new Travel Authority request has been submitted and is awaiting your review.',
    taDetails: sampleTADetails,
    actionUrl: 'http://localhost:3000/staff?tab=pending',
  });

  // Responsive Meta Tags
  assert(html.includes('<!DOCTYPE html>'), 'Contains valid HTML5 DOCTYPE', 'Responsive HTML');
  assert(html.includes('viewport') && html.includes('width=device-width'), 'Contains viewport meta tag for mobile scaling', 'Responsive HTML');
  assert(html.includes('x-apple-disable-message-reformatting'), 'Contains iOS Apple Mail reformatting prevention tag', 'Responsive HTML');
  assert(html.includes('format-detection'), 'Contains format-detection tag to disable unwanted phone/date autolinking', 'Responsive HTML');
  assert(html.includes('color-scheme') && html.includes('supported-color-schemes'), 'Contains color-scheme tags for dark mode safety', 'Responsive HTML');

  // Mobile Media Queries
  assert(html.includes('@media only screen and (max-width: 600px)'), 'Contains @media screen queries for mobile devices (<=600px)', 'Responsive CSS');
  assert(html.includes('.email-container') && html.includes('max-width: 100% !important'), 'Enforces fluid 100% width on mobile email container', 'Responsive CSS');
  assert(html.includes('.cta-button') && html.includes('display: block !important'), 'Formats CTA action button as full-width block on mobile for touch accessibility', 'Responsive CSS');
  assert(html.includes('.detail-row') && html.includes('display: block !important'), 'Stacks detail rows (label/value) on narrow screens', 'Responsive CSS');

  // Institutional Branding & Content
  assert(html.includes('Department of Environment and Natural Resources'), 'Includes official DENR institutional agency header', 'Branding & Content');
  assert(html.includes('Enhanced Travel Authority Processing System'), 'Includes ETAPS system identification', 'Branding & Content');
  assert(html.includes('TA-20260827-891011'), 'Renders TA Reference Number in structured details', 'Branding & Content');
  assert(html.includes('Brgy. Mahay, Butuan City'), 'Renders Destination in structured details', 'Branding & Content');
  assert(html.includes('Sep 1, 2026 – Sep 3, 2026'), 'Formats and renders clean date range', 'Branding & Content');
  assert(html.includes('http://localhost:3000/staff?tab=pending'), 'Includes clickable action CTA button URL', 'Branding & Content');

  /* -------------------------------------------------------------------------- */
  /* 3. LIFECYCLE EVENT TEMPLATE RENDERING TESTS                                 */
  /* -------------------------------------------------------------------------- */
  console.log('\n📦 CATEGORY 3: Full TA Lifecycle Event Notification Render Tests');

  const lifecycleScenarios = [
    {
      name: 'Event 1: TA Submission (Employee -> Section Chief)',
      params: {
        title: 'TA Request Submitted',
        recipientName: 'Juan Dela Cruz',
        message: 'Your Travel Authority request (TA-20260827-001) has been submitted for Section Chief review.',
        taDetails: {
          trackingNumber: 'TA-20260827-001',
          destination: 'Makati City',
          startDate: '2026-09-10',
          endDate: '2026-09-12',
          status: 'PENDING_SECTION_CHIEF',
        },
      },
      expectedStatusLabel: 'UNDER REVIEW',
    },
    {
      name: 'Event 2: Section Chief Endorsement (-> Division Chief)',
      params: {
        title: 'TA Request Reviewed by Section Chief',
        recipientName: 'Division Chief User',
        message: "Juan Dela Cruz's TA Request (TA-20260827-001) has been endorsed by Section Chief.",
        taDetails: {
          trackingNumber: 'TA-20260827-001',
          destination: 'Makati City',
          startDate: '2026-09-10',
          endDate: '2026-09-12',
          status: 'PENDING_DIVISION_CHIEF',
          approverName: 'Engr. Irene Cadiz',
          approverRole: 'Section Chief',
          remarks: 'Reviewed and verified within AOR travel.',
        },
      },
      expectedStatusLabel: 'UNDER REVIEW',
    },
    {
      name: 'Event 3: Division Chief Endorsement (-> Head of PENRO)',
      params: {
        title: 'TA Request Reviewed by Division Chief',
        recipientName: 'Head of PENRO',
        message: "Juan Dela Cruz's TA Request (TA-20260827-001) has been endorsed by Division Chief and is awaiting final approval.",
        taDetails: {
          trackingNumber: 'TA-20260827-001',
          destination: 'Makati City',
          startDate: '2026-09-10',
          endDate: '2026-09-12',
          status: 'PENDING_HEAD_PENRO',
          approverName: 'For. Luis Gonzaga',
          approverRole: 'Division Chief',
          remarks: 'Recommended for approval.',
        },
      },
      expectedStatusLabel: 'UNDER REVIEW',
    },
    {
      name: 'Event 4: Head of PENRO Final Approval (-> Employee)',
      params: {
        title: 'TA Request Fully Approved',
        recipientName: 'Juan Dela Cruz',
        message: 'Congratulations! Your TA Request (TA-20260827-001) has been fully approved by Head of PENRO. Printable document is ready.',
        taDetails: {
          trackingNumber: 'TA-20260827-001',
          destination: 'Makati City',
          startDate: '2026-09-10',
          endDate: '2026-09-12',
          status: 'APPROVED',
          approverName: 'PENRO Officer In Charge',
          approverRole: 'Head of PENRO',
          remarks: 'Approved. Strictly observe travel safety protocols.',
        },
      },
      expectedStatusLabel: 'APPROVED',
    },
    {
      name: 'Event 5: Manual Return / Rejection (-> Employee)',
      params: {
        title: 'TA Request Returned for Revision',
        recipientName: 'Juan Dela Cruz',
        message: 'Your TA Request (TA-20260827-001) was returned by Section Chief. Reason: "Please attach revised vehicle pass request."',
        taDetails: {
          trackingNumber: 'TA-20260827-001',
          destination: 'Makati City',
          startDate: '2026-09-10',
          endDate: '2026-09-12',
          status: 'REJECTED_MANUAL',
          approverName: 'Engr. Irene Cadiz',
          approverRole: 'Section Chief',
          remarks: 'Please attach revised vehicle pass request.',
        },
      },
      expectedStatusLabel: 'RETURNED / REJECTED',
    },
    {
      name: 'Event 6: Resubmitted TA Request (-> Section Chief)',
      params: {
        title: 'Resubmitted TA Awaiting Verification',
        recipientName: 'Section Chief User',
        message: 'TA Request (TA-20260827-001) has been resubmitted with updated attachments and dates.',
        taDetails: {
          trackingNumber: 'TA-20260827-001',
          destination: 'Makati City',
          startDate: '2026-09-15',
          endDate: '2026-09-17',
          status: 'PENDING_SECTION_CHIEF',
        },
      },
      expectedStatusLabel: 'UNDER REVIEW',
    },
    {
      name: 'Event 7: Auto-Rejection Overdue Notice (-> Employee)',
      params: {
        title: 'TA Request Auto-Rejected (Overdue)',
        recipientName: 'Juan Dela Cruz',
        message: 'Your TA Request (TA-20260827-001) was automatically rejected because travel start date has lapsed before approval.',
        taDetails: {
          trackingNumber: 'TA-20260827-001',
          destination: 'Makati City',
          startDate: '2026-08-20',
          endDate: '2026-08-22',
          status: 'REJECTED_OVERDUE',
          remarks: 'Travel start date passed before all approval levels were completed.',
        },
      },
      expectedStatusLabel: 'RETURNED / REJECTED',
    },
    {
      name: 'Event 8: Account Activation Notice (-> User)',
      params: {
        title: 'Account Activated',
        recipientName: 'Maria Santos',
        message: 'Your DENR ETAPS account has been verified and activated for Section "Planning". You may now log in.',
        actionUrl: 'http://localhost:3000/login',
      },
      expectedStatusLabel: null,
    },
  ];

  for (const scenario of lifecycleScenarios) {
    const renderedHtml = generateTransactionalEmailHtml(scenario.params);
    assert(
      renderedHtml.length > 500 && renderedHtml.includes(scenario.params.title),
      `Render ${scenario.name}`,
      'Lifecycle Events'
    );
    if (scenario.expectedStatusLabel) {
      assert(
        renderedHtml.includes(scenario.expectedStatusLabel),
        `  └─ Status badge matches "${scenario.expectedStatusLabel}"`,
        'Lifecycle Events'
      );
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 4. DISPATCH ENGINE & RESILIENCE TESTS                                      */
  /* -------------------------------------------------------------------------- */
  console.log('\n📦 CATEGORY 4: Dispatch Engine Execution & Error Handling');

  // Test 1: Send with valid email (Stub / Resend)
  const sendResult = await sendEmail({
    to: 'test.approver@denr.gov.ph',
    subject: '[DENR ETAPS] Test Notification',
    html: html,
    text: 'Test Notification Text Fallback',
  });
  assert(sendResult === true, 'sendEmail returns true on valid dispatch (Stub/API)', 'Dispatch Engine');

  // Test 2: Send with empty recipient
  const emptyResult = await sendEmail({
    to: '',
    subject: 'Test Empty',
    html: '<p>Test</p>',
  });
  assert(emptyResult === false, 'sendEmail rejects empty recipient safely without throwing', 'Dispatch Engine');

  // Test 3: Send with invalid email syntax
  const invalidResult = await sendEmail({
    to: 'invalid-email-address',
    subject: 'Test Invalid',
    html: '<p>Test</p>',
  });
  assert(invalidResult === false, 'sendEmail rejects invalid recipient syntax safely', 'Dispatch Engine');

  /* -------------------------------------------------------------------------- */
  /* 5. IMAGE 2 REFERENCE SPECIFICATION TESTS (MAP, LOGO, CLEAN BADGE)          */
  /* -------------------------------------------------------------------------- */
  console.log('\n📦 CATEGORY 5: Image 2 Reference Specification Verification');

  const detailedTADetails: TADetails = {
    trackingNumber: 'TA-20260827-4417354',
    destination: 'Poblacion 1, Buenavista, Agusan del Norte, Caraga, Philippines',
    destinationLat: 8.976,
    destinationLng: 125.408,
    startDate: '2026-09-09',
    endDate: '2026-09-15',
    status: 'PENDING_DIVISION_CHIEF',
    approverName: 'Section Chief User',
    approverRole: 'SECTION_CHIEF',
    remarks: 'proceed',
  };

  const image2EmailHtml = generateTransactionalEmailHtml({
    title: '🔔 TA Request Step Approved',
    recipientName: 'Juan Dela Cruz (Employee)',
    message: 'Your TA Request (TA-20260827-4417354) was approved by Section Chief and is now pending Division Chief review.',
    taDetails: detailedTADetails,
    actionUrl: 'http://localhost:3000/employee?tab=requests',
    hasMapAttachment: true,
    hasLogoAttachment: true,
  });

  // 1. Seal / Logo in Header
  assert(image2EmailHtml.includes('cid:denr-logo') || image2EmailHtml.includes('taps-logo.png'), 'Includes DENR official seal image in header', 'Image 2 Spec');
  
  // 2. Clean Badge without Emojis
  assert(!image2EmailHtml.includes('🔔 TA Request Step Approved'), 'Strips emojis from notification badge', 'Image 2 Spec');
  assert(image2EmailHtml.includes('TA Request Step Approved'), 'Renders clean green pill badge', 'Image 2 Spec');

  // 3. Complete Address in Destination Row
  assert(image2EmailHtml.includes('Poblacion 1, Buenavista, Agusan del Norte, Caraga, Philippines'), 'Renders complete address in destination row', 'Image 2 Spec');

  // 4. Map Section & Caption
  assert(image2EmailHtml.includes('Current Location (as entered on map)'), 'Includes map section heading', 'Image 2 Spec');
  assert(image2EmailHtml.includes('cid:destination-map'), 'Includes destination map image reference', 'Image 2 Spec');
  assert(image2EmailHtml.includes('The current location you entered is shown on the map above.'), 'Includes reference caption below map', 'Image 2 Spec');

  // 5. Button Label
  assert(image2EmailHtml.includes('View Request Details'), 'Includes "View Request Details" CTA button text', 'Image 2 Spec');

  /* -------------------------------------------------------------------------- */
  /* 6. SUMMARY & METRICS                                                       */
  /* -------------------------------------------------------------------------- */
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalCount = results.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  console.log('\n================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount}/${totalCount} Passed (${passRate}%)`);
  console.log(`   Failed: ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('❌ Some tests failed. Please review errors above.');
    process.exit(1);
  } else {
    console.log('🎉 ALL EMAIL NOTIFICATION & RESPONSIVENESS TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
