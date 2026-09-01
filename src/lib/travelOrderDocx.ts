import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { TARequestDTO } from '@/types';
import { parseUtcDate } from '@/lib/date';

/**
 * Format date for official Travel Order document (e.g. "August 27, 2026")
 */
function formatOfficialDate(dateVal?: string | Date | null): string {
  const d = parseUtcDate(dateVal);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(dateVal?: string | Date | null): string {
  const d = parseUtcDate(dateVal);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function escapeXml(unsafe: string = ''): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Populates the existing TAPS_Travel_Order_Template.docx with approved TA data from the database.
 * Preserves 100% of the original document styles, layout, tables, fonts, and headers.
 */
export async function generatePopulatedTravelOrderDocx(req: TARequestDTO): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'TAPS_Travel_Order_Template.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Travel Order template file not found at: ' + templatePath);
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  // Read document.xml and header1.xml
  const docXmlFile = zip.file('word/document.xml');
  const headerXmlFile = zip.file('word/header1.xml');

  if (!docXmlFile) {
    throw new Error('word/document.xml missing from docx template.');
  }

  let docXml = await docXmlFile.async('string');

  // 1. Employee Name (Single source of truth from Step 2 / createdBy)
  const employeeName = req.createdBy?.name || 'Juan Dela Cruz';
  const employeePosition = (req.createdBy as any)?.position || 'Administrative Officer V';
  const employeeSection = req.createdBy?.section || 'Technical Services Division';
  const trackingNumber = req.trackingNumber ? req.trackingNumber.replace('TA-', 'TO-') : 'TO-2026-0001';
  const dateFiled = formatOfficialDate(req.createdAt);
  const departureDate = formatShortDate(req.startDate);
  const arrivalDate = formatShortDate(req.endDate);
  const destination = req.destination || 'DENR Regional Office';
  const purpose = req.purpose || 'Official Business Travel';

  // Approvers
  const step2 = req.approvalSteps?.find((s: any) => s.order === 2);
  const step3 = req.approvalSteps?.find((s: any) => s.order === 3);

  const divChiefName = "DIVISION CHIEF's name";
  const divChiefPosition = (step2?.approver as any)?.position || 'Chief, Technical Services Division';

  const penroName = "HEAD OF PENRO's name";
  const penroPosition = (step3?.approver as any)?.position || 'OIC, PENR Officer';
  const dateApproved = formatOfficialDate(step3?.actionDate || req.updatedAt || req.createdAt);

  // Replacements in word/document.xml
  docXml = docXml.replace(/\[AUTO-GENERATED NO\.\]/g, escapeXml(trackingNumber));
  docXml = docXml.replace(/\[Date Filed\]/g, escapeXml(dateFiled));
  docXml = docXml.replace(/\[Employee Full Name\]/g, escapeXml(employeeName));
  docXml = docXml.replace(/\[Salary Grade \/ Amount\]/g, escapeXml('SG-18 / ₱46,725.00'));
  docXml = docXml.replace(/\[Position\/Designation\]/g, escapeXml(employeePosition));
  docXml = docXml.replace(/\[Division\/Section\/Unit\]/g, escapeXml(employeeSection));
  docXml = docXml.replace(/\[Office\/Station\]/g, escapeXml('PENRO Agusan del Norte'));

  // Dates in Table 1 (Departure Date and Arrival Date)
  // The template has two occurrences of [MMM DD, YYYY]: first is Departure, second is Arrival
  let occurrence = 0;
  docXml = docXml.replace(/\[MMM DD, YYYY\]/g, () => {
    occurrence++;
    return occurrence === 1 ? escapeXml(departureDate) : escapeXml(arrivalDate);
  });

  docXml = docXml.replace(/\[Destination Office\/Place\]/g, escapeXml(destination));
  docXml = docXml.replace(/\[Full purpose\/description of official travel\]/g, escapeXml(purpose));

  // Division Chief & Head of PENRO
  docXml = docXml.replace(/\[Name of Section\/Division Chief\]/g, escapeXml(divChiefName));
  // Notice the two [Position/Title]: first for Div Chief, second for Head of PENRO
  let posOccurrence = 0;
  docXml = docXml.replace(/\[Position\/Title\]/g, () => {
    posOccurrence++;
    return posOccurrence === 1 ? escapeXml(divChiefPosition) : escapeXml(penroPosition);
  });

  docXml = docXml.replace(/\[Name of Head of PENRO\/OIC\]/g, escapeXml(penroName));
  docXml = docXml.replace(/\[Date Approved\]/g, escapeXml(dateApproved));

  // Authorization Section Employee Name (single source of truth)
  docXml = docXml.replace(/\[EMPLOYEE FULL NAME\]/g, escapeXml(employeeName.toUpperCase()));
  docXml = docXml.replace(/\[SYSTEM NAME\]/g, 'Enhanced Travel Authority Processing System (ETAPS)');

  zip.file('word/document.xml', docXml);

  // Update header1.xml if present
  if (headerXmlFile) {
    let headerXml = await headerXmlFile.async('string');
    headerXml = headerXml.replace(
      /\[INSERT REGIONAL \/ PENRO OFFICE NAME \]/g,
      'Provincial Environment and Natural Resources Office - Agusan del Norte'
    );
    zip.file('word/header1.xml', headerXml);
  }

  // Inject transparent signatures into docx media
  const sig1Path = path.join(process.cwd(), 'public', 'signatures', 'signature_div_chief.png');
  const sig2Path = path.join(process.cwd(), 'public', 'signatures', 'signature_penro.png');
  const sig3Path = path.join(process.cwd(), 'public', 'signatures', 'signature_employee.png');

  if (fs.existsSync(sig1Path)) zip.file('word/media/image1.jpeg', fs.readFileSync(sig1Path));
  if (fs.existsSync(sig2Path)) zip.file('word/media/image2.jpg', fs.readFileSync(sig2Path));
  if (fs.existsSync(sig3Path)) zip.file('word/media/image3.jpg', fs.readFileSync(sig3Path));

  // Generate output buffer
  const outputBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return outputBuffer;
}
