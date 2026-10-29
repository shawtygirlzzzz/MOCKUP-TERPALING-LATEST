
/**
 * KOTRA HUB
 * Shared TypeScript Types
 *
 * Used by:
 * - Employee Onboarding
 * - HR Induction
 * - Workflow Template Builder
 * - Dynamic Forms
 * - Workstream Approvals
 * - Final Onboarding Approval
 */

// ==========================================
// 1. USER ROLES
// ==========================================

export type Role = "EMPLOYEE" | "HR";

// ==========================================
// 2. HR INDUCTION STATUS
// ==========================================

export type Status =
  | "DRAFT"
  | "PENDING_HR"
  | "CHANGES_REQUESTED"
  | "COMPLETED";

// ==========================================
// 3. EMPLOYMENT TYPES
// ==========================================

export type EmploymentType =
  | "INTERN"
  | "PERMANENT"
  | "CONTRACT";

// ==========================================
// 4. DEPARTMENTS
// ==========================================

export type Department =
  | "QA"
  | "QC"
  | "PRODUCTION"
  | "HR"
  | "IT";

// ==========================================
// 5. HR INDUCTION CHECKLIST ITEM
// ==========================================

export interface PropertyItem {
  id: string;
  label: string;
  required: boolean;

  received: boolean;
  date: string;
  signature: string;
}

// ==========================================
// 6. REQUIRED DOCUMENT
// ==========================================

export interface DocumentItem {
  id: string;
  label: string;
  required: boolean;

  fileName?: string;
  submitted: boolean;
}

// ==========================================
// 7. DYNAMIC FORM FIELD VALUES
// ==========================================

export type DynamicFieldValue =
  | string
  | boolean
  | null;

// ==========================================
// 8. DYNAMIC FORM RESPONSES
// ==========================================

export interface DynamicFormResponse {
  formId: string;
  workstreamId: string;

  // Field ID -> employee response
  answers: Record<string, DynamicFieldValue>;

  status: "DRAFT" | "SUBMITTED";
  submittedAt?: string;
}

// ==========================================
// 9. WORKSTREAM REVIEW STATUS
// ==========================================

export type ReviewStatus =
  | "DRAFT"
  | "PENDING_HR"
  | "CHANGES_REQUESTED"
  | "APPROVED";

// ==========================================
// 10. WORKSTREAM REVIEW
// ==========================================

export interface WorkstreamReview {
  workstreamId: string;
  status: ReviewStatus;

  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  comment?: string;
}

// ==========================================
// 11. FINAL ONBOARDING STATUS
// ==========================================

export type OnboardingCaseStatus =
  | "IN_PROGRESS"
  | "READY_FOR_FINAL_APPROVAL"
  | "COMPLETED";

// ==========================================
// 12. FINAL ONBOARDING APPROVAL
// ==========================================

export interface FinalOnboardingApproval {
  status: OnboardingCaseStatus;

  approvedAt?: string;
  approvedBy?: string;
}

// ==========================================
// 13. EMPLOYEE ONBOARDING SUBMISSION
// ==========================================

export interface Submission {
  employeeId: string;
  employeeName: string;

  employmentType: EmploymentType;
  department: Department;

  // Employee handwritten electronic signature
  employeeSignature?: string;

  // Section A: HR Induction Acknowledgement
  items: PropertyItem[];

  // Section B: Required Documents
  documents: DocumentItem[];

  // HR Induction status
  status: Status;

  // HR Induction review information
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  comment?: string;

  // Published workflow snapshot assigned by HR
  assignedWorkflow?: import(
    "../utils/workflowResolver"
  ).AssignedWorkflow;

  // Employee answers to dynamic forms
  dynamicResponses?: DynamicFormResponse[];

  // Separate approval for each workstream
  workstreamReviews?: WorkstreamReview[];

  // Explicit final HR onboarding approval
  finalApproval?: FinalOnboardingApproval;
}

// ==========================================
// 14. TEMPLATE BUILDER TYPES
// ==========================================

export type {
  TemplateStatus,
  FormFieldType,
  FormField,
  FormTemplate,
  WorkstreamTemplate,
  WorkflowTemplate,
} from "./templateBuilder";
