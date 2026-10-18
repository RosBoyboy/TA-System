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
  if (!divisionName || !sectionName) return false;
  const division = OFFICIAL_DIVISIONS.find((d) => d.name.trim().toLowerCase() === divisionName.trim().toLowerCase());
  if (!division) return false;
  return division.sections.some((s) => s.name.trim().toLowerCase() === sectionName.trim().toLowerCase());
}
