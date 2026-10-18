/**
 * Official DENR-PENRO Agusan del Norte Organizational Structure
 * Division and Section Master Constants & Validation
 */

export interface OrganizationSectionItem {
  id: string;
  name: string;
}

export interface OrganizationDivisionItem {
  id: string;
  name: string;
  sections: OrganizationSectionItem[];
}

export const OFFICIAL_DIVISIONS: OrganizationDivisionItem[] = [
  {
    id: 'div_msd',
    name: 'Management Services Division',
    sections: [
      { id: 'sec_plan', name: 'Planning Section' },
      { id: 'sec_admin', name: 'Admin & Finance Section' },
    ],
  },
  {
    id: 'div_tsd',
    name: 'Technical Services Division',
    sections: [
      { id: 'sec_con_dev', name: 'Conservation and Development Section' },
      { id: 'sec_reg_perm', name: 'Regulation and Permitting Section' },
      { id: 'sec_mon_enf', name: 'Monitoring and Enforcement Section' },
    ],
  },
];

/**
 * Validates whether a given Division and Section pair is officially authorized.
 */
export function isValidDivisionSection(divisionName?: string | null, sectionName?: string | null): boolean {
  if (!divisionName) return false;
  const division = findOfficialDivision(divisionName);
  if (!division) return false;
  // Divisions without sections must not carry a section
  if (division.sections.length === 0) return !sectionName || !sectionName.trim();
  if (!sectionName) return false;
  return division.sections.some((s) => s.name.trim().toLowerCase() === sectionName.trim().toLowerCase());
}

/**
 * Finds an official division by name (case-insensitive).
 */
export function findOfficialDivision(divisionName?: string | null): OrganizationDivisionItem | undefined {
  if (!divisionName) return undefined;
  return OFFICIAL_DIVISIONS.find((d) => d.name.trim().toLowerCase() === divisionName.trim().toLowerCase());
}

/**
 * Whether the given division requires a section to be selected.
 */
export function divisionRequiresSection(divisionName?: string | null): boolean {
  const division = findOfficialDivision(divisionName);
  return !!division && division.sections.length > 0;
}
