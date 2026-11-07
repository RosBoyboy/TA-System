'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DynamicAdminDestinationMap, { TAMapItem } from '@/components/map/DynamicAdminDestinationMap';
import {
  isDateWithinRange,
  formatDateDisplay,
  toCalendarDateString,
  getWeekDateRange,
  isTravelOverlappingPeriod,
  parseUtcDate,
} from '@/lib/date';
import { exportApprovalHistoryToCSV, printApprovalHistoryReport } from '@/utils/export';

interface ApprovalStepItem {
  id: string;
  order: number;
  approverRole: string;
  action: string;
  remarks?: string | null;
  actionDate?: string | null;
  approver?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface TARecord {
  id: string;
  trackingNumber: string;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role?: string;
    section?: string | null;
  } | null;
  purpose: string;
  destination: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  startDate: string;
  endDate: string;
  status: string;
  resubmitCount?: number;
  createdAt: string;
  updatedAt: string;
  approvalSteps?: ApprovalStepItem[];
  aorType?: 'Within AOR' | 'Outside AOR';
  transportation?: 'Government Vehicle' | 'Public Transport' | 'Airline';
  office?: string;
  employeePosition?: string;
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  section?: string | null;
  position?: string;
  lastLogin?: string;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  target: string;
  trackingNumber: string;
  ipAddress: string;
  details: string;
}

// Fallback seed TA records matching PDF reference dataset
const seedTARecords: TARecord[] = [
  {
    id: 'seed-1',
    trackingNumber: 'TA-2025-0001',
    createdById: 'user-1',
    createdBy: { id: 'user-1', name: 'Maria Santos Cruz', email: 'mscruz@denr.gov.ph', section: 'CENRO Rosario' },
    employeePosition: 'Environmental Management Specialist II',
    office: 'CENRO Rosario',
    destination: 'Baguio City',
    destinationLat: 16.4023,
    destinationLng: 120.5960,
    startDate: '2025-01-15',
    endDate: '2025-01-17',
    purpose: 'Attend National Environmental Summit 2025',
    status: 'APPROVED',
    aorType: 'Outside AOR',
    transportation: 'Public Transport',
    createdAt: '2025-01-10T08:30:00Z',
    updatedAt: '2025-01-14T14:20:00Z',
  },
  {
    id: 'seed-2',
    trackingNumber: 'TA-2025-0002',
    createdById: 'user-2',
    createdBy: { id: 'user-2', name: 'Jose Reyes Garcia', email: 'jrgarcia@denr.gov.ph', section: 'CENRO San Fernando' },
    employeePosition: 'Forester II',
    office: 'CENRO San Fernando',
    destination: 'Candon City, Ilocos Sur',
    destinationLat: 17.1932,
    destinationLng: 120.4485,
    startDate: '2025-01-20',
    endDate: '2025-01-22',
    purpose: 'Forest inventory and assessment in watershed reservation',
    status: 'PENDING_DIVISION_CHIEF',
    aorType: 'Within AOR',
    transportation: 'Government Vehicle',
    createdAt: '2025-01-12T09:15:00Z',
    updatedAt: '2025-01-15T11:00:00Z',
  },
  {
    id: 'seed-3',
    trackingNumber: 'TA-2025-0003',
    createdById: 'user-3',
    createdBy: { id: 'user-3', name: 'Ana Mendoza Lopez', email: 'amlopez@denr.gov.ph', section: 'PENRO La Union' },
    employeePosition: 'Administrative Officer III',
    office: 'PENRO La Union',
    destination: 'Manila (DENR Central Office)',
    destinationLat: 14.5995,
    destinationLng: 120.9842,
    startDate: '2025-01-25',
    endDate: '2025-01-28',
    purpose: 'Budget and Finance Conference FY2025',
    status: 'PENDING_SECTION_CHIEF',
    aorType: 'Outside AOR',
    transportation: 'Airline',
    createdAt: '2025-01-14T10:00:00Z',
    updatedAt: '2025-01-14T10:00:00Z',
  },
  {
    id: 'seed-4',
    trackingNumber: 'TA-2025-0004',
    createdById: 'user-4',
    createdBy: { id: 'user-4', name: 'Roberto Villanueva', email: 'rvillanueva@denr.gov.ph', section: 'CENRO Rosario' },
    employeePosition: 'Forest Technician',
    office: 'CENRO Rosario',
    destination: 'Pugo, La Union',
    destinationLat: 16.3197,
    destinationLng: 120.4682,
    startDate: '2025-01-18',
    endDate: '2025-01-19',
    purpose: 'Tree planting monitoring and evaluation',
    status: 'APPROVED',
    aorType: 'Within AOR',
    transportation: 'Government Vehicle',
    createdAt: '2025-01-11T13:45:00Z',
    updatedAt: '2025-01-16T16:00:00Z',
  },
  {
    id: 'seed-5',
    trackingNumber: 'TA-2025-0005',
    createdById: 'user-5',
    createdBy: { id: 'user-5', name: 'Carmen Aquino Ramos', email: 'caramos@denr.gov.ph', section: 'CENRO San Fernando' },
    employeePosition: 'Environmental Management Specialist I',
    office: 'CENRO San Fernando',
    destination: 'Bauang, La Union',
    destinationLat: 16.5312,
    destinationLng: 120.3328,
    startDate: '2025-01-22',
    endDate: '2025-01-23',
    purpose: 'Coastal cleanup coordination and water sampling',
    status: 'REJECTED_MANUAL',
    aorType: 'Within AOR',
    transportation: 'Government Vehicle',
    createdAt: '2025-01-11T10:30:00Z',
    updatedAt: '2025-01-20T08:00:00Z',
  },
  {
    id: 'seed-6',
    trackingNumber: 'TA-2025-0006',
    createdById: 'user-6',
    createdBy: { id: 'user-6', name: 'Pedro Bautista Santos', email: 'pbsantos@denr.gov.ph', section: 'CENRO Rosario' },
    employeePosition: 'Forester I',
    office: 'CENRO Rosario',
    destination: 'Tubao, La Union',
    destinationLat: 16.3475,
    destinationLng: 120.4131,
    startDate: '2025-01-24',
    endDate: '2025-01-25',
    purpose: 'Protected area boundary demarcation survey',
    status: 'PENDING_HEAD_PENRO',
    aorType: 'Within AOR',
    transportation: 'Government Vehicle',
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: '2025-01-19T15:30:00Z',
  },
  {
    id: 'seed-7',
    trackingNumber: 'TA-2025-0007',
    createdById: 'user-7',
    createdBy: { id: 'user-7', name: 'Luisa Fernandez Tan', email: 'lftan@denr.gov.ph', section: 'PENRO La Union' },
    employeePosition: 'Administrative Aide VI',
    office: 'PENRO La Union',
    destination: 'San Fernando City, La Union',
    destinationLat: 16.6159,
    destinationLng: 120.3209,
    startDate: '2025-01-26',
    endDate: '2025-01-27',
    purpose: 'Procurement submission at Regional Office I',
    status: 'APPROVED',
    aorType: 'Within AOR',
    transportation: 'Public Transport',
    createdAt: '2025-01-16T11:00:00Z',
    updatedAt: '2025-01-17T10:00:00Z',
  },
  {
    id: 'seed-8',
    trackingNumber: 'TA-2025-0008',
    createdById: 'user-8',
    createdBy: { id: 'user-8', name: 'Ricardo Magbanua', email: 'rmagbanua@denr.gov.ph', section: 'CENRO Rosario' },
    employeePosition: 'Environmental Management Specialist III',
    office: 'CENRO Rosario',
    destination: 'Quezon City (EMB Central)',
    destinationLat: 14.6507,
    destinationLng: 121.0504,
    startDate: '2025-02-03',
    endDate: '2025-02-05',
    purpose: 'Air quality technical working group meeting',
    status: 'PENDING_SECTION_CHIEF',
    aorType: 'Outside AOR',
    transportation: 'Public Transport',
    createdAt: '2025-01-18T14:00:00Z',
    updatedAt: '2025-01-18T14:00:00Z',
  },
  {
    id: 'seed-9',
    trackingNumber: 'TA-2025-0009',
    createdById: 'user-9',
    createdBy: { id: 'user-9', name: 'Elena Corpuz Rivera', email: 'ecrivera@denr.gov.ph', section: 'CENRO San Fernando' },
    employeePosition: 'Forest Technician',
    office: 'CENRO San Fernando',
    destination: 'Naguilian, La Union',
    destinationLat: 16.5310,
    destinationLng: 120.3956,
    startDate: '2025-01-28',
    endDate: '2025-01-29',
    purpose: 'Community-based forest management consultation',
    status: 'PENDING_DIVISION_CHIEF',
    aorType: 'Within AOR',
    transportation: 'Government Vehicle',
    createdAt: '2025-01-17T08:45:00Z',
    updatedAt: '2025-01-21T13:00:00Z',
  },
  {
    id: 'seed-10',
    trackingNumber: 'TA-2025-0010',
    createdById: 'user-10',
    createdBy: { id: 'user-10', name: 'Miguel Torres Padilla', email: 'mtpadilla@denr.gov.ph', section: 'CENRO Rosario' },
    employeePosition: 'Administrative Officer II',
    office: 'CENRO Rosario',
    destination: 'San Fernando City, La Union',
    destinationLat: 16.6159,
    destinationLng: 120.3209,
    startDate: '2025-01-30',
    endDate: '2025-01-31',
    purpose: 'Deliver quarterly physical accomplishment reports',
    status: 'REJECTED_MANUAL',
    aorType: 'Within AOR',
    transportation: 'Public Transport',
    createdAt: '2025-01-20T09:30:00Z',
    updatedAt: '2025-01-28T14:00:00Z',
  },
  {
    id: 'seed-11',
    trackingNumber: 'TA-2025-0011',
    createdById: 'user-11',
    createdBy: { id: 'user-11', name: 'Gloria Navarro Sy', email: 'gnsy@denr.gov.ph', section: 'PENRO La Union' },
    employeePosition: 'Environmental Management Specialist II',
    office: 'PENRO La Union',
    destination: 'Agoo, La Union',
    destinationLat: 16.3216,
    destinationLng: 120.3667,
    startDate: '2025-02-01',
    endDate: '2025-02-02',
    purpose: 'Marine protected area compliance audit',
    status: 'APPROVED',
    aorType: 'Within AOR',
    transportation: 'Government Vehicle',
    createdAt: '2025-01-22T10:15:00Z',
    updatedAt: '2025-01-27T09:00:00Z',
  },
  {
    id: 'seed-12',
    trackingNumber: 'TA-2025-0012',
    createdById: 'user-12',
    createdBy: { id: 'user-12', name: 'Antonio Ramos Lim', email: 'arlim@denr.gov.ph', section: 'CENRO San Fernando' },
    employeePosition: 'Forester III',
    office: 'CENRO San Fernando',
    destination: 'Baguio City',
    destinationLat: 16.4023,
    destinationLng: 120.5960,
    startDate: '2025-02-10',
    endDate: '2025-02-12',
    purpose: 'Attend Regional Forestry Sector planning workshop',
    status: 'PENDING_SECTION_CHIEF',
    aorType: 'Outside AOR',
    transportation: 'Public Transport',
    createdAt: '2025-01-25T11:20:00Z',
    updatedAt: '2025-01-25T11:20:00Z',
  },
  {
    id: 'seed-13',
    trackingNumber: 'TA-2025-0013',
    createdById: 'user-13',
    createdBy: { id: 'user-13', name: 'Rosa Diaz Mendez', email: 'rdmendez@denr.gov.ph', section: 'CENRO Rosario' },
    employeePosition: 'Clerk III',
    office: 'CENRO Rosario',
    destination: 'Aringay, La Union',
    destinationLat: 16.3986,
    destinationLng: 120.3551,
    startDate: '2025-02-05',
    endDate: '2025-02-06',
    purpose: 'Deliver land patent notices to beneficiaries',
    status: 'PENDING_DIVISION_CHIEF',
    aorType: 'Within AOR',
    transportation: 'Government Vehicle',
    createdAt: '2025-01-26T13:40:00Z',
    updatedAt: '2025-01-29T16:00:00Z',
  },
  {
    id: 'seed-14',
    trackingNumber: 'TA-2025-0014',
    createdById: 'user-14',
    createdBy: { id: 'user-14', name: 'Fernando Aquino', email: 'faquino@denr.gov.ph', section: 'CENRO Rosario' },
    employeePosition: 'Forester II',
    office: 'CENRO Rosario',
    destination: 'Rosario, La Union',
    destinationLat: 16.2307,
    destinationLng: 120.4856,
    startDate: '2025-02-07',
    endDate: '2025-02-08',
    purpose: 'Patrol along Mt. Palitoc protection forest',
    status: 'APPROVED',
    aorType: 'Within AOR',
    transportation: 'Government Vehicle',
    createdAt: '2025-01-27T08:30:00Z',
    updatedAt: '2025-01-30T10:15:00Z',
  },
  {
    id: 'seed-15',
    trackingNumber: 'TA-2025-0015',
    createdById: 'user-15',
    createdBy: { id: 'user-15', name: 'Teresita Lim Santos', email: 'tlsantos@denr.gov.ph', section: 'PENRO La Union' },
    employeePosition: 'Administrative Aide IV',
    office: 'PENRO La Union',
    destination: 'Bacnotan, La Union',
    destinationLat: 16.7197,
    destinationLng: 120.3542,
    startDate: '2025-02-09',
    endDate: '2025-02-10',
    purpose: 'Coordinate logistics for eco-camp training event',
    status: 'PENDING_SECTION_CHIEF',
    aorType: 'Within AOR',
    transportation: 'Public Transport',
    createdAt: '2025-01-28T14:10:00Z',
    updatedAt: '2025-01-28T14:10:00Z',
  },
];

// Fallback seed user accounts matching PDF Page 13
const seedUserAccounts: UserAccount[] = [
  { id: 'u1', name: 'Maria Santos Cruz', email: 'mscruz@denr.gov.ph', phoneNumber: '09171234567', role: 'EMPLOYEE', status: 'ACTIVE', position: 'Environmental Management Specialist II', section: 'CENRO Rosario', lastLogin: '2025-01-28 08:15', createdAt: '2024-06-10' },
  { id: 'u2', name: 'Jose Reyes Garcia', email: 'jrgarcia@denr.gov.ph', phoneNumber: '09181234567', role: 'EMPLOYEE', status: 'ACTIVE', position: 'Forester II', section: 'CENRO San Fernando', lastLogin: '2025-01-27 09:00', createdAt: '2024-06-12' },
  { id: 'u3', name: 'Ana Mendoza Lopez', email: 'amlopez@denr.gov.ph', phoneNumber: '09191234567', role: 'EMPLOYEE', status: 'ACTIVE', position: 'Administrative Officer III', section: 'PENRO La Union', lastLogin: '2025-01-28 07:45', createdAt: '2024-06-15' },
  { id: 'u4', name: 'Roberto Villanueva', email: 'rvillanueva@denr.gov.ph', phoneNumber: '09201234567', role: 'EMPLOYEE', status: 'ACTIVE', position: 'Forest Technician', section: 'CENRO Rosario', lastLogin: '2025-01-26 14:30', createdAt: '2024-06-20' },
  { id: 'u5', name: 'Carmen Aquino Ramos', email: 'caramos@denr.gov.ph', phoneNumber: '09211234567', role: 'EMPLOYEE', status: 'ACTIVE', position: 'Environmental Management Specialist I', section: 'CENRO San Fernando', lastLogin: '2025-01-25 10:00', createdAt: '2024-07-01' },
  { id: 'u6', name: 'Pedro Bautista Santos', email: 'pbsantos@denr.gov.ph', phoneNumber: '09221234567', role: 'EMPLOYEE', status: 'ACTIVE', position: 'Forester I', section: 'CENRO Rosario', lastLogin: '2025-01-28 08:00', createdAt: '2024-07-05' },
  { id: 'u7', name: 'Luisa Fernandez Tan', email: 'lftan@denr.gov.ph', phoneNumber: '09231234567', role: 'EMPLOYEE', status: 'ACTIVE', position: 'Administrative Aide VI', section: 'PENRO La Union', lastLogin: '2025-01-27 08:30', createdAt: '2024-07-10' },
  { id: 'u8', name: 'Elena Corpuz Rivera', email: 'ecrivera@denr.gov.ph', phoneNumber: '09241234567', role: 'SECTION_CHIEF', status: 'ACTIVE', position: 'Section Chief (Technical Services)', section: 'PENRO La Union', lastLogin: '2025-01-28 09:15', createdAt: '2024-05-01' },
  { id: 'u9', name: 'Juan Dela Cruz', email: 'jdelacruz@denr.gov.ph', phoneNumber: '09251234567', role: 'DIVISION_CHIEF', status: 'ACTIVE', position: 'Division Chief (Management Services)', section: 'PENRO La Union', lastLogin: '2025-01-28 08:45', createdAt: '2024-05-01' },
  { id: 'u10', name: 'Roberto Reyes', email: 'rreyes@denr.gov.ph', phoneNumber: '09261234567', role: 'HEAD_PENRO', status: 'ACTIVE', position: 'PENRO Officer / Head of Office', section: 'PENRO La Union', lastLogin: '2025-01-28 09:30', createdAt: '2024-04-15' },
  { id: 'u11', name: 'Irene O. Cadiz', email: 'iocadiz@denr.gov.ph', phoneNumber: '09271234567', role: 'SECTION_CHIEF', status: 'ACTIVE', position: 'Section Chief (Regulation)', section: 'PENRO La Union', lastLogin: '2025-01-27 15:20', createdAt: '2024-05-10' },
  { id: 'u12', name: 'Luis P. Gonzaga', email: 'lpgonzaga@denr.gov.ph', phoneNumber: '09281234567', role: 'DIVISION_CHIEF', status: 'ACTIVE', position: 'Division Chief (Planning & Program)', section: 'PENRO La Union', lastLogin: '2025-01-27 16:40', createdAt: '2024-05-12' },
  { id: 'u13', name: 'Account Manager', email: 'accountmanager@denr.gov.ph', phoneNumber: '09291234567', role: 'ACCOUNT_MANAGER', status: 'ACTIVE', position: 'HR Management Officer', section: 'PENRO La Union', lastLogin: '2025-01-28 08:00', createdAt: '2024-04-01' },
  { id: 'u14', name: 'System Admin', email: 'admin@denr.gov.ph', phoneNumber: '09301234567', role: 'ADMIN', status: 'ACTIVE', position: 'IT Systems Administrator', section: 'PENRO La Union', lastLogin: '2025-01-28 09:40', createdAt: '2024-03-01' },
];

function AdminPortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const currentTab = searchParams.get('tab') || 'home';

  // Live Data State
  const [taRecords, setTaRecords] = useState<TARecord[]>(seedTARecords);
  const [users, setUsers] = useState<UserAccount[]>(seedUserAccounts);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Common Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterOffice, setFilterOffice] = useState('ALL');
  const [filterAor, setFilterAor] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMonthPreset, setSelectedMonthPreset] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Admin Destination Map Filter State (Day, Week, Custom Range)
  const [mapDateMode, setMapDateMode] = useState<'ALL' | 'DAY' | 'WEEK' | 'CUSTOM'>('ALL');
  const [mapSelectedDay, setMapSelectedDay] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [mapSelectedWeekRef, setMapSelectedWeekRef] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [mapCustomFrom, setMapCustomFrom] = useState('');
  const [mapCustomTo, setMapCustomTo] = useState('');

  // Selected item modals
  const [selectedRecord, setSelectedRecord] = useState<TARecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<TARecord | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  // Search by ID state
  const [searchIdInput, setSearchIdInput] = useState('');
  const [searchIdResult, setSearchIdResult] = useState<TARecord | null>(null);

  // User Management State
  const [userTab, setUserTab] = useState<'employees' | 'staff'>('employees');
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userSectionFilter, setUserSectionFilter] = useState('ALL');

  // Audit Logs Filter State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Pagination for Tables
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch real data from existing APIs
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const reqRes = await fetch('/api/ta-requests');
        if (reqRes.ok) {
          const resData = await reqRes.json();
          if (resData.success && resData.data && resData.data.length > 0) {
            const enriched = resData.data.map((r: any, idx: number) => {
              const aor = r.destination?.toLowerCase().includes('manila') || r.destination?.toLowerCase().includes('baguio') || r.destination?.toLowerCase().includes('quezon') ? 'Outside AOR' : 'Within AOR';
              const transport = idx % 3 === 0 ? 'Airline' : idx % 2 === 0 ? 'Public Transport' : 'Government Vehicle';
              return {
                ...r,
                aorType: aor,
                transportation: transport,
                office: r.createdBy?.section || 'PENRO La Union',
                employeePosition: r.createdBy?.role === 'EMPLOYEE' ? 'Environmental Specialist' : 'Staff Officer',
              };
            });
            setTaRecords(enriched);
          }
        }

        const userRes = await fetch('/api/account-manager/users');
        if (userRes.ok) {
          const uData = await userRes.json();
          if (uData.success && uData.data && uData.data.length > 0) {
            setUsers(uData.data);
          }
        }

        const auditRes = await fetch('/api/admin/audit-logs');
        if (auditRes.ok) {
          const aData = await auditRes.json();
          if (aData.success && aData.data && aData.data.length > 0) {
            setAuditLogs(aData.data);
          }
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check if date range is invalid (Date From > Date To)
  const isDateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  // Filtered TA Records based on active filters and travel date range
  const filteredRecords = useMemo(() => {
    if (isDateRangeInvalid) return [];

    return taRecords.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTracking = r.trackingNumber.toLowerCase().includes(q);
        const matchDest = r.destination.toLowerCase().includes(q);
        const matchEmp = r.createdBy?.name?.toLowerCase().includes(q);
        const matchPurpose = r.purpose.toLowerCase().includes(q);
        if (!matchTracking && !matchDest && !matchEmp && !matchPurpose) return false;
      }
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'APPROVED' && r.status !== 'APPROVED') return false;
        if (filterStatus === 'PENDING' && !r.status.startsWith('PENDING')) return false;
        if (filterStatus === 'REJECTED' && !r.status.startsWith('REJECTED')) return false;
      }
      if (filterOffice !== 'ALL' && r.office !== filterOffice && r.createdBy?.section !== filterOffice) {
        return false;
      }
      if (filterAor !== 'ALL' && r.aorType !== filterAor) {
        return false;
      }
      if (dateFrom || dateTo) {
        if (!isDateWithinRange(r.startDate, dateFrom, dateTo)) return false;
      }
      return true;
    });
  }, [taRecords, searchQuery, filterStatus, filterOffice, filterAor, dateFrom, dateTo, isDateRangeInvalid]);

  // Reset pagination to first page when filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRecords.length, dateFrom, dateTo, searchQuery, filterStatus, filterOffice, filterAor]);

  // Statistics & Metrics Calculations synchronized with filtered dataset
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const approved = filteredRecords.filter((r) => r.status === 'APPROVED').length;
    const onProcess = filteredRecords.filter(
      (r) => r.status === 'PENDING_DIVISION_CHIEF' || r.status === 'PENDING_HEAD_PENRO'
    ).length;
    const pendingOnly = filteredRecords.filter(
      (r) => r.status === 'PENDING_SECTION_CHIEF' || r.status === 'PENDING'
    ).length;
    const pendingTotal = onProcess + pendingOnly;
    const cancelled = filteredRecords.filter((r) => r.status.startsWith('REJECTED')).length;

    const withinAOR = filteredRecords.filter((r) => r.aorType === 'Within AOR').length;
    const outsideAOR = filteredRecords.filter((r) => r.aorType === 'Outside AOR').length;

    const govVehicle = filteredRecords.filter((r) => r.transportation === 'Government Vehicle').length;
    const pubTransport = filteredRecords.filter((r) => r.transportation === 'Public Transport').length;
    const airline = filteredRecords.filter((r) => r.transportation === 'Airline').length;

    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      pending: pendingTotal,
      onProcess,
      pendingOnly,
      approved,
      cancelled,
      withinAOR,
      outsideAOR,
      govVehicle,
      pubTransport,
      airline,
      approvalRate,
    };
  }, [filteredRecords]);

  // Donut chart percentages derived dynamically from filtered metrics
  const donutPercentages = useMemo(() => {
    const total = stats.total;
    if (total === 0) {
      return { approved: 0, onProcess: 0, pending: 0, cancelled: 0 };
    }
    return {
      approved: (stats.approved / total) * 100,
      onProcess: (stats.onProcess / total) * 100,
      pending: (stats.pendingOnly / total) * 100,
      cancelled: (stats.cancelled / total) * 100,
    };
  }, [stats]);

  // Quick Month Preset Handler
  const handleSelectMonthPreset = (monthVal: string) => {
    setSelectedMonthPreset(monthVal);
    if (!monthVal || monthVal === 'ALL') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const [yStr, mStr] = monthVal.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const lastDay = new Date(year, month, 0).getDate();
    setDateFrom(`${yStr}-${mStr}-01`);
    setDateTo(`${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`);
  };

  const handleDateFromChange = (val: string) => {
    setDateFrom(val);
    setSelectedMonthPreset('');
  };

  const handleDateToChange = (val: string) => {
    setDateTo(val);
    setSelectedMonthPreset('');
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedMonthPreset('');
    setSearchQuery('');
    setFilterStatus('ALL');
    setFilterOffice('ALL');
    setFilterAor('ALL');
  };

  // Print / Export Handlers for Monthly Reports & Filtered Records
  const handlePrintReport = () => {
    let dateLabel = 'All Recorded Travel Authorities';
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) {
        dateLabel = formatDateDisplay(dateFrom);
      } else {
        dateLabel = `${formatDateDisplay(dateFrom)} – ${formatDateDisplay(dateTo)}`;
      }
    } else if (dateFrom) {
      dateLabel = `From ${formatDateDisplay(dateFrom)}`;
    } else if (dateTo) {
      dateLabel = `Until ${formatDateDisplay(dateTo)}`;
    }

    printApprovalHistoryReport({
      requests: filteredRecords as any,
      userRole: 'ADMIN',
      userName: (session?.user as any)?.name || 'System Admin',
      userPosition: (session?.user as any)?.position || 'Information Technology Officer I',
      statusFilter: filterStatus !== 'ALL' ? filterStatus : undefined,
      searchQuery: searchQuery || undefined,
      dateRangeLabel: dateLabel,
      reportTitle: 'TOPS Official Monthly Travel Order Report',
    });
  };

  const handleExportCSV = () => {
    const dateStr = dateFrom ? `${dateFrom}_to_${dateTo || 'current'}` : new Date().toISOString().split('T')[0];
    exportApprovalHistoryToCSV(
      filteredRecords as any,
      'ADMIN',
      `TOPS_Monthly_Report_${dateStr}.csv`
    );
  };

  // Destination Map Helpers & State Navigation
  const mapWeekInfo = useMemo(() => {
    return getWeekDateRange(mapSelectedWeekRef);
  }, [mapSelectedWeekRef]);

  const isMapCustomRangeInvalid = Boolean(mapDateMode === 'CUSTOM' && mapCustomFrom && mapCustomTo && mapCustomFrom > mapCustomTo);

  const handlePrevDay = () => {
    const cur = parseUtcDate(mapSelectedDay) || new Date();
    cur.setDate(cur.getDate() - 1);
    setMapSelectedDay(toCalendarDateString(cur) || '');
  };

  const handleNextDay = () => {
    const cur = parseUtcDate(mapSelectedDay) || new Date();
    cur.setDate(cur.getDate() + 1);
    setMapSelectedDay(toCalendarDateString(cur) || '');
  };

  const handleTodayDay = () => {
    setMapSelectedDay(toCalendarDateString(new Date()) || '');
  };

  const handlePrevWeek = () => {
    const cur = parseUtcDate(mapSelectedWeekRef) || new Date();
    cur.setDate(cur.getDate() - 7);
    setMapSelectedWeekRef(toCalendarDateString(cur) || '');
  };

  const handleNextWeek = () => {
    const cur = parseUtcDate(mapSelectedWeekRef) || new Date();
    cur.setDate(cur.getDate() + 7);
    setMapSelectedWeekRef(toCalendarDateString(cur) || '');
  };

  const handleThisWeek = () => {
    setMapSelectedWeekRef(toCalendarDateString(new Date()) || '');
  };

  const handleResetMapFilters = () => {
    setSearchQuery('');
    setFilterStatus('ALL');
    setFilterAor('ALL');
    setMapDateMode('ALL');
    setMapCustomFrom('');
    setMapCustomTo('');
    const todayStr = toCalendarDateString(new Date()) || '';
    setMapSelectedDay(todayStr);
    setMapSelectedWeekRef(todayStr);
  };

  // Destination Map Items filtered by destination search, status, AOR, and selected period (Day, Week, Custom Range)
  const mapItems: TAMapItem[] = useMemo(() => {
    return taRecords
      .filter((r) => {
        if (!r.destinationLat || !r.destinationLng) return false;

        // Destination / keyword search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTracking = r.trackingNumber.toLowerCase().includes(q);
          const matchDest = r.destination.toLowerCase().includes(q);
          const matchEmp = r.createdBy?.name?.toLowerCase().includes(q);
          const matchPurpose = r.purpose.toLowerCase().includes(q);
          if (!matchTracking && !matchDest && !matchEmp && !matchPurpose) return false;
        }

        // Status Filter
        if (filterStatus !== 'ALL') {
          if (filterStatus === 'APPROVED' && r.status !== 'APPROVED') return false;
          if (filterStatus === 'PENDING' && !r.status.startsWith('PENDING')) return false;
          if (filterStatus === 'REJECTED' && !r.status.startsWith('REJECTED')) return false;
        }

        // AOR Filter
        if (filterAor !== 'ALL' && r.aorType !== filterAor) {
          return false;
        }

        // Period Filter (Day, Week, Custom Range)
        if (mapDateMode === 'DAY') {
          if (!mapSelectedDay) return true;
          return isTravelOverlappingPeriod(r.startDate, r.endDate, mapSelectedDay, mapSelectedDay);
        } else if (mapDateMode === 'WEEK') {
          return isTravelOverlappingPeriod(r.startDate, r.endDate, mapWeekInfo.startDate, mapWeekInfo.endDate);
        } else if (mapDateMode === 'CUSTOM') {
          if (mapCustomFrom && mapCustomTo && mapCustomFrom > mapCustomTo) {
            return false;
          }
          if (mapCustomFrom || mapCustomTo) {
            return isTravelOverlappingPeriod(r.startDate, r.endDate, mapCustomFrom || null, mapCustomTo || null);
          }
        }

        return true;
      })
      .map((r) => ({
        id: r.id,
        trackingNumber: r.trackingNumber,
        destination: r.destination,
        purpose: r.purpose,
        employeeName: r.createdBy?.name || 'DENR Personnel',
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        lat: r.destinationLat as number,
        lng: r.destinationLng as number,
      }));
  }, [
    taRecords,
    searchQuery,
    filterStatus,
    filterAor,
    mapDateMode,
    mapSelectedDay,
    mapWeekInfo,
    mapCustomFrom,
    mapCustomTo,
  ]);

  // Helper to render Status Badges (macOS HIG semantic badge style)
  const renderStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
          Approved
        </span>
      );
    }
    if (status === 'PENDING_SECTION_CHIEF' || status === 'PENDING') {
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Pending
        </span>
      );
    }
    if (status === 'PENDING_DIVISION_CHIEF' || status === 'PENDING_HEAD_PENRO') {
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-sky-50 text-sky-700 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
          On Process
        </span>
      );
    }
    if (status.startsWith('REJECTED')) {
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        Draft
      </span>
    );
  };

  // Quick Edit Handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setTaRecords((prev) =>
      prev.map((r) => (r.id === editingRecord.id ? { ...r, ...editingRecord, updatedAt: new Date().toISOString() } : r))
    );
    setEditSuccessMsg(`Travel Order ${editingRecord.trackingNumber} successfully updated.`);
    setTimeout(() => setEditSuccessMsg(''), 4000);
    setEditingRecord(null);
  };

  // Search by ID Handler
  const handleSearchById = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchIdInput.trim()) return;
    const found = taRecords.find(
      (r) => r.trackingNumber.toLowerCase() === searchIdInput.trim().toLowerCase()
    );
    setSearchIdResult(found || null);
  };

  /* -------------------------------------------------------------------------- */
  /* TAB 1: HOME (Admin Dashboard) — Matching PDF Page 1                       */
  /* -------------------------------------------------------------------------- */
  const renderHomeTab = () => (
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F4C2E] to-[#1B4332] text-white p-5 rounded-[8px] border border-emerald-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">Admin Dashboard</h2>
          <p className="text-[13px] text-emerald-100/90 mt-0.5">
            Travel Order Processing System (TOPS) — DENR-PENRO Agusan del Norte
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-100 bg-white/10 px-3 py-1.5 rounded-[6px] border border-white/20">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#1B4332] shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-normal text-slate-600 shrink-0">
            <span className="font-medium text-[#1B4332]">Date From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className={`h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] ${
                isDateRangeInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            <span className="font-medium text-[#1B4332]">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className={`h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] ${
                isDateRangeInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
              }`}
            />

            {/* Quick Month Filter Preset */}
            <select
              value={selectedMonthPreset}
              onChange={(e) => handleSelectMonthPreset(e.target.value)}
              className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] cursor-pointer"
            >
              <option value="">Month Preset...</option>
              <option value="ALL">All Dates (Clear)</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
            </select>

            {(dateFrom || dateTo || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-64 relative">
              <input
                type="text"
                placeholder="Search TA number, employee, or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 px-2.5 pl-8 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
              />
              <svg className="w-3.5 h-3.5 text-[#1B4332] absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Export / Print Monthly Report Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#0F4C2E] text-white transition-colors shrink-0 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Report</span>
                <svg className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-[8px] shadow-xl border border-emerald-200 p-1.5 z-40 text-[13px] animate-fade-in space-y-1">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handlePrintReport();
                      }}
                      className="w-full px-3 py-2 text-left rounded-[6px] hover:bg-emerald-50 text-[#1D1D1F] hover:text-[#1B4332] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <div>
                        <div className="font-semibold text-[#1D1D1F] text-[13px]">Print / Save as PDF</div>
                        <div className="text-[11px] text-[#86868B]">Official printable summary report</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportCSV();
                      }}
                      className="w-full px-3 py-2 text-left rounded-[6px] hover:bg-emerald-50 text-[#1D1D1F] hover:text-[#1B4332] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div>
                        <div className="font-semibold text-[#1D1D1F] text-[13px]">Export to CSV / Excel</div>
                        <div className="text-[11px] text-[#86868B]">Download spreadsheet file</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Invalid Date Range Warning */}
        {isDateRangeInvalid && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center justify-between text-[13px] text-rose-800 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><strong>Invalid Date Range:</strong> Date From cannot be later than To date.</span>
            </div>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-[12px] font-semibold text-rose-900 underline hover:text-rose-700 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#1B4332] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">TOTAL TRAVEL AUTHORITIES</p>
            <p className="text-[24px] font-bold tracking-tight text-[#1B4332] mt-1">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-emerald-50 text-[#1B4332] border border-emerald-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">PENDING / ON PROCESS</p>
            <p className="text-[24px] font-bold tracking-tight text-amber-700 mt-1">{stats.pending}</p>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">APPROVED ORDERS</p>
            <p className="text-[24px] font-bold tracking-tight text-emerald-800 mt-1">{stats.approved}</p>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-rose-500 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">CANCELLED / RETURNED</p>
            <p className="text-[24px] font-bold tracking-tight text-rose-700 mt-1">{stats.cancelled}</p>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3 Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Donut Chart - Status Breakdown */}
        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] border-t-4 border-t-[#1B4332] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
              <h3 className="text-[14px] font-semibold text-[#1B4332]">Status Distribution</h3>
              <span className="h-5 inline-flex items-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-[#1B4332] border border-emerald-200">{stats.total} total</span>
            </div>
            <div className="h-44 flex items-center justify-center my-2 relative">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#F1F5F9" strokeWidth="4" />
                {stats.total > 0 && (
                  <>
                    {donutPercentages.approved > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="4"
                        pathLength="100"
                        strokeDasharray={`${donutPercentages.approved} 100`}
                        strokeDashoffset="0"
                      />
                    )}
                    {donutPercentages.onProcess > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke="#0284C7"
                        strokeWidth="4"
                        pathLength="100"
                        strokeDasharray={`${donutPercentages.onProcess} 100`}
                        strokeDashoffset={`${-donutPercentages.approved}`}
                      />
                    )}
                    {donutPercentages.pending > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke="#F59E0B"
                        strokeWidth="4"
                        pathLength="100"
                        strokeDasharray={`${donutPercentages.pending} 100`}
                        strokeDashoffset={`${-(donutPercentages.approved + donutPercentages.onProcess)}`}
                      />
                    )}
                    {donutPercentages.cancelled > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke="#EF4444"
                        strokeWidth="4"
                        pathLength="100"
                        strokeDasharray={`${donutPercentages.cancelled} 100`}
                        strokeDashoffset={`${-(donutPercentages.approved + donutPercentages.onProcess + donutPercentages.pending)}`}
                      />
                    )}
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[24px] font-bold tracking-tight text-[#1B4332]">{stats.total}</span>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Requests</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2.5 text-[12px] font-medium text-slate-700 border-t border-slate-100">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved ({stats.approved})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-600"></span> On Process ({stats.onProcess})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending ({stats.pendingOnly})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Returned ({stats.cancelled})</span>
          </div>
        </div>

        {/* Chart 2: Vertical Bar Chart - Within AOR vs Outside AOR */}
        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] border-t-4 border-t-emerald-600 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
              <h3 className="text-[14px] font-semibold text-[#1B4332]">AOR Jurisdiction</h3>
              <span className="h-5 inline-flex items-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">Coverage</span>
            </div>
            <div className="h-44 flex items-end justify-center gap-10 pt-4 pb-2">
              <div className="flex flex-col items-center gap-1.5 w-16">
                <span className="text-[13px] font-semibold text-[#1B4332]">{stats.withinAOR}</span>
                <div
                  style={{ height: `${Math.max(16, (stats.withinAOR / (stats.total || 1)) * 120)}px` }}
                  className="w-full bg-[#1B4332] rounded-t transition-all hover:opacity-90"
                />
                <span className="text-[12px] font-medium text-slate-600 text-center">Within AOR</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 w-16">
                <span className="text-[13px] font-semibold text-[#40916C]">{stats.outsideAOR}</span>
                <div
                  style={{ height: `${Math.max(16, (stats.outsideAOR / (stats.total || 1)) * 120)}px` }}
                  className="w-full bg-[#40916C] rounded-t transition-all hover:opacity-90"
                />
                <span className="text-[12px] font-medium text-slate-600 text-center">Outside AOR</span>
              </div>
            </div>
          </div>
          <div className="pt-2 text-center text-[12px] text-slate-500 border-t border-slate-100">
            Regional Area of Responsibility Breakdown
          </div>
        </div>

        {/* Chart 3: Horizontal Bar Chart - Transportation Mode */}
        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] border-t-4 border-t-sky-600 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-sky-100">
              <h3 className="text-[14px] font-semibold text-[#1B4332]">Transportation Mode</h3>
              <span className="h-5 inline-flex items-center px-2 text-[10px] font-semibold rounded-[4px] bg-sky-50 text-sky-700 border border-sky-200">Breakdown</span>
            </div>
            <div className="h-44 flex flex-col justify-center space-y-3 py-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[13px] font-normal">
                  <span className="text-slate-700">Government Vehicle</span>
                  <span className="font-semibold text-[#1B4332]">{stats.govVehicle}</span>
                </div>
                <div className="h-2 bg-emerald-100/60 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(stats.govVehicle / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-[#1B4332] rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[13px] font-normal">
                  <span className="text-slate-700">Public Transport</span>
                  <span className="font-semibold text-emerald-700">{stats.pubTransport}</span>
                </div>
                <div className="h-2 bg-emerald-100/60 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(stats.pubTransport / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-[#40916C] rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[13px] font-normal">
                  <span className="text-slate-700">Commercial Airline</span>
                  <span className="font-semibold text-sky-700">{stats.airline}</span>
                </div>
                <div className="h-2 bg-sky-100/60 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(stats.airline / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-sky-600 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2 text-center text-[12px] text-slate-500 border-t border-slate-100">
            Vehicular and Transit Distribution
          </div>
        </div>
      </div>

      {/* Bottom Alert Banner */}
      <div className="p-3.5 bg-amber-50/90 border border-amber-200 border-l-4 border-l-amber-500 rounded-[8px] flex items-center justify-between text-[13px] text-amber-900">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span><strong>{stats.cancelled} Travel Order request(s) returned</strong> for revision by reviewing officials.</span>
        </div>
        <button
          onClick={() => router.push('/admin?tab=cancelled')}
          className="text-[13px] font-semibold text-amber-900 hover:underline"
        >
          View Cancelled Requests →
        </button>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 2: DATA (Travel Authority Data Cards) — Matching PDF Page 2            */
  /* -------------------------------------------------------------------------- */
  const renderDataTab = () => (
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div className="bg-gradient-to-r from-[#0F4C2E] to-[#1B4332] text-white p-5 rounded-[8px] border border-emerald-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">Travel Order Data</h2>
          <p className="text-[13px] text-emerald-100/90 mt-0.5">Card-based overview of active and archived Travel Orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors shrink-0"
            title="Print Monthly / Filtered Report"
          >
            <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" />
            </svg>
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors shrink-0"
            title="Export CSV / Excel"
          >
            <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV</span>
          </button>
          <span className="text-[12px] text-emerald-100 font-medium bg-white/10 px-2.5 py-1 rounded-[6px] border border-white/20">
            Showing {filteredRecords.length} of {taRecords.length} records
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#1B4332] shadow-xs space-y-3">
        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-normal text-slate-600">
          <span className="font-medium text-[#1B4332]">Date From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className={`h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] ${
              isDateRangeInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
            }`}
          />
          <span className="font-medium text-[#1B4332]">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className={`h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] ${
              isDateRangeInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
            }`}
          />
          <select
            value={selectedMonthPreset}
            onChange={(e) => handleSelectMonthPreset(e.target.value)}
            className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] cursor-pointer"
          >
            <option value="">Month Preset...</option>
            <option value="ALL">All Dates (Clear)</option>
            <option value="2026-10">October 2026</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
          </select>
          {(dateFrom || dateTo || searchQuery || filterStatus !== 'ALL' || filterOffice !== 'ALL' || filterAor !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>

        {/* Invalid Date Range Warning */}
        {isDateRangeInvalid && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-[6px] text-[13px] text-rose-800 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong>Invalid date range</strong> — "Date From" is after "Date To". Please correct to see results.
          </div>
        )}

        {/* Search + Status + Office + AOR Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Search by TA#, employee, destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending / On Process</option>
              <option value="REJECTED">Cancelled / Returned</option>
            </select>
          </div>

          <div>
            <select
              value={filterOffice}
              onChange={(e) => setFilterOffice(e.target.value)}
              className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
            >
              <option value="ALL">All Offices</option>
              <option value="CENRO Rosario">CENRO Rosario</option>
              <option value="CENRO San Fernando">CENRO San Fernando</option>
              <option value="PENRO La Union">PENRO La Union</option>
            </select>
          </div>

          <div>
            <select
              value={filterAor}
              onChange={(e) => setFilterAor(e.target.value)}
              className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
            >
              <option value="ALL">All AOR</option>
              <option value="Within AOR">Within AOR</option>
              <option value="Outside AOR">Outside AOR</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs p-8">
            <svg className="w-10 h-10 text-[#86868B] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold text-[#1D1D1F] text-[14px]">No Travel Authorities match the selected criteria</p>
            <p className="text-[#86868B] text-[13px] mt-1">
              {(dateFrom || dateTo)
                ? `No travel records found within ${dateFrom && dateTo ? `${formatDateDisplay(dateFrom)} to ${formatDateDisplay(dateTo)}` : 'the selected date range'}.`
                : 'Try adjusting your search query, status, office, or AOR filters.'}
            </p>
            {(dateFrom || dateTo || searchQuery || filterStatus !== 'ALL' || filterOffice !== 'ALL' || filterAor !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="mt-3 h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#0F4C2E] text-white transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          filteredRecords.map((req) => (
            <div
              key={req.id}
              onClick={() => setSelectedRecord(req)}
              className={`bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 ${
                req.status === 'APPROVED'
                  ? 'border-l-emerald-500'
                  : req.status.startsWith('REJECTED')
                  ? 'border-l-rose-500'
                  : req.status === 'PENDING_DIVISION_CHIEF' || req.status === 'PENDING_HEAD_PENRO'
                  ? 'border-l-sky-500'
                  : 'border-l-amber-500'
              } shadow-xs hover:bg-emerald-50/40 hover:border-emerald-300 transition-colors cursor-pointer space-y-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[12px] font-semibold text-[#1B4332] bg-emerald-50 px-2 py-0.5 rounded-[4px] border border-emerald-200">
                    {req.trackingNumber}
                  </span>
                  <h4 className="text-[14px] font-semibold text-[#1D1D1F] mt-1.5">{req.createdBy?.name || 'Juan Dela Cruz'}</h4>
                  <p className="text-[12px] text-slate-500">{req.employeePosition} — {req.office}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRecord(req);
                    }}
                    className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#1B4332] transition-colors"
                    title="Edit Travel Order"
                  >
                    <svg className="w-3 h-3 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  {renderStatusBadge(req.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 text-[13px]">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Destination</span>
                  <span className="font-medium text-[#1D1D1F] line-clamp-1">{req.destination}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Travel Date</span>
                  <span className="font-normal text-[#1D1D1F]">
                    {req.endDate && toCalendarDateString(req.startDate) !== toCalendarDateString(req.endDate)
                      ? `${formatDateDisplay(req.startDate)} – ${formatDateDisplay(req.endDate)}`
                      : formatDateDisplay(req.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">AOR Scope</span>
                  <span className="font-medium text-[#1B4332]">{req.aorType}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Transportation</span>
                  <span className="font-normal text-[#1D1D1F]">{req.transportation}</span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Purpose</span>
                <p className="text-[13px] font-normal text-slate-700 line-clamp-2 mt-0.5">{req.purpose}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 3: TABLES (Travel Authority Records Table) — Matching PDF Page 3       */
  /* -------------------------------------------------------------------------- */
  const renderTablesTab = () => {
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
    const paginated = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
        <div className="bg-gradient-to-r from-[#0F4C2E] to-[#1B4332] text-white p-5 rounded-[8px] border border-emerald-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-white">Travel Order Records</h2>
            <p className="text-[13px] text-emerald-100/90 mt-0.5">Master tabular registry of all Travel Orders</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReport}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors shrink-0"
              title="Print Monthly / Filtered Report"
            >
              <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" />
              </svg>
              <span>Print Report</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors shrink-0"
              title="Export CSV / Excel"
            >
              <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white p-3.5 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#1B4332] shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-normal text-slate-600 shrink-0">
              <span className="font-medium text-[#1B4332]">Date From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className={`h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] ${
                  isDateRangeInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                }`}
              />
              <span className="font-medium text-[#1B4332]">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className={`h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] ${
                  isDateRangeInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                }`}
              />
              <select
                value={selectedMonthPreset}
                onChange={(e) => handleSelectMonthPreset(e.target.value)}
                className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] cursor-pointer"
              >
                <option value="">Month Preset...</option>
                <option value="ALL">All Dates (Clear)</option>
                <option value="2026-10">October 2026</option>
                <option value="2026-09">September 2026</option>
                <option value="2026-08">August 2026</option>
              </select>
              {(dateFrom || dateTo || searchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                  title="Reset all filters"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 px-2.5 pl-8 text-[13px] text-[#1D1D1F] bg-slate-50/70 focus:bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
              />
              <svg className="w-3.5 h-3.5 text-[#1B4332] absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Invalid Date Range Warning */}
          {isDateRangeInvalid && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-[6px] text-[13px] text-rose-800 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <strong>Invalid date range</strong> — "Date From" is after "Date To". Please correct to see results.
            </div>
          )}
        </div>

        {/* Tabular Registry */}
        <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-950/[0.04] border-b border-emerald-900/10">
                <tr>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#1B4332] whitespace-nowrap text-left">TA Number</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#1B4332] whitespace-nowrap text-left">Employee</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#1B4332] whitespace-nowrap text-left">Destination</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#1B4332] whitespace-nowrap text-left">Travel Date</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#1B4332] whitespace-nowrap text-center">Status</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#1B4332] whitespace-nowrap text-left">Submitted</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#1B4332] whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-3 text-center text-[#86868B]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <svg className="w-8 h-8 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-semibold text-[#1D1D1F] text-[14px]">No Travel Order records found</p>
                        <p className="text-[#86868B] text-[13px]">
                          {dateFrom || dateTo || searchQuery || filterStatus !== 'ALL'
                            ? 'No records match the current date range or search criteria.'
                            : 'No records exist in the database.'}
                        </p>
                        {(dateFrom || dateTo || searchQuery) && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-[#1B4332] border border-emerald-200 transition-colors"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((req) => (
                    <tr key={req.id} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors">
                      <td className="px-3 py-1.5 text-[13px] align-middle text-left">
                        <span className="font-mono text-[12px] font-semibold text-[#1B4332] bg-emerald-50 px-2 py-0.5 rounded-[4px] border border-emerald-200">
                          {req.trackingNumber}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">
                        <p className="font-medium text-[#1D1D1F]">{req.createdBy?.name || 'Juan Dela Cruz'}</p>
                        <p className="text-[12px] text-slate-500">{req.employeePosition}</p>
                      </td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">{req.destination}</td>
                      <td className="px-3 py-1.5 text-[13px] text-slate-600 align-middle text-left">
                        {formatDateDisplay(req.startDate)}
                      </td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">{renderStatusBadge(req.status)}</td>
                      <td className="px-3 py-1.5 text-[13px] text-slate-500 align-middle text-left">{formatDateDisplay(req.createdAt)}</td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRecord(req)}
                          className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#1B4332] transition-colors"
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingRecord(req)}
                          className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#1B4332] hover:bg-[#0F4C2E] text-white transition-colors"
                          title="Edit TA"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-3 py-2.5 border-t border-emerald-900/10 flex items-center justify-between text-[12px] text-slate-600 bg-emerald-950/[0.02]">
            <span>
              Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1 || filteredRecords.length === 0}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 border border-slate-200 bg-white hover:bg-emerald-50 text-slate-700 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors ${
                    currentPage === pg
                      ? 'bg-[#1B4332] text-white'
                      : 'border border-slate-200 bg-white hover:bg-emerald-50 text-slate-700'
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages || filteredRecords.length === 0}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 border border-slate-200 bg-white hover:bg-emerald-50 text-slate-700 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* -------------------------------------------------------------------------- */
  /* TAB 4: CANCELLED (Cancelled TAs) — Matching PDF Page 4                     */
  /* -------------------------------------------------------------------------- */
  const renderCancelledTab = () => {
    const cancelledList = taRecords.filter((r) => r.status.startsWith('REJECTED'));

    return (
      <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Cancelled Travel Authorities</h2>
          <p className="text-[13px] text-[#86868B] mt-0.5">Records of rejected, withdrawn, or expired Travel Authorities</p>
        </div>

        {/* Count Card */}
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-red-50 text-red-700 border border-red-200 flex items-center justify-center font-bold text-sm">
            ✕
          </div>
          <div>
            <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">{cancelledList.length}</p>
            <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Total Cancelled Records</p>
          </div>
        </div>

        {/* Cancelled List */}
        <div className="space-y-3">
          {cancelledList.map((req) => (
            <div key={req.id} className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[#1D1D1F] text-[13px]">{req.trackingNumber}</span>
                  <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-red-50 text-red-700 border border-red-200">
                    Cancelled
                  </span>
                </div>
                <span className="text-[12px] text-[#86868B]">Date: {new Date(req.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Employee</span>
                  <p className="font-semibold text-[#1D1D1F]">{req.createdBy?.name || 'DENR Personnel'}</p>
                  <p className="text-[12px] text-[#86868B]">{req.employeePosition} — {req.office}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Destination</span>
                  <p className="font-semibold text-[#1D1D1F]">{req.destination}</p>
                  <p className="text-[12px] text-[#86868B]">Travel Date: {new Date(req.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Cancellation Reason</span>
                  <p className="text-[12px] text-red-700 bg-red-50 p-2 rounded-[6px] border border-red-200 leading-relaxed font-normal mt-0.5">
                    {req.status === 'REJECTED_OVERDUE'
                      ? 'Expired automatically — departure date passed before final signatory approval.'
                      : 'Inspection rescheduled due to administrative priorities or weather advisories.'}
                  </p>
                </div>
              </div>

              {/* History Bar */}
              <div className="pt-2 border-t border-[#E5E5E7] flex items-center gap-2 text-[12px] text-[#86868B] flex-wrap">
                <span className="text-[#86868B] font-medium">History:</span>
                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]">Submitted ({new Date(req.createdAt).toLocaleDateString()})</span>
                <span>→</span>
                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]">Section Chief Review</span>
                <span>→</span>
                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-red-50 text-red-700 border border-red-200">Cancelled ({new Date(req.updatedAt).toLocaleDateString()})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* -------------------------------------------------------------------------- */
  /* TAB 5: SEARCH BY ID — Matching PDF Page 5                                  */
  /* -------------------------------------------------------------------------- */
  const renderSearchTab = () => (
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Search by ID</h2>
        <p className="text-[13px] text-[#86868B] mt-0.5">Find a specific Travel Order by its unique reference tracking number</p>
      </div>

      <form onSubmit={handleSearchById} className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter complete TA number (e.g., TA-2025-0001)..."
            value={searchIdInput}
            onChange={(e) => setSearchIdInput(e.target.value)}
            className="flex-1 h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          />
          <button
            type="submit"
            className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#143225] text-white transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {searchIdResult && (
        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E7]">
            <div>
              <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold font-mono rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                {searchIdResult.trackingNumber}
              </span>
              <h3 className="text-[14px] font-semibold text-[#1D1D1F] mt-1.5">{searchIdResult.destination}</h3>
              <p className="text-[13px] text-[#86868B]">{searchIdResult.purpose}</p>
            </div>
            <div>{renderStatusBadge(searchIdResult.status)}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
            <div className="p-2.5 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Employee</span>
              <span className="font-semibold text-[#1D1D1F]">{searchIdResult.createdBy?.name || 'Juan Dela Cruz'}</span>
            </div>
            <div className="p-2.5 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Station</span>
              <span className="font-semibold text-[#1D1D1F]">{searchIdResult.office}</span>
            </div>
            <div className="p-2.5 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Travel Date</span>
              <span className="font-semibold text-[#1D1D1F]">{new Date(searchIdResult.startDate).toLocaleDateString()}</span>
            </div>
            <div className="p-2.5 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Transportation</span>
              <span className="font-semibold text-[#1D1D1F]">{searchIdResult.transportation}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setSelectedRecord(searchIdResult)}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
            >
              View Document Details →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 6: EDIT (Edit TA) — Matching PDF Page 6                                */
  /* -------------------------------------------------------------------------- */
  const renderEditTab = () => (
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Edit Travel Order</h2>
        <p className="text-[13px] text-[#86868B] mt-0.5">Search and modify permitted Travel Order records</p>
      </div>

      {editSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[6px] text-[13px] font-semibold text-emerald-700">
          ✓ {editSuccessMsg}
        </div>
      )}

      {/* Find Box */}
      <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-2.5">
        <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">FIND TRAVEL AUTHORITY</span>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter TA Number (e.g., TA-2025-0001)..."
            value={searchIdInput}
            onChange={(e) => setSearchIdInput(e.target.value)}
            className="flex-1 h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          />
          <button
            onClick={() => {
              const f = taRecords.find((r) => r.trackingNumber.toLowerCase() === searchIdInput.trim().toLowerCase());
              if (f) setEditingRecord(f);
            }}
            className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#143225] text-white transition-colors"
          >
            Find
          </button>
        </div>
      </div>

      {/* Quick Select List */}
      <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs p-4 space-y-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Quick Select — Recent Travel Authorities</h3>
          <p className="text-[12px] text-[#86868B] mt-0.5">Select a record to load for modification</p>
        </div>

        <div className="divide-y divide-[#E5E5E7] text-[13px]">
          {taRecords.slice(0, 6).map((req) => (
            <div key={req.id} className="h-[42px] flex items-center justify-between hover:bg-[#F2F2F7] px-2 rounded-[6px] transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-[#1B4332]">{req.trackingNumber}</span>
                <span className="font-normal text-[#1D1D1F]">{req.createdBy?.name || 'Juan Dela Cruz'}</span>
                <span className="text-[#86868B] hidden sm:inline">{req.destination}</span>
              </div>
              <button
                onClick={() => setEditingRecord(req)}
                className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-white hover:bg-[#F2F2F7] border border-[#E5E5E7] text-[#1B4332] transition-colors"
              >
                Edit →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 7: APPROVAL MONITORING — Matching PDF Page 7                           */
  /* -------------------------------------------------------------------------- */
  const renderApprovalMonitoringTab = () => (
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Approval Monitoring</h2>
        <p className="text-[13px] text-[#86868B] mt-0.5">Track Travel Authority requests through the hierarchical approval workflow</p>
      </div>

      {/* 5-Stage Pipeline Stepper */}
      <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-3">
        <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">APPROVAL PIPELINE STAGES</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { step: '1', label: 'Employee', count: 2, sub: 'Submitted', color: 'bg-emerald-50/70 border-emerald-200/80' },
            { step: '2', label: 'Section Chief', count: 3, sub: 'Verification', color: 'bg-amber-50/70 border-amber-200/80' },
            { step: '3', label: 'Division Chief', count: 2, sub: 'Verification', color: 'bg-sky-50/70 border-sky-200/80' },
            { step: '4', label: 'PENRO Head', count: 1, sub: 'Final Signatory', color: 'bg-purple-50/70 border-purple-200/80' },
            { step: '5', label: 'Completed', count: stats.approved, sub: 'Approved', color: 'bg-emerald-100/70 border-emerald-300/80' },
          ].map((st) => (
            <div key={st.step} className={`p-3 rounded-[6px] border text-center ${st.color}`}>
              <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F] block">{st.count}</span>
              <span className="text-[13px] font-semibold text-[#1D1D1F] block mt-0.5">{st.label}</span>
              <span className="text-[12px] text-[#86868B] font-normal">{st.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-4 bg-white rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-slate-400 text-center shadow-xs">
          <span className="text-[24px] font-bold tracking-tight text-slate-800">4</span>
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mt-0.5">PENDING</p>
        </div>
        <div className="p-4 bg-white rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-sky-500 text-center shadow-xs">
          <span className="text-[24px] font-bold tracking-tight text-sky-700">3</span>
          <p className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider mt-0.5">IN REVIEW</p>
        </div>
        <div className="p-4 bg-white rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 text-center shadow-xs">
          <span className="text-[24px] font-bold tracking-tight text-emerald-700">{stats.approved}</span>
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mt-0.5">APPROVED</p>
        </div>
        <div className="p-4 bg-white rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-rose-500 text-center shadow-xs">
          <span className="text-[24px] font-bold tracking-tight text-rose-700">{stats.cancelled}</span>
          <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider mt-0.5">RETURNED</p>
        </div>
        <div className="p-4 bg-white rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 text-center shadow-xs">
          <span className="text-[24px] font-bold tracking-tight text-amber-700">3</span>
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mt-0.5">OVERDUE</p>
        </div>
      </div>

      {/* Turnaround & Bottleneck Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#0F4C2E] shadow-xs">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1">Average Processing Time</span>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">2.4 <span className="text-[13px] font-normal text-[#86868B]">days</span></p>
          <p className="text-[12px] text-[#86868B] mt-1">Average time from employee submission to final approval</p>
        </div>

        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">Current Bottleneck Stage</span>
          <p className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Section Chief Review</p>
          <p className="text-[12px] text-[#86868B] mt-1">3 requests pending at this stage — avg. wait 4.7 days</p>
        </div>
      </div>

      {/* Overdue Warning */}
      <div className="p-3.5 bg-red-50 border border-red-200 rounded-[8px] text-[13px] text-red-700 space-y-0.5">
        <p className="font-semibold flex items-center gap-1.5">
          <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          3 Overdue Approvals Detected
        </p>
        <p className="text-red-700 text-[12px]">
          TA-2025-0003, TA-2025-0008, TA-2025-0015 — waiting 5+ days at current verification stage.
        </p>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 8: TRAVEL ANALYTICS — Matching PDF Pages 8-9                           */
  /* -------------------------------------------------------------------------- */
  const renderTravelAnalyticsTab = () => (
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Travel Analytics</h2>
        <p className="text-[13px] text-[#86868B] mt-0.5">Institutional travel patterns, volume metrics, and destination distribution</p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">TOTAL REQUESTS</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">WITHIN AOR</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">{stats.withinAOR}</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">OUTSIDE AOR</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">{stats.outsideAOR}</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">TRANSPORT TYPES</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">3</p>
        </div>
      </div>

      {/* Row 1 Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-3">Within AOR vs Outside AOR</h3>
          <div className="h-44 flex items-center justify-center">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#0284C7" strokeWidth="4" strokeDasharray="27 100" strokeDashoffset="0" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10B981" strokeWidth="4" strokeDasharray="73 100" strokeDashoffset="-27" />
            </svg>
          </div>
          <div className="flex justify-center gap-6 text-[12px] font-normal text-[#1D1D1F] pt-2 border-t border-[#E5E5E7]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Within AOR ({stats.withinAOR})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Outside AOR ({stats.outsideAOR})</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-3">Travel Request Trends</h3>
          <div className="h-44 flex items-end justify-between px-4 pb-2 pt-4">
            {[
              { month: 'Oct', count: 8 },
              { month: 'Nov', count: 12 },
              { month: 'Dec', count: 6 },
              { month: 'Jan', count: 15 },
            ].map((m) => (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[13px] font-semibold text-[#1D1D1F]">{m.count}</span>
                <div style={{ height: `${m.count * 8}px` }} className="w-7 bg-[#1B4332] rounded-t" />
                <span className="text-[12px] text-[#86868B]">{m.month}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[12px] text-[#86868B] border-t border-[#E5E5E7] pt-2">Monthly Request Volume</p>
        </div>
      </div>

      {/* Row 2 Destination Breakdown */}
      <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-3">
        <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Frequently Visited Destinations</h3>
        <div className="space-y-2 text-[13px]">
          {[
            { name: 'Baguio City', count: 5, color: '#1B4332' },
            { name: 'San Fernando City, La Union', count: 4, color: '#2D6A4F' },
            { name: 'Candon City, Ilocos Sur', count: 2, color: '#40916C' },
            { name: 'Manila (DENR Central Office)', count: 2, color: '#52B788' },
            { name: 'Pugo, La Union', count: 2, color: '#74C69D' },
          ].map((d) => (
            <div key={d.name} className="space-y-0.5">
              <div className="flex justify-between text-[13px] font-normal">
                <span className="text-[#1D1D1F]">{d.name}</span>
                <span className="font-semibold text-[#1D1D1F]">{d.count} requests</span>
              </div>
              <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                <div style={{ width: `${(d.count / 5) * 100}%`, backgroundColor: d.color }} className="h-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 9: DESTINATION MAP — Matching PDF Page 10                              */
  /* -------------------------------------------------------------------------- */
  const renderDestinationMapTab = () => (
    <div className="space-y-4 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Destination Map</h2>
          <p className="text-[13px] text-[#86868B] mt-0.5">Geographic distribution of travel destinations based on real Travel Authorities</p>
        </div>
        <div className="flex items-center gap-2">
          {mapDateMode !== 'ALL' && (
            <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]">
              Filter: {mapDateMode === 'DAY' ? 'Single Day' : mapDateMode === 'WEEK' ? 'Week' : 'Custom Range'}
            </span>
          )}
          <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
            {mapItems.length} {mapItems.length === 1 ? 'Destination' : 'Destinations'} on map
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              placeholder="Search destination name, tracking #, employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 px-2.5 pl-8 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
            />
            <svg className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          >
            <option value="ALL">All Status</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Active / Pending</option>
            <option value="REJECTED">Cancelled / Overdue</option>
          </select>

          <select
            value={filterAor}
            onChange={(e) => setFilterAor(e.target.value)}
            className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          >
            <option value="ALL">All AOR</option>
            <option value="Within AOR">Within AOR</option>
            <option value="Outside AOR">Outside AOR</option>
          </select>

          {/* Period Selector Tabs (All Dates, Day, Week, Custom Range) */}
          <div className="flex items-center gap-1 bg-[#F5F5F7] p-0.5 rounded-[6px] border border-[#E5E5E7]">
            <button
              type="button"
              onClick={() => setMapDateMode('ALL')}
              className={`h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors ${
                mapDateMode === 'ALL'
                  ? 'bg-[#1B4332] text-white'
                  : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]'
              }`}
            >
              All Dates
            </button>
            <button
              type="button"
              onClick={() => setMapDateMode('DAY')}
              className={`h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors ${
                mapDateMode === 'DAY'
                  ? 'bg-[#1B4332] text-white'
                  : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setMapDateMode('WEEK')}
              className={`h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors ${
                mapDateMode === 'WEEK'
                  ? 'bg-[#1B4332] text-white'
                  : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setMapDateMode('CUSTOM')}
              className={`h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors ${
                mapDateMode === 'CUSTOM'
                  ? 'bg-[#1B4332] text-white'
                  : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]'
              }`}
            >
              Custom Range
            </button>
          </div>

          <button
            onClick={handleResetMapFilters}
            className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Dynamic Controls based on selected Period */}
        {mapDateMode !== 'ALL' && (
          <div className="pt-2 border-t border-[#E5E5E7] flex flex-wrap items-center justify-between gap-3 text-[13px]">
            {mapDateMode === 'DAY' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#1D1D1F]">Selected Day:</span>
                <button
                  type="button"
                  title="Previous Day"
                  onClick={handlePrevDay}
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
                >
                  ◀
                </button>
                <input
                  type="date"
                  value={mapSelectedDay}
                  onChange={(e) => setMapSelectedDay(e.target.value)}
                  className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                />
                <button
                  type="button"
                  title="Next Day"
                  onClick={handleNextDay}
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={handleTodayDay}
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#1B4332] hover:bg-[#143225] text-white transition-colors"
                >
                  Today
                </button>
                <span className="text-[12px] text-[#86868B] ml-1">
                  Showing destinations active on <strong className="text-[#1D1D1F]">{formatDateDisplay(mapSelectedDay)}</strong>
                </span>
              </div>
            )}

            {mapDateMode === 'WEEK' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#1D1D1F]">Selected Week:</span>
                <button
                  type="button"
                  title="Previous Week"
                  onClick={handlePrevWeek}
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
                >
                  ◀
                </button>
                <span className="h-7 px-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[6px] font-semibold text-xs inline-flex items-center">
                  📅 {mapWeekInfo.label}
                </span>
                <button
                  type="button"
                  title="Next Week"
                  onClick={handleNextWeek}
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={handleThisWeek}
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
                >
                  This Week
                </button>
                <div className="flex items-center gap-1.5 pl-2 border-l border-[#E5E5E7]">
                  <span className="text-[12px] text-[#86868B]">Jump to date:</span>
                  <input
                    type="date"
                    value={mapSelectedWeekRef}
                    onChange={(e) => setMapSelectedWeekRef(e.target.value)}
                    className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                  />
                </div>
              </div>
            )}

            {mapDateMode === 'CUSTOM' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#1D1D1F]">Custom Date Range:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-[#86868B]">From</span>
                  <input
                    type="date"
                    value={mapCustomFrom}
                    onChange={(e) => setMapCustomFrom(e.target.value)}
                    className={`h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] ${
                      isMapCustomRangeInvalid ? 'border-red-400 bg-red-50/50' : 'border-[#E5E5E7]'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-[#86868B]">To</span>
                  <input
                    type="date"
                    value={mapCustomTo}
                    onChange={(e) => setMapCustomTo(e.target.value)}
                    className={`h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] ${
                      isMapCustomRangeInvalid ? 'border-red-400 bg-red-50/50' : 'border-[#E5E5E7]'
                    }`}
                  />
                </div>
                {isMapCustomRangeInvalid ? (
                  <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-red-50 text-red-700 border border-red-200">
                    ⚠️ Date From cannot be after Date To
                  </span>
                ) : (
                  (mapCustomFrom || mapCustomTo) && (
                    <span className="text-[12px] text-[#86868B]">
                      Showing destinations active within selected window
                    </span>
                  )
                )}
              </div>
            )}

            <div className="text-[12px] text-[#86868B]">
              {mapItems.length === 1 ? '1 destination found' : `${mapItems.length} destinations found`}
            </div>
          </div>
        )}
      </div>

      {/* No destinations matching notice */}
      {mapItems.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-[8px] text-[13px] text-amber-700 flex items-center justify-between animate-fade-in">
          <span>No travel destinations found matching your selected period and criteria.</span>
          <button
            onClick={handleResetMapFilters}
            className="font-semibold underline hover:text-amber-800"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-[8px] overflow-hidden border border-[#E5E5E7] shadow-xs">
        <DynamicAdminDestinationMap items={mapItems} onSelectItem={(item) => {
          const matched = taRecords.find((r) => r.id === item.id);
          if (matched) setSelectedRecord(matched);
        }} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-xs p-3 rounded-[8px] border border-[#E5E5E7] shadow-xs text-[12px] space-y-1 font-normal text-[#1D1D1F]">
          <span className="text-[11px] text-[#86868B] uppercase tracking-wider block font-semibold">LEGEND</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1B4332]"></span> Active TA
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Approved
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Overdue / Cancelled
          </div>
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 10: APPROVAL ANALYTICS — Matching PDF Page 11                          */
  /* -------------------------------------------------------------------------- */
  const renderApprovalAnalyticsTab = () => (
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Approval Analytics</h2>
        <p className="text-[13px] text-[#86868B] mt-0.5">Turnaround rates, stage duration benchmarks, and approval performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">APPROVAL RATE</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">38.5%</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">PENDING</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">7</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">COMPLETED</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">5</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">RETURNED</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">1</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">OVERDUE</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">3</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-3">Approval Status Distribution</h3>
          <div className="h-44 flex items-center justify-center">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10B981" strokeWidth="4" strokeDasharray="38 100" strokeDashoffset="0" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#F59E0B" strokeWidth="4" strokeDasharray="54 100" strokeDashoffset="-38" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#EF4444" strokeWidth="4" strokeDasharray="8 100" strokeDashoffset="-92" />
            </svg>
          </div>
          <div className="flex justify-center gap-4 text-[12px] font-normal text-[#1D1D1F] pt-2 border-t border-[#E5E5E7]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Returned</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-3">Stage Performance Benchmarks</h3>
          <div className="space-y-3.5 pt-1">
            <div>
              <div className="flex justify-between text-[13px] font-normal mb-1">
                <span className="text-[#1D1D1F]">Section Chief</span>
                <span className="text-[#86868B] text-[12px]">1.2 days avg — 4 requests</span>
              </div>
              <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                <div className="w-[45%] h-full bg-[#1B4332] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] font-normal mb-1">
                <span className="text-[#1D1D1F]">Division Chief</span>
                <span className="text-[#86868B] text-[12px]">2.1 days avg — 3 requests</span>
              </div>
              <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                <div className="w-[75%] h-full bg-[#40916C] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] font-normal mb-1">
                <span className="text-[#1D1D1F]">PENRO Head</span>
                <span className="text-[#86868B] text-[12px]">0.8 days avg — 2 requests</span>
              </div>
              <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                <div className="w-[30%] h-full bg-blue-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 11: PROCESSING PERFORMANCE — Matching PDF Page 12                      */
  /* -------------------------------------------------------------------------- */
  const renderProcessingPerformanceTab = () => (
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Processing Performance</h2>
        <p className="text-[13px] text-[#86868B] mt-0.5">Turnaround duration diagnostics and workflow bottlenecks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">AVG PROCESSING TIME</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">2.4 <span className="text-[13px] font-normal text-[#86868B]">days</span></p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">FASTEST PROCESSING</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">1 <span className="text-[13px] font-normal text-[#86868B]">day</span></p>
          <p className="text-[12px] text-[#86868B]">TA-2025-0007</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">LONGEST PROCESSING</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">7 <span className="text-[13px] font-normal text-[#86868B]">days</span></p>
          <p className="text-[12px] text-[#86868B]">TA-2025-0008</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">OVERDUE REQUESTS</p>
          <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">3</p>
          <p className="text-[12px] text-[#86868B]">Waiting 5+ days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] shadow-xs">
          <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-3">Average Time per Stage</h3>
          <div className="h-44 flex items-end justify-between px-3 pb-1">
            {[
              { stage: 'Submission', days: 0 },
              { stage: 'Section Chief', days: 1.2 },
              { stage: 'Division Chief', days: 2.1 },
              { stage: 'PENRO Head', days: 0.8 },
            ].map((st) => (
              <div key={st.stage} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[13px] font-semibold text-[#1D1D1F]">{st.days}d</span>
                <div style={{ height: `${Math.max(6, st.days * 55)}px` }} className="w-7 bg-[#1B4332] rounded-t" />
                <span className="text-[12px] text-[#86868B] text-center">{st.stage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-3">
          <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Bottleneck Diagnostics</h3>
          <div className="p-3 bg-amber-50 rounded-[6px] border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">CURRENT BOTTLENECK</span>
            <p className="text-[14px] font-semibold text-[#1D1D1F] mt-0.5">Section Chief Review</p>
            <p className="text-[12px] text-amber-700">Avg wait: 4.7 days</p>
          </div>

          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between py-1.5 border-b border-[#E5E5E7]">
              <span className="text-[#86868B]">Employee Submission</span>
              <span className="font-medium text-[#1D1D1F]">Instant</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E5E5E7] font-semibold text-amber-700">
              <span>Section Chief Review</span>
              <span>1.2 days →</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E5E5E7]">
              <span className="text-[#86868B]">Division Chief Review</span>
              <span className="font-medium text-[#1D1D1F]">2.1 days →</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#86868B]">PENRO Head Approval</span>
              <span className="font-medium text-[#1D1D1F]">0.8 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* TAB 12: USER MANAGEMENT — Matching PDF Page 13                             */
  /* -------------------------------------------------------------------------- */
  const renderUserManagementTab = () => {
    const employees = users.filter((u) => u.role === 'EMPLOYEE');
    const staff = users.filter((u) => u.role !== 'EMPLOYEE');

    const activeList = userTab === 'employees' ? employees : staff;
    const filteredUsers = activeList.filter((u) => {
      if (userSearch) {
        const q = userSearch.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      if (userStatusFilter !== 'ALL' && u.status !== userStatusFilter) return false;
      if (userSectionFilter !== 'ALL' && u.section !== userSectionFilter) return false;
      return true;
    });

    return (
      <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">User Management</h2>
          <p className="text-[13px] text-[#86868B] mt-0.5">Directory of personnel accounts and signatory privileges</p>
        </div>

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#0F4C2E] shadow-xs">
            <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">{employees.length}</span>
            <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mt-0.5">EMPLOYEES</p>
          </div>
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-blue-500 shadow-xs">
            <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">{staff.length}</span>
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mt-0.5">STAFF/SIGNATORIES</p>
          </div>
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 shadow-xs">
            <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">{users.filter((u) => u.status === 'ACTIVE').length}</span>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mt-0.5">ACTIVE</p>
          </div>
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 shadow-xs">
            <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">1</span>
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mt-0.5">INACTIVE</p>
          </div>
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-rose-500 shadow-xs">
            <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">1</span>
            <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider mt-0.5">LOCKED</p>
          </div>
        </div>

        {/* Tabs: Employee vs Staff */}
        <div className="flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-[6px] border border-[#E5E5E7] w-fit">
          <button
            onClick={() => setUserTab('employees')}
            className={`h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              userTab === 'employees' ? 'bg-[#0F4C2E] text-white shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Employee Accounts
          </button>
          <button
            onClick={() => setUserTab('staff')}
            className={`h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              userTab === 'staff' ? 'bg-[#0F4C2E] text-white shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Staff / Signatory Accounts
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-3.5 rounded-[8px] border border-[#E5E5E7] shadow-xs flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Search name, position, email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="flex-1 h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          />
          <select
            value={userStatusFilter}
            onChange={(e) => setUserStatusFilter(e.target.value)}
            className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
          <select
            value={userSectionFilter}
            onChange={(e) => setUserSectionFilter(e.target.value)}
            className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          >
            <option value="ALL">All Sections</option>
            <option value="CENRO Rosario">CENRO Rosario</option>
            <option value="CENRO San Fernando">CENRO San Fernando</option>
            <option value="PENRO La Union">PENRO La Union</option>
          </select>
        </div>

        {/* User Table */}
        <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                <tr>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Employee Name</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Position / Designation</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Section / Office</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Email</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Last Login</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors">
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle font-medium text-left">{u.name}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">{u.position || u.role}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">{u.section || 'PENRO La Union'}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle font-mono text-left">{u.email}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left">{u.lastLogin || '2025-01-28 08:00'}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">
                      <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* -------------------------------------------------------------------------- */
  /* TAB 13: AUDIT LOGS — Matching PDF Page 14                                  */
  /* -------------------------------------------------------------------------- */
  const renderAuditLogsTab = () => {
    const filteredLogs = auditLogs.filter((log) => {
      if (auditSearch) {
        const q = auditSearch.toLowerCase();
        if (!log.trackingNumber.toLowerCase().includes(q) && !log.user.toLowerCase().includes(q) && !log.details.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) return false;
      return true;
    });

    return (
      <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Audit Logs</h2>
          <p className="text-[13px] text-[#86868B] mt-0.5">Chronological system security trail of actions, approvals, and events</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#0F4C2E] shadow-xs">
            <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">{auditLogs.length}</span>
            <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mt-0.5">TOTAL LOG ENTRIES</p>
          </div>
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 shadow-xs">
            <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">{filteredLogs.length}</span>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mt-0.5">FILTERED RESULTS</p>
          </div>
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-blue-500 shadow-xs">
            <span className="text-[14px] font-semibold text-[#1D1D1F]">{new Date().toLocaleString()}</span>
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mt-0.5">LATEST ACTIVITY</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-[8px] border border-[#E5E5E7] shadow-xs flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Search log records by TA#, user, or details..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            className="flex-1 h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          />
          <select
            value={auditActionFilter}
            onChange={(e) => setAuditActionFilter(e.target.value)}
            className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
          >
            <option value="ALL">All Actions</option>
            <option value="Approved">Approved</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Login">Login</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Submitted">Submitted</option>
            <option value="Endorsed">Endorsed</option>
          </select>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                <tr>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Timestamp</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">User</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Role</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">Action</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Target</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">TA Reference</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">IP Address</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors">
                    <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle font-mono text-left">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle font-medium text-left">{log.user}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">{log.role}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">
                      <span
                        className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] ${
                          log.action === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.action === 'Cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : log.action === 'Submitted' || log.action === 'Endorsed' || log.action === 'Reviewed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">{log.target}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1B4332] align-middle font-mono font-medium text-left">{log.trackingNumber}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle font-mono text-left">{log.ipAddress}</td>
                    <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle max-w-xs text-left">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render view router based on tab
  const renderActiveView = () => {
    switch (currentTab) {
      case 'home':
      case 'dashboard':
        return renderHomeTab();
      case 'data':
      case 'tables':
      case 'search':
      case 'edit':
        return renderDataTab();
      case 'cancelled':
        return renderCancelledTab();
      case 'approval-monitoring':
        return renderApprovalMonitoringTab();
      case 'travel-analytics':
        return renderTravelAnalyticsTab();
      case 'destination-map':
        return renderDestinationMapTab();
      case 'approval-analytics':
        return renderApprovalAnalyticsTab();
      case 'processing-performance':
        return renderProcessingPerformanceTab();
      case 'user-management':
        return renderUserManagementTab();
      case 'audit-logs':
        return renderAuditLogsTab();
      default:
        return renderHomeTab();
    }
  };

  return (
    <>
      {renderActiveView()}

      {/* View Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-2xl border border-[#E5E5E7] rounded-[10px] shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#F5F5F7] border-b border-[#E5E5E7] px-5 py-3.5 flex items-center justify-between">
              <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold font-mono rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                {selectedRecord.trackingNumber}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-white hover:bg-[#F2F2F7] border border-[#E5E5E7] text-[#1D1D1F] transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">{selectedRecord.destination}</h3>
                <p className="text-[13px] text-[#86868B] mt-0.5">{selectedRecord.purpose}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
                <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Employee</span>
                  <span className="font-semibold text-[#1D1D1F]">{selectedRecord.createdBy?.name || 'Juan Dela Cruz'}</span>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Station</span>
                  <span className="font-semibold text-[#1D1D1F]">{selectedRecord.office}</span>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Travel Date</span>
                  <span className="font-semibold text-[#1D1D1F]">{new Date(selectedRecord.startDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Signatories */}
              <div className="bg-[#F5F5F7] p-4 rounded-[8px] border border-[#E5E5E7] space-y-2">
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Approval Trail</span>
                <div className="space-y-1.5 text-[13px]">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-[6px] border border-[#E5E5E7]">
                    <span className="font-normal text-[#1D1D1F]">1. Section Chief (Verifier)</span>
                    <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">Irene O. Cadiz ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-[6px] border border-[#E5E5E7]">
                    <span className="font-normal text-[#1D1D1F]">2. Division Chief (Verifier)</span>
                    <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">Luis P. Gonzaga ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-[6px] border border-[#E5E5E7]">
                    <span className="font-normal text-[#1D1D1F]">3. Head of PENRO (Final Signatory)</span>
                    <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl border border-[#E5E5E7] rounded-[10px] shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#F5F5F7] border-b border-[#E5E5E7] px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Edit Travel Authority — {editingRecord.trackingNumber}</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-white hover:bg-[#F2F2F7] border border-[#E5E5E7] text-[#1D1D1F] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3 text-[13px] overflow-y-auto">
              <div>
                <label className="block font-semibold text-[#86868B] mb-1 uppercase text-[11px] tracking-wider">Destination</label>
                <input
                  type="text"
                  value={editingRecord.destination}
                  onChange={(e) => setEditingRecord({ ...editingRecord, destination: e.target.value })}
                  className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#86868B] mb-1 uppercase text-[11px] tracking-wider">Purpose</label>
                <textarea
                  rows={2}
                  value={editingRecord.purpose}
                  onChange={(e) => setEditingRecord({ ...editingRecord, purpose: e.target.value })}
                  className="w-full p-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1 uppercase text-[11px] tracking-wider">AOR Scope</label>
                  <select
                    value={editingRecord.aorType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, aorType: e.target.value as any })}
                    className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                  >
                    <option value="Within AOR">Within AOR</option>
                    <option value="Outside AOR">Outside AOR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1 uppercase text-[11px] tracking-wider">Transportation Mode</label>
                  <select
                    value={editingRecord.transportation}
                    onChange={(e) => setEditingRecord({ ...editingRecord, transportation: e.target.value as any })}
                    className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                  >
                    <option value="Government Vehicle">Government Vehicle</option>
                    <option value="Public Transport">Public Transport</option>
                    <option value="Airline">Airline</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E7]">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#143225] text-white transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[13px] text-[#86868B]">Loading TOPS Admin Portal...</div>}>
      <AdminPortalContent />
    </Suspense>
  );
}
