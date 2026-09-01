import { Role, UserStatus, TARequestStatus, ApprovalAction, NotificationChannel, SMSStatus } from '@prisma/client';

export type { Role, UserStatus, TARequestStatus, ApprovalAction, NotificationChannel, SMSStatus };

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  section?: string | null;
  phoneNumber: string;
}

export interface TARequestMemberDTO {
  id?: string;
  name: string;
  position?: string | null;
  userId?: string | null;
}

export interface ApprovalStepDTO {
  id: string;
  order: number;
  approverRole: Role;
  approverId?: string | null;
  approver?: {
    name: string;
    email: string;
  } | null;
  action: ApprovalAction;
  remarks?: string | null;
  actionDate?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TARequestDTO {
  id: string;
  trackingNumber: string;
  createdById: string;
  createdBy?: {
    name: string;
    email: string;
    section?: string | null;
  };
  purpose: string;
  destination: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  startDate: string | Date;
  endDate: string | Date;
  status: TARequestStatus;
  resubmitCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  teamMembers?: TARequestMemberDTO[];
  approvalSteps?: ApprovalStepDTO[];
}

export interface CreateTARequestPayload {
  purpose: string;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  startDate: string;
  endDate: string;
  teamMembers?: { name: string; position?: string; userId?: string }[];
  submitImmediately?: boolean;
}

export interface ResubmitTARequestPayload {
  startDate: string;
  endDate: string;
}

export interface ActionApprovalPayload {
  requestId: string;
  action: 'APPROVED' | 'REJECTED';
  remarks?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
