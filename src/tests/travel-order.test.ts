import { generatePopulatedTravelOrderDocx } from '../lib/travelOrderDocx';
import { TARequestDTO } from '../types';
import JSZip from 'jszip';

async function runTravelOrderTest() {
  console.log('Testing Travel Order generation...');

  const mockApprovedTA: TARequestDTO = {
    id: 'req_test_123',
    trackingNumber: 'TA-20260827-3040736',
    createdById: 'user_juan_1',
    createdBy: {
      name: 'Juan Dela Cruz',
      email: 'juan@denr.gov.ph',
      section: 'Conservation and Development Section',
      position: 'Administrative Officer V',
    } as any,
    purpose: 'Monitoring of NGP plantation sites and validation of community-based forestry projects',
    destination: 'Ambago, Babag, Butuan City',
    startDate: '2026-09-06T00:00:00.000Z',
    endDate: '2026-09-15T00:00:00.000Z',
    status: 'APPROVED',
    resubmitCount: 0,
    createdAt: '2026-08-27T17:13:37.000Z',
    updatedAt: '2026-08-30T09:00:00.000Z',
    teamMembers: [
      { id: 'm1', name: 'Maria Santos', position: 'Forester II', requestId: 'req_test_123' },
    ] as any,
    approvalSteps: [
      {
        id: 's1',
        order: 1,
        approverRole: 'SECTION_CHIEF' as any,
        action: 'APPROVED' as any,
        approver: { name: 'Engr. Pedro Penduko', email: 'pedro@denr.gov.ph', position: 'Chief, CDS' } as any,
        actionDate: '2026-08-28T08:30:00.000Z',
      },
      {
        id: 's2',
        order: 2,
        approverRole: 'DIVISION_CHIEF' as any,
        action: 'APPROVED' as any,
        approver: { name: 'FOR. MARIVIC M. BATERNA', email: 'baterna@denr.gov.ph', position: 'Chief, Technical Services Division' } as any,
        actionDate: '2026-08-29T10:15:00.000Z',
      },
      {
        id: 's3',
        order: 3,
        approverRole: 'HEAD_PENRO' as any,
        action: 'APPROVED' as any,
        approver: { name: 'ACHILLES ANTHONY C. EBONA', email: 'ebona@denr.gov.ph', position: 'OIC, PENR Officer' } as any,
        actionDate: '2026-08-30T09:00:00.000Z',
      },
    ],
  };

  // 1. Generate DOCX Buffer
  const docxBuffer = await generatePopulatedTravelOrderDocx(mockApprovedTA);
  if (!docxBuffer || docxBuffer.length === 0) {
    throw new Error('Failed to generate docx buffer');
  }
  console.log(`✓ Generated DOCX buffer size: ${docxBuffer.length} bytes`);

  // 2. Validate DOCX zip structure and content
  const zip = await JSZip.loadAsync(docxBuffer);
  const docXml = await zip.file('word/document.xml')?.async('string');

  if (!docXml) {
    throw new Error('word/document.xml not found in output docx');
  }

  // 3. Verify all populated fields
  const assertions = [
    { label: 'TO Number', check: docXml.includes('TO-20260827-3040736') },
    { label: 'Employee Name in Table', check: docXml.includes('Juan Dela Cruz') },
    { label: 'Employee Name in Authorization', check: docXml.includes('JUAN DELA CRUZ') },
    { label: 'Employee Position', check: docXml.includes('Administrative Officer V') },
    { label: 'Employee Section', check: docXml.includes('Conservation and Development Section') },
    { label: 'Destination', check: docXml.includes('Ambago, Babag, Butuan City') },
    { label: 'Purpose', check: docXml.includes('Monitoring of NGP plantation sites') },
    { label: 'Departure Date', check: docXml.includes('Sep 06, 2026') },
    { label: 'Arrival Date', check: docXml.includes('Sep 15, 2026') },
    { label: 'Division Chief Name', check: docXml.includes("DIVISION CHIEF's name") },
    { label: 'Head of PENRO Name', check: docXml.includes("HEAD OF PENRO's name") },
    { label: 'System Name', check: docXml.includes('Enhanced Travel Authority Processing System (ETAPS)') },
    { label: 'No unreplaced placeholders', check: !docXml.includes('[AUTO-GENERATED NO.]') && !docXml.includes('[Employee Full Name]') },
  ];

  let passed = 0;
  for (const a of assertions) {
    if (a.check) {
      console.log(`  ✓ ${a.label}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${a.label}`);
    }
  }

  if (passed === assertions.length) {
    console.log(`\n🎉 All ${passed}/${assertions.length} Travel Order assertions passed!`);
  } else {
    throw new Error(`Only ${passed}/${assertions.length} assertions passed.`);
  }
}

runTravelOrderTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
