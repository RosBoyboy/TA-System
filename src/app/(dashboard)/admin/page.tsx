'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DynamicAdminDestinationMap, { TAMapItem } from '@/components/map/DynamicAdminDestinationMap';

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

  // Filtered TA Records
  const filteredRecords = useMemo(() => {
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
      if (dateFrom && new Date(r.startDate) < new Date(dateFrom)) return false;
      if (dateTo && new Date(r.endDate) > new Date(dateTo)) return false;
      return true;
    });
  }, [taRecords, searchQuery, filterStatus, filterOffice, filterAor, dateFrom, dateTo]);

  // Statistics & Metrics Calculations
  const stats = useMemo(() => {
    const total = taRecords.length;
    const pending = taRecords.filter((r) => r.status.startsWith('PENDING')).length;
    const approved = taRecords.filter((r) => r.status === 'APPROVED').length;
    const cancelled = taRecords.filter((r) => r.status.startsWith('REJECTED')).length;
    const withinAOR = taRecords.filter((r) => r.aorType === 'Within AOR').length;
    const outsideAOR = taRecords.filter((r) => r.aorType === 'Outside AOR').length;

    const govVehicle = taRecords.filter((r) => r.transportation === 'Government Vehicle').length;
    const pubTransport = taRecords.filter((r) => r.transportation === 'Public Transport').length;
    const airline = taRecords.filter((r) => r.transportation === 'Airline').length;

    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '38.5';

    return {
      total,
      pending,
      approved,
      cancelled,
      withinAOR,
      outsideAOR,
      govVehicle,
      pubTransport,
      airline,
      approvalRate,
    };
  }, [taRecords]);

  // Destination Map Items
  const mapItems: TAMapItem[] = useMemo(() => {
    return filteredRecords
      .filter((r) => r.destinationLat && r.destinationLng)
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
  }, [filteredRecords]);

  // Helper to render Status Badges (Clean, text-based semantic dot style)
  const renderStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return (
        <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span> Approved
        </span>
      );
    }
    if (status === 'PENDING_SECTION_CHIEF' || status === 'PENDING') {
      return (
        <span className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span> Pending
        </span>
      );
    }
    if (status === 'PENDING_DIVISION_CHIEF' || status === 'PENDING_HEAD_PENRO') {
      return (
        <span className="text-xs font-semibold text-sky-700 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0"></span> On Process
        </span>
      );
    }
    if (status.startsWith('REJECTED')) {
      return (
        <span className="text-xs font-semibold text-rose-700 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span> Cancelled
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span> Draft
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
    setEditSuccessMsg(`Travel Authority ${editingRecord.trackingNumber} successfully updated.`);
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
      <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Admin Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enhanced Travel Authority Processing System — DENR-PENRO La Union
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 shrink-0">
          <span>Date From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 outline-none focus:border-emerald-600"
          />
          <span>To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 outline-none focus:border-emerald-600"
          />
        </div>
        <div className="flex-1 w-full relative">
          <input
            type="text"
            placeholder="Search TA number, employee, or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 px-3 pl-8 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-600"
          />
          <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">TOTAL TRAVEL AUTHORITIES</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">{stats.total}</p>
          </div>
          <svg className="w-6 h-6 text-slate-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">PENDING / ON PROCESS</p>
            <p className="text-2xl font-semibold text-amber-700 mt-1 tracking-tight">{stats.pending}</p>
          </div>
          <svg className="w-6 h-6 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">APPROVED ORDERS</p>
            <p className="text-2xl font-semibold text-emerald-800 mt-1 tracking-tight">{stats.approved}</p>
          </div>
          <svg className="w-6 h-6 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">CANCELLED / RETURNED</p>
            <p className="text-2xl font-semibold text-rose-700 mt-1 tracking-tight">{stats.cancelled}</p>
          </div>
          <svg className="w-6 h-6 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* 3 Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Donut Chart - Status Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Status Distribution</h3>
              <span className="text-[11px] text-slate-400 font-medium">{stats.total} total</span>
            </div>
            <div className="h-44 flex items-center justify-center my-2 relative">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#F1F5F9" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10B981" strokeWidth="4" strokeDasharray="33 100" strokeDashoffset="0" />
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#0284C7" strokeWidth="4" strokeDasharray="25 100" strokeDashoffset="-33" />
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#F59E0B" strokeWidth="4" strokeDasharray="22 100" strokeDashoffset="-58" />
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#EF4444" strokeWidth="4" strokeDasharray="20 100" strokeDashoffset="-80" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-semibold text-slate-900 tracking-tight">{stats.total}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase">Requests</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2.5 text-[11px] font-medium text-slate-600 border-t border-slate-100">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved ({stats.approved})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-600"></span> On Process (4)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending (3)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Returned ({stats.cancelled})</span>
          </div>
        </div>

        {/* Chart 2: Vertical Bar Chart - Within AOR vs Outside AOR */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">AOR Jurisdiction</h3>
              <span className="text-[11px] text-slate-400 font-medium">Coverage</span>
            </div>
            <div className="h-44 flex items-end justify-center gap-10 pt-4 pb-2">
              <div className="flex flex-col items-center gap-1.5 w-16">
                <span className="text-xs font-semibold text-slate-800">{stats.withinAOR}</span>
                <div
                  style={{ height: `${Math.max(16, (stats.withinAOR / (stats.total || 1)) * 120)}px` }}
                  className="w-full bg-[#1B4332] rounded-t transition-all hover:opacity-90"
                />
                <span className="text-[11px] font-medium text-slate-600 text-center">Within AOR</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 w-16">
                <span className="text-xs font-semibold text-slate-800">{stats.outsideAOR}</span>
                <div
                  style={{ height: `${Math.max(16, (stats.outsideAOR / (stats.total || 1)) * 120)}px` }}
                  className="w-full bg-[#40916C] rounded-t transition-all hover:opacity-90"
                />
                <span className="text-[11px] font-medium text-slate-600 text-center">Outside AOR</span>
              </div>
            </div>
          </div>
          <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100">
            Regional Area of Responsibility Breakdown
          </div>
        </div>

        {/* Chart 3: Horizontal Bar Chart - Transportation Mode */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Transportation Mode</h3>
              <span className="text-[11px] text-slate-400 font-medium">Breakdown</span>
            </div>
            <div className="h-44 flex flex-col justify-center space-y-3 py-1">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">Government Vehicle</span>
                  <span className="font-semibold text-slate-900">{stats.govVehicle}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(stats.govVehicle / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-[#1B4332] rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">Public Transport</span>
                  <span className="font-semibold text-slate-900">{stats.pubTransport}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(stats.pubTransport / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-[#40916C] rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">Commercial Airline</span>
                  <span className="font-semibold text-slate-900">{stats.airline}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(stats.airline / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-sky-600 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100">
            Vehicular and Transit Distribution
          </div>
        </div>
      </div>

      {/* Bottom Alert Banner */}
      <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span><strong>{stats.cancelled} Travel Authority request(s) returned</strong> for revision by reviewing officials.</span>
        </div>
        <button
          onClick={() => router.push('/admin?tab=cancelled')}
          className="text-xs font-semibold text-amber-900 hover:underline"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Travel Authority Data</h2>
          <p className="text-xs text-slate-500 mt-0.5">Card-based overview of active and archived Travel Authorities</p>
        </div>
        <span className="text-xs text-slate-500 font-medium">Showing {filteredRecords.length} of {taRecords.length} records</span>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Search by TA#, employee, destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none"
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
              className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none"
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
              className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none"
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
        {filteredRecords.map((req) => (
          <div
            key={req.id}
            onClick={() => setSelectedRecord(req)}
            className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#1B4332] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {req.trackingNumber}
                </span>
                <h4 className="text-sm font-semibold text-slate-900 mt-1.5">{req.createdBy?.name || 'Juan Dela Cruz'}</h4>
                <p className="text-[11px] text-slate-500">{req.employeePosition} — {req.office}</p>
              </div>
              <div>{renderStatusBadge(req.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Destination</span>
                <span className="font-medium text-slate-800 line-clamp-1">{req.destination}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Travel Date</span>
                <span className="font-medium text-slate-800">{new Date(req.startDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">AOR Scope</span>
                <span className="font-medium text-slate-800">{req.aorType}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Transportation</span>
                <span className="font-medium text-slate-800">{req.transportation}</span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Purpose</span>
              <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{req.purpose}</p>
            </div>
          </div>
        ))}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Travel Authority Records</h2>
            <p className="text-xs text-slate-500 mt-0.5">Master tabular registry of all Travel Authorities</p>
          </div>
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 px-3 pl-8 bg-white border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-600 shadow-2xs"
            />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabular Registry */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-4">TA Number</th>
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Destination</th>
                  <th className="py-2.5 px-4">Travel Date</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Submitted</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginated.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#1B4332]">{req.trackingNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{req.createdBy?.name || 'Juan Dela Cruz'}</p>
                      <p className="text-[11px] text-slate-500">{req.employeePosition}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{req.destination}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(req.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">{renderStatusBadge(req.status)}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedRecord(req)}
                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px] transition-colors"
                        title="View Details"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setEditingRecord(req)}
                        className="px-2 py-1 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#1B4332] font-medium text-[11px] transition-colors"
                        title="Edit TA"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredRecords.length)} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 text-xs"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-6 h-6 rounded text-xs font-semibold ${
                    currentPage === pg ? 'bg-[#1B4332] text-white' : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 text-xs"
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
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Cancelled Travel Authorities</h2>
          <p className="text-xs text-slate-500 mt-0.5">Records of rejected, withdrawn, or expired Travel Authorities</p>
        </div>

        {/* Count Card */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-sm">
            ✕
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">{cancelledList.length}</p>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Cancelled Records</p>
          </div>
        </div>

        {/* Cancelled List */}
        <div className="space-y-3">
          {cancelledList.map((req) => (
            <div key={req.id} className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900 text-xs">{req.trackingNumber}</span>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-800 text-[10px] font-semibold rounded border border-rose-200">
                    Cancelled
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Date: {new Date(req.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Employee</span>
                  <p className="font-semibold text-slate-900">{req.createdBy?.name || 'DENR Personnel'}</p>
                  <p className="text-[11px] text-slate-500">{req.employeePosition} — {req.office}</p>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Destination</span>
                  <p className="font-semibold text-slate-900">{req.destination}</p>
                  <p className="text-[11px] text-slate-500">Travel Date: {new Date(req.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Cancellation Reason</span>
                  <p className="text-xs text-rose-900 bg-rose-50/70 p-2 rounded border border-rose-200/60 leading-relaxed font-normal mt-0.5">
                    {req.status === 'REJECTED_OVERDUE'
                      ? 'Expired automatically — departure date passed before final signatory approval.'
                      : 'Inspection rescheduled due to administrative priorities or weather advisories.'}
                  </p>
                </div>
              </div>

              {/* History Bar */}
              <div className="pt-2 border-t border-slate-100 text-xs flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
                <span className="text-slate-400 font-medium">History:</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded">Submitted ({new Date(req.createdAt).toLocaleDateString()})</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded">Section Chief Review</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded font-medium">Cancelled ({new Date(req.updatedAt).toLocaleDateString()})</span>
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
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Search by ID</h2>
        <p className="text-xs text-slate-500 mt-0.5">Find a specific Travel Authority by its unique reference tracking number</p>
      </div>

      <form onSubmit={handleSearchById} className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter complete TA number (e.g., TA-2025-0001)..."
            value={searchIdInput}
            onChange={(e) => setSearchIdInput(e.target.value)}
            className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            className="h-9 px-5 bg-[#1B4332] hover:bg-[#143326] text-white font-medium text-xs rounded-md shadow-2xs transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {searchIdResult && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="px-2 py-0.5 bg-emerald-50 text-[#1B4332] font-mono font-semibold text-xs rounded border border-emerald-200">
                {searchIdResult.trackingNumber}
              </span>
              <h3 className="text-sm font-semibold text-slate-900 mt-1.5">{searchIdResult.destination}</h3>
              <p className="text-xs text-slate-500">{searchIdResult.purpose}</p>
            </div>
            <div>{renderStatusBadge(searchIdResult.status)}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Employee</span>
              <span className="font-semibold text-slate-800">{searchIdResult.createdBy?.name || 'Juan Dela Cruz'}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Station</span>
              <span className="font-semibold text-slate-800">{searchIdResult.office}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Travel Date</span>
              <span className="font-semibold text-slate-800">{new Date(searchIdResult.startDate).toLocaleDateString()}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Transportation</span>
              <span className="font-semibold text-slate-800">{searchIdResult.transportation}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setSelectedRecord(searchIdResult)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded transition-colors"
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
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Edit Travel Authority</h2>
        <p className="text-xs text-slate-500 mt-0.5">Search and modify permitted Travel Authority records</p>
      </div>

      {editSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-semibold text-emerald-900">
          ✓ {editSuccessMsg}
        </div>
      )}

      {/* Find Box */}
      <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs space-y-2.5">
        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">FIND TRAVEL AUTHORITY</span>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter TA Number (e.g., TA-2025-0001)..."
            value={searchIdInput}
            onChange={(e) => setSearchIdInput(e.target.value)}
            className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-600"
          />
          <button
            onClick={() => {
              const f = taRecords.find((r) => r.trackingNumber.toLowerCase() === searchIdInput.trim().toLowerCase());
              if (f) setEditingRecord(f);
            }}
            className="h-9 px-5 bg-[#1B4332] hover:bg-[#143326] text-white font-medium text-xs rounded-md shadow-2xs transition-colors"
          >
            Find
          </button>
        </div>
      </div>

      {/* Quick Select List */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-4 space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Quick Select — Recent Travel Authorities</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Select a record to load for modification</p>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {taRecords.slice(0, 6).map((req) => (
            <div key={req.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 px-1 rounded transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-[#1B4332]">{req.trackingNumber}</span>
                <span className="font-medium text-slate-800">{req.createdBy?.name || 'Juan Dela Cruz'}</span>
                <span className="text-slate-500 hidden sm:inline">{req.destination}</span>
              </div>
              <button
                onClick={() => setEditingRecord(req)}
                className="text-xs font-semibold text-[#1B4332] hover:underline"
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
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Approval Monitoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">Track Travel Authority requests through the hierarchical approval workflow</p>
      </div>

      {/* 5-Stage Pipeline Stepper */}
      <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs space-y-3">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">APPROVAL PIPELINE STAGES</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { step: '1', label: 'Employee', count: 2, sub: 'Submitted' },
            { step: '2', label: 'Section Chief', count: 3, sub: 'Verification' },
            { step: '3', label: 'Division Chief', count: 2, sub: 'Verification' },
            { step: '4', label: 'PENRO Head', count: 1, sub: 'Final Signatory' },
            { step: '5', label: 'Completed', count: stats.approved, sub: 'Approved' },
          ].map((st) => (
            <div key={st.step} className="p-3 bg-slate-50/70 rounded-md border border-slate-100 text-center">
              <span className="text-xl font-semibold text-slate-900 block">{st.count}</span>
              <span className="text-xs font-semibold text-slate-700 block mt-0.5">{st.label}</span>
              <span className="text-[10px] text-slate-400 font-normal">{st.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 bg-white rounded-lg border border-slate-200 text-center shadow-2xs">
          <span className="text-lg font-semibold text-slate-800">4</span>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">PENDING</p>
        </div>
        <div className="p-3 bg-white rounded-lg border border-slate-200 text-center shadow-2xs">
          <span className="text-lg font-semibold text-sky-700">3</span>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">IN REVIEW</p>
        </div>
        <div className="p-3 bg-white rounded-lg border border-slate-200 text-center shadow-2xs">
          <span className="text-lg font-semibold text-emerald-800">{stats.approved}</span>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">APPROVED</p>
        </div>
        <div className="p-3 bg-white rounded-lg border border-slate-200 text-center shadow-2xs">
          <span className="text-lg font-semibold text-rose-700">{stats.cancelled}</span>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">RETURNED</p>
        </div>
        <div className="p-3 bg-white rounded-lg border border-slate-200 text-center shadow-2xs">
          <span className="text-lg font-semibold text-amber-700">3</span>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">OVERDUE</p>
        </div>
      </div>

      {/* Turnaround & Bottleneck Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Average Processing Time</span>
          <p className="text-3xl font-semibold text-slate-900 tracking-tight">2.4 <span className="text-sm font-normal text-slate-500">days</span></p>
          <p className="text-xs text-slate-400 mt-1">Average time from employee submission to final approval</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block mb-1">Current Bottleneck Stage</span>
          <p className="text-xl font-semibold text-slate-900">Section Chief Review</p>
          <p className="text-xs text-slate-500 mt-1">3 requests pending at this stage — avg. wait 4.7 days</p>
        </div>
      </div>

      {/* Overdue Warning */}
      <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-0.5">
        <p className="font-semibold flex items-center gap-1.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          3 Overdue Approvals Detected
        </p>
        <p className="text-rose-800 text-[11px]">
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
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Travel Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">Institutional travel patterns, volume metrics, and destination distribution</p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">TOTAL REQUESTS</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">WITHIN AOR</p>
          <p className="text-2xl font-semibold text-[#1B4332] mt-1">{stats.withinAOR}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">OUTSIDE AOR</p>
          <p className="text-2xl font-semibold text-[#40916C] mt-1">{stats.outsideAOR}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">TRANSPORT TYPES</p>
          <p className="text-2xl font-semibold text-sky-800 mt-1">3</p>
        </div>
      </div>

      {/* Row 1 Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Within AOR vs Outside AOR</h3>
          <div className="h-44 flex items-center justify-center">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#0284C7" strokeWidth="4" strokeDasharray="27 100" strokeDashoffset="0" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10B981" strokeWidth="4" strokeDasharray="73 100" strokeDashoffset="-27" />
            </svg>
          </div>
          <div className="flex justify-center gap-6 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Within AOR ({stats.withinAOR})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-600"></span> Outside AOR ({stats.outsideAOR})</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Travel Request Trends</h3>
          <div className="h-44 flex items-end justify-between px-4 pb-2 pt-4">
            {[
              { month: 'Oct', count: 8 },
              { month: 'Nov', count: 12 },
              { month: 'Dec', count: 6 },
              { month: 'Jan', count: 15 },
            ].map((m) => (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-semibold text-slate-700">{m.count}</span>
                <div style={{ height: `${m.count * 8}px` }} className="w-7 bg-[#1B4332] rounded-t" />
                <span className="text-[11px] text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">Monthly Request Volume</p>
        </div>
      </div>

      {/* Row 2 Destination Breakdown */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Frequently Visited Destinations</h3>
        <div className="space-y-2 text-xs">
          {[
            { name: 'Baguio City', count: 5, color: '#1B4332' },
            { name: 'San Fernando City, La Union', count: 4, color: '#2D6A4F' },
            { name: 'Candon City, Ilocos Sur', count: 2, color: '#40916C' },
            { name: 'Manila (DENR Central Office)', count: 2, color: '#52B788' },
            { name: 'Pugo, La Union', count: 2, color: '#74C69D' },
          ].map((d) => (
            <div key={d.name} className="space-y-0.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700">{d.name}</span>
                <span className="font-semibold text-slate-900">{d.count} requests</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
    <div className="space-y-5 animate-fade-in w-full max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Destination Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">Geographic distribution of travel destinations based on real Travel Authorities</p>
        </div>
        <span className="px-2.5 py-1 bg-emerald-50 text-[#1B4332] border border-emerald-200 rounded text-xs font-semibold">
          {mapItems.length} Destinations on map
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Search destination name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 px-3 pl-8 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-600"
          />
          <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Active / Pending</option>
          <option value="REJECTED">Cancelled / Overdue</option>
        </select>

        <select
          value={filterAor}
          onChange={(e) => setFilterAor(e.target.value)}
          className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none"
        >
          <option value="ALL">All AOR</option>
          <option value="Within AOR">Within AOR</option>
          <option value="Outside AOR">Outside AOR</option>
        </select>

        <button
          onClick={() => {
            setSearchQuery('');
            setFilterStatus('ALL');
            setFilterAor('ALL');
          }}
          className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
        >
          Reset
        </button>
      </div>

      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-slate-200">
        <DynamicAdminDestinationMap items={mapItems} onSelectItem={(item) => {
          const matched = taRecords.find((r) => r.id === item.id);
          if (matched) setSelectedRecord(matched);
        }} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-xs p-3 rounded-md border border-slate-200 shadow-sm text-xs space-y-1 font-medium text-slate-700">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">LEGEND</span>
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
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Approval Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">Turnaround rates, stage duration benchmarks, and approval performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">APPROVAL RATE</p>
          <p className="text-xl font-semibold text-emerald-800 mt-0.5">38.5%</p>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PENDING</p>
          <p className="text-xl font-semibold text-amber-700 mt-0.5">7</p>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">COMPLETED</p>
          <p className="text-xl font-semibold text-[#1B4332] mt-0.5">5</p>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">RETURNED</p>
          <p className="text-xl font-semibold text-rose-700 mt-0.5">1</p>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">OVERDUE</p>
          <p className="text-xl font-semibold text-amber-800 mt-0.5">3</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Approval Status Distribution</h3>
          <div className="h-44 flex items-center justify-center">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10B981" strokeWidth="4" strokeDasharray="38 100" strokeDashoffset="0" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#F59E0B" strokeWidth="4" strokeDasharray="54 100" strokeDashoffset="-38" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#EF4444" strokeWidth="4" strokeDasharray="8 100" strokeDashoffset="-92" />
            </svg>
          </div>
          <div className="flex justify-center gap-4 text-[11px] font-medium text-slate-600 pt-2 border-t border-slate-100">
            <span>● Approved</span>
            <span>● Pending</span>
            <span>● Returned</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Stage Performance Benchmarks</h3>
          <div className="space-y-3.5 pt-1">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>Section Chief</span>
                <span className="text-slate-500">1.2 days avg — 4 requests</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[45%] h-full bg-[#1B4332] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>Division Chief</span>
                <span className="text-slate-500">2.1 days avg — 3 requests</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[75%] h-full bg-[#40916C] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>PENRO Head</span>
                <span className="text-slate-500">0.8 days avg — 2 requests</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[30%] h-full bg-sky-600 rounded-full" />
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
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Processing Performance</h2>
        <p className="text-xs text-slate-500 mt-0.5">Turnaround duration diagnostics and workflow bottlenecks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">AVG PROCESSING TIME</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">2.4 <span className="text-xs font-normal text-slate-500">days</span></p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">FASTEST PROCESSING</p>
          <p className="text-2xl font-semibold text-emerald-800 mt-1">1 <span className="text-xs font-normal text-slate-500">day</span></p>
          <p className="text-[10px] text-slate-400">TA-2025-0007</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">LONGEST PROCESSING</p>
          <p className="text-2xl font-semibold text-rose-700 mt-1">7 <span className="text-xs font-normal text-slate-500">days</span></p>
          <p className="text-[10px] text-slate-400">TA-2025-0008</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">OVERDUE REQUESTS</p>
          <p className="text-2xl font-semibold text-amber-700 mt-1">3</p>
          <p className="text-[10px] text-slate-400">Waiting 5+ days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Average Time per Stage</h3>
          <div className="h-44 flex items-end justify-between px-3 pb-1">
            {[
              { stage: 'Submission', days: 0 },
              { stage: 'Section Chief', days: 1.2 },
              { stage: 'Division Chief', days: 2.1 },
              { stage: 'PENRO Head', days: 0.8 },
            ].map((st) => (
              <div key={st.stage} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-xs font-semibold text-slate-700">{st.days}d</span>
                <div style={{ height: `${Math.max(6, st.days * 55)}px` }} className="w-7 bg-[#1B4332] rounded-t" />
                <span className="text-[10px] text-slate-500 text-center">{st.stage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Bottleneck Diagnostics</h3>
          <div className="p-3 bg-amber-50 rounded border border-amber-200">
            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">CURRENT BOTTLENECK</span>
            <p className="text-sm font-semibold text-amber-950 mt-0.5">Section Chief Review</p>
            <p className="text-xs text-amber-800">Avg wait: 4.7 days</p>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Employee Submission</span>
              <span className="font-medium text-slate-800">Instant</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 font-semibold text-amber-900">
              <span>Section Chief Review</span>
              <span>1.2 days →</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Division Chief Review</span>
              <span className="font-medium text-slate-800">2.1 days →</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">PENRO Head Approval</span>
              <span className="font-medium text-slate-800">0.8 days</span>
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
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Directory of personnel accounts and signatory privileges</p>
        </div>

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xl font-semibold text-slate-900">{employees.length}</span>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">EMPLOYEES</p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xl font-semibold text-[#1B4332]">{staff.length}</span>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">STAFF/SIGNATORIES</p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xl font-semibold text-emerald-700">{users.filter((u) => u.status === 'ACTIVE').length}</span>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">ACTIVE</p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xl font-semibold text-slate-500">1</span>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">INACTIVE</p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xl font-semibold text-rose-700">1</span>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">LOCKED</p>
          </div>
        </div>

        {/* Tabs: Employee vs Staff */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-md w-fit">
          <button
            onClick={() => setUserTab('employees')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
              userTab === 'employees' ? 'bg-white text-[#1B4332] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Employee Accounts
          </button>
          <button
            onClick={() => setUserTab('staff')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
              userTab === 'staff' ? 'bg-white text-[#1B4332] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff / Signatory Accounts
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Search name, position, email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="flex-1 h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-600"
          />
          <select
            value={userStatusFilter}
            onChange={(e) => setUserStatusFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
          <select
            value={userSectionFilter}
            onChange={(e) => setUserSectionFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none"
          >
            <option value="ALL">All Sections</option>
            <option value="CENRO Rosario">CENRO Rosario</option>
            <option value="CENRO San Fernando">CENRO San Fernando</option>
            <option value="PENRO La Union">PENRO La Union</option>
          </select>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4">Employee Name</th>
                <th className="py-2.5 px-4">Position / Designation</th>
                <th className="py-2.5 px-4">Section / Office</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Last Login</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-2.5 px-4 text-slate-600">{u.position || u.role}</td>
                  <td className="py-2.5 px-4 text-slate-600">{u.section || 'PENRO La Union'}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">{u.email}</td>
                  <td className="py-2.5 px-4 text-slate-400 text-[11px]">{u.lastLogin || '2025-01-28 08:00'}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">Chronological system security trail of actions, approvals, and events</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xl font-semibold text-slate-900">{auditLogs.length}</span>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">TOTAL LOG ENTRIES</p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xl font-semibold text-[#1B4332]">{filteredLogs.length}</span>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">FILTERED RESULTS</p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-800">{new Date().toLocaleString()}</span>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">LATEST ACTIVITY</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Search log records by TA#, user, or details..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            className="flex-1 h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-600"
          />
          <select
            value={auditActionFilter}
            onChange={(e) => setAuditActionFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none"
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

        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Target</th>
                <th className="py-2.5 px-4">TA Reference</th>
                <th className="py-2.5 px-4">IP Address</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{log.user}</td>
                  <td className="py-2.5 px-4 text-slate-600">{log.role}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                        log.action === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : log.action === 'Cancelled'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : log.action === 'Submitted'
                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{log.target}</td>
                  <td className="py-2.5 px-4 font-mono font-medium text-[#1B4332]">{log.trackingNumber}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">{log.ipAddress}</td>
                  <td className="py-2.5 px-4 text-slate-700 text-[11px] max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        return renderDataTab();
      case 'tables':
        return renderTablesTab();
      case 'cancelled':
        return renderCancelledTab();
      case 'search':
        return renderSearchTab();
      case 'edit':
        return renderEditTab();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <span className="font-mono font-semibold text-[#1B4332] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 text-xs">
                {selectedRecord.trackingNumber}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{selectedRecord.destination}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{selectedRecord.purpose}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Employee</span>
                  <span className="font-semibold text-slate-800">{selectedRecord.createdBy?.name || 'Juan Dela Cruz'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Station</span>
                  <span className="font-semibold text-slate-800">{selectedRecord.office}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Travel Date</span>
                  <span className="font-semibold text-slate-800">{new Date(selectedRecord.startDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Signatories */}
              <div className="bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Approval Trail</span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                    <span className="font-medium text-slate-800">1. Section Chief (Verifier)</span>
                    <span className="font-semibold text-emerald-800">Irene O. Cadiz ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                    <span className="font-medium text-slate-800">2. Division Chief (Verifier)</span>
                    <span className="font-semibold text-emerald-800">Luis P. Gonzaga ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                    <span className="font-medium text-slate-800">3. Head of PENRO (Final Signatory)</span>
                    <span className="font-medium text-slate-500">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-xs text-slate-900">Edit Travel Authority — {editingRecord.trackingNumber}</h3>
              <button onClick={() => setEditingRecord(null)} className="w-7 h-7 rounded bg-slate-100 text-slate-600 text-xs">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3 text-xs overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase text-[10px]">Destination</label>
                <input
                  type="text"
                  value={editingRecord.destination}
                  onChange={(e) => setEditingRecord({ ...editingRecord, destination: e.target.value })}
                  className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase text-[10px]">Purpose</label>
                <textarea
                  rows={2}
                  value={editingRecord.purpose}
                  onChange={(e) => setEditingRecord({ ...editingRecord, purpose: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase text-[10px]">AOR Scope</label>
                  <select
                    value={editingRecord.aorType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, aorType: e.target.value as any })}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none"
                  >
                    <option value="Within AOR">Within AOR</option>
                    <option value="Outside AOR">Outside AOR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase text-[10px]">Transportation Mode</label>
                  <select
                    value={editingRecord.transportation}
                    onChange={(e) => setEditingRecord({ ...editingRecord, transportation: e.target.value as any })}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none"
                  >
                    <option value="Government Vehicle">Government Vehicle</option>
                    <option value="Public Transport">Public Transport</option>
                    <option value="Airline">Airline</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1B4332] hover:bg-[#143326] text-white font-medium rounded text-xs shadow-2xs"
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading ETAPS Admin Portal...</div>}>
      <AdminPortalContent />
    </Suspense>
  );
}
