
import { defineStore } from "pinia";

import { useTemplateBuilderStore } from "./templateBuilder";

import {
  resolvePublishedWorkflow,
} from "../utils/workflowResolver";

import {
  canFinalApprove,
  getWorkstreamReview,
  isWorkstreamValid,
} from "../utils/onboardingApproval.ts";

import { onboardingTemplates } from "../config/onboardingTemplates";

import type {
  Role,
  Submission,
  PropertyItem,
  DocumentItem,
  EmploymentType,
  Department,
  DynamicFieldValue,
  DynamicFormResponse,
  WorkstreamReview,
} from "../types";

// ==========================================
// 1. STORAGE CONFIGURATION
// ==========================================

const STORAGE_KEY = "kotra-submissions";
const SESSION_KEY = "kotra-demo-user";
const TEMPLATE_VERSION_KEY = "kotra-induction-template-version";
const TEMPLATE_VERSION = "hr-induction-esign-v1";

// ==========================================
// 2. SESSION USER
// ==========================================

type SessionUser = {
  id: string;
  name: string;
  role: Role;
};

// ==========================================
// 3. EMPLOYEE PROFILE
// ==========================================

interface EmployeeProfile {
  employeeId: string;
  name: string;
  employmentType: EmploymentType;
  department: Department;
}

// Demo employees only.
// Production onboarding cases must be created
// by HR when the employee physically reports
// for duty on Day 1.

const employeeProfiles: Record<string, EmployeeProfile> = {
  EMP001: {
    employeeId: "EMP001",
    name: "Aina Ahmad",
    employmentType: "INTERN",
    department: "QA",
  },

  EMP002: {
    employeeId: "EMP002",
    name: "Permanent Employee",
    employmentType: "PERMANENT",
    department: "HR",
  },

  EMP003: {
    employeeId: "EMP003",
    name: "Contract Employee",
    employmentType: "CONTRACT",
    department: "PRODUCTION",
  },
};

// ==========================================
// 4. HR INDUCTION TOPICS
// ==========================================

const inductionTopics = [
  "Letter of Appointment",
  "Car Parking Policy and Car Sticker",
  "Corporate Video Presentation",
  "Corporate Information and The People",
  "History of Kotra",
  "Recognitions and Awards of Kotra",
  "Kotra’s Brands and Products",
  "Employee Handbook",
  "EHR",
  "KRC Club",
  "Kotra Toastmaster Club",
  "E-Services",
  "Employee Referral Program",
  "Company Tour",
  "Introduction to Human Resource Personnel",
  "Introduction to Admin Support Department",
  "Scan in and out device/ Attendance devices",
  "Good Toilet Practice",
  "Meet with Manager/ Supervisor",
];

// ==========================================
// 5. CREATE HR INDUCTION CHECKLIST
// ==========================================

function createInductionChecklist(): PropertyItem[] {
  return inductionTopics.map((label, index) => ({
    id: `induction-${index + 1}`,
    label,
    required: true,
    received: false,
    date: "",
    signature: "",
  }));
}

// ==========================================
// 6. CREATE REQUIRED DOCUMENT CHECKLIST
// ==========================================

function createDocumentChecklist(
  employmentType: EmploymentType
): DocumentItem[] {
  return onboardingTemplates[employmentType]
    .filter((item) => item.type === "DOCUMENT")
    .map((item) => ({
      id: item.id,
      label: item.label,
      required: item.required,
      fileName: "",
      submitted: false,
    }));
}

// ==========================================
// 7. CREATE EMPLOYEE SUBMISSION
// ==========================================

function createSubmission(
  employeeId: string,
  employeeName: string
): Submission {
  const profile = employeeProfiles[employeeId];

  if (!profile) {
    throw new Error(
      `Employee profile not found: ${employeeId}`
    );
  }

  return {
    employeeId,
    employeeName,
    employmentType: profile.employmentType,
    department: profile.department,

    employeeSignature: "",

    items: createInductionChecklist(),

    documents: createDocumentChecklist(
      profile.employmentType
    ),

    status: "DRAFT",

    assignedWorkflow: undefined,
    dynamicResponses: [],
    workstreamReviews: [],

    finalApproval: {
      status: "IN_PROGRESS",
    },
  };
}

// ==========================================
// 8. CLONE SUBMISSION
// ==========================================

function cloneSubmission(
  submission: Submission
): Submission {
  return {
    ...submission,

    items: submission.items.map((item) => ({
      ...item,
    })),

    documents: submission.documents.map((doc) => ({
      ...doc,
    })),

    dynamicResponses: submission.dynamicResponses?.map(
      (response) => ({
        ...response,
        answers: { ...response.answers },
      })
    ),

    workstreamReviews: submission.workstreamReviews?.map(
      (review) => ({
        ...review,
      })
    ),
  };
}

// ==========================================
// 9. LOAD SESSION USER
// ==========================================

function loadUser(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    const value: unknown = JSON.parse(raw);

    if (!value || typeof value !== "object") {
      return null;
    }

    const user = value as Partial<SessionUser>;

    if (
      user.id === "HR001" &&
      user.role === "HR"
    ) {
      return {
        id: "HR001",
        name: user.name || "HR Officer",
        role: "HR",
      };
    }

    if (
      user.id &&
      user.role === "EMPLOYEE" &&
      employeeProfiles[user.id]
    ) {
      return {
        id: user.id,
        name: employeeProfiles[user.id].name,
        role: "EMPLOYEE",
      };
    }
  } catch {
    // Ignore invalid demo session.
  }

  return null;
}

// ==========================================
// 10. LOAD AND MIGRATE SUBMISSIONS
// ==========================================

function loadSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    const parsed: unknown = raw
      ? JSON.parse(raw)
      : [];

    const stored: unknown[] = Array.isArray(parsed)
      ? parsed
      : [];

    const versionMatches =
      localStorage.getItem(TEMPLATE_VERSION_KEY) ===
      TEMPLATE_VERSION;

    const result: Submission[] = [];

    for (const profile of Object.values(employeeProfiles)) {
      const fresh = createSubmission(
        profile.employeeId,
        profile.name
      );

      const old = stored.find(
        (value) =>
          typeof value === "object" &&
          value !== null &&
          (value as { employeeId?: string })
            .employeeId === profile.employeeId
      ) as Partial<Submission> | undefined;

      if (!old) {
        result.push(fresh);
        continue;
      }

      const oldItems = Array.isArray(old.items)
        ? old.items
        : [];

      const oldDocuments = Array.isArray(old.documents)
        ? old.documents
        : [];

      const hasValidTemplate =
        versionMatches &&
        fresh.items.every((item) =>
          oldItems.some(
            (previous) => previous.id === item.id
          )
        );

      // Preserve onboarding workflow and review data
      // even when the legacy induction template changes.
      if (!hasValidTemplate) {
        result.push({
          ...fresh,

          employeeSignature:
            old.employeeSignature || "",

          items: oldItems.length
            ? oldItems
            : fresh.items,

          documents: oldDocuments.length
            ? oldDocuments
            : fresh.documents,

          status: old.status ?? "DRAFT",

          submittedAt: old.submittedAt,
          verifiedAt: old.verifiedAt,
          verifiedBy: old.verifiedBy,
          comment: old.comment,

          assignedWorkflow: old.assignedWorkflow,

          dynamicResponses:
            old.dynamicResponses ?? [],

          workstreamReviews:
            old.workstreamReviews ?? [],

          finalApproval: old.finalApproval ?? {
            status: "IN_PROGRESS",
          },
        });

        continue;
      }

      result.push({
        ...fresh,

        employeeSignature:
          old.employeeSignature || "",

        items: fresh.items.map((item) => {
          const previous = oldItems.find(
            (i) => i.id === item.id
          );

          return previous
            ? {
                ...item,
                received: Boolean(
                  previous.received
                ),
                date: previous.date || "",
                signature:
                  previous.signature || "",
              }
            : item;
        }),

        documents: fresh.documents.map((doc) => {
          const previous = oldDocuments.find(
            (d) => d.id === doc.id
          );

          return previous
            ? {
                ...doc,
                fileName:
                  previous.fileName || "",
                submitted: Boolean(
                  previous.submitted &&
                  previous.fileName
                ),
              }
            : doc;
        }),

        status: old.status || "DRAFT",

        submittedAt: old.submittedAt,
        verifiedAt: old.verifiedAt,
        verifiedBy: old.verifiedBy,
        comment: old.comment,

        assignedWorkflow:
          old.assignedWorkflow,

        dynamicResponses:
          old.dynamicResponses ?? [],

        workstreamReviews:
          old.workstreamReviews ?? [],

        finalApproval:
          old.finalApproval ?? {
            status: "IN_PROGRESS",
          },
      });
    }

    localStorage.setItem(
      TEMPLATE_VERSION_KEY,
      TEMPLATE_VERSION
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(result)
    );

    return result;
  } catch (error) {
    console.error(
      "Failed to load submissions:",
      error
    );

    return Object.values(employeeProfiles).map(
      (profile) =>
        createSubmission(
          profile.employeeId,
          profile.name
        )
    );
  }
}

// ==========================================
// 11. VALIDATE HR INDUCTION
// ==========================================

function validateSubmission(
  submission: Submission,
  profile: EmployeeProfile
): boolean {
  if (
    !submission.employeeSignature ||
    !submission.employeeSignature.startsWith(
      "data:image/png;base64,"
    )
  ) {
    return false;
  }

  const requiredTopics =
    createInductionChecklist();

  const inductionComplete = requiredTopics.every(
    (required) => {
      const item = submission.items.find(
        (i) => i.id === required.id
      );

      return Boolean(
        item &&
        item.received &&
        item.date &&
        item.signature
      );
    }
  );

  const requiredDocuments =
    createDocumentChecklist(
      profile.employmentType
    );

  const documentsComplete =
    requiredDocuments.every((required) => {
      if (!required.required) return true;

      const doc = submission.documents.find(
        (d) => d.id === required.id
      );

      return Boolean(
        doc &&
        doc.submitted &&
        doc.fileName?.trim()
      );
    });

  return inductionComplete && documentsComplete;
}

// ==========================================
// 12. PINIA ONBOARDING STORE
// ==========================================

export const useOnboardingStore = defineStore(
  "onboarding",
  {
    state: () => ({
      user: loadUser() as SessionUser | null,
      submissions: loadSubmissions(),
    }),

    // ======================================
    // GETTERS
    // ======================================

    getters: {
      current(state): Submission | undefined {
        return state.submissions.find(
          (s) =>
            s.employeeId === state.user?.id
        );
      },

      pending(state): Submission[] {
        return state.submissions.filter(
          (s) =>
            s.status === "PENDING_HR"
        );
      },
    },

    // ======================================
    // ACTIONS
    // ======================================

    actions: {
      // ------------------------------------
      // ENSURE EMPLOYEE SUBMISSION
      // ------------------------------------

      ensureEmployeeSubmission() {
        const user = this.user;

        if (
          !user ||
          user.role !== "EMPLOYEE"
        ) {
          return;
        }

        if (
          !this.submissions.some(
            (s) => s.employeeId === user.id
          )
        ) {
          this.submissions.push(
            createSubmission(
              user.id,
              user.name
            )
          );

          this.persist();
        }
      },

      // ------------------------------------
      // LOGIN
      // ------------------------------------

      login(
        id: string,
        password: string
      ): boolean {
        if (password !== "Welcome123!") {
          return false;
        }

        const normalized =
          id.trim().toUpperCase();

        if (normalized === "HR001") {
          this.user = {
            id: "HR001",
            name: "HR Officer",
            role: "HR",
          };
        } else {
          const profile =
            employeeProfiles[normalized];

          if (!profile) return false;

          this.user = {
            id: profile.employeeId,
            name: profile.name,
            role: "EMPLOYEE",
          };
        }

        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify(this.user)
        );

        this.ensureEmployeeSubmission();

        return true;
      },

      // ------------------------------------
      // LOGOUT
      // ------------------------------------

      logout() {
        this.user = null;

        sessionStorage.removeItem(
          SESSION_KEY
        );
      },

      // ------------------------------------
      // PERSIST DATA
      // ------------------------------------

      persist() {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            this.submissions
          )
        );
      },

      // ------------------------------------
      // SAVE HR INDUCTION DRAFT
      // ------------------------------------

      save(submission: Submission) {
        if (
          !this.user ||
          this.user.role !== "EMPLOYEE" ||
          this.user.id !==
            submission.employeeId
        ) {
          return;
        }

        const index =
          this.submissions.findIndex(
            (s) =>
              s.employeeId ===
              submission.employeeId
          );

        if (index < 0) return;

        const existing =
          this.submissions[index];

        if (
          existing.finalApproval?.status ===
          "COMPLETED"
        ) {
          return;
        }

        if (
          ![
            "DRAFT",
            "CHANGES_REQUESTED",
          ].includes(existing.status)
        ) {
          return;
        }

        this.submissions[index] = {
          ...cloneSubmission(submission),

          employeeId:
            existing.employeeId,

          employeeName:
            existing.employeeName,

          employmentType:
            existing.employmentType,

          department:
            existing.department,

          status:
            existing.status,

          comment:
            existing.comment,

          // Preserve HR-controlled workflow.
          assignedWorkflow:
            existing.assignedWorkflow,

          dynamicResponses:
            existing.dynamicResponses,

          workstreamReviews:
            existing.workstreamReviews,

          finalApproval:
            existing.finalApproval,
        };

        this.persist();
      },

      // ------------------------------------
      // SUBMIT HR INDUCTION
      // ------------------------------------

      submit(submission: Submission) {
        if (
          !this.user ||
          this.user.role !== "EMPLOYEE" ||
          this.user.id !==
            submission.employeeId
        ) {
          return;
        }

        const index =
          this.submissions.findIndex(
            (s) =>
              s.employeeId ===
              submission.employeeId
          );

        if (index < 0) return;

        const existing =
          this.submissions[index];

        if (
          existing.finalApproval?.status ===
          "COMPLETED"
        ) {
          return;
        }

        if (
          ![
            "DRAFT",
            "CHANGES_REQUESTED",
          ].includes(existing.status)
        ) {
          return;
        }

        const profile =
          employeeProfiles[
            existing.employeeId
          ];

        if (
          !profile ||
          !validateSubmission(
            submission,
            profile
          )
        ) {
          return;
        }

        this.submissions[index] = {
          ...cloneSubmission(submission),

          employeeId:
            existing.employeeId,

          employeeName:
            existing.employeeName,

          employmentType:
            existing.employmentType,

          department:
            existing.department,

          assignedWorkflow:
            existing.assignedWorkflow,

          dynamicResponses:
            existing.dynamicResponses,

          workstreamReviews:
            existing.workstreamReviews,

          finalApproval:
            existing.finalApproval,

          status: "PENDING_HR",

          submittedAt:
            new Date().toISOString(),

          comment: undefined,

          verifiedAt: undefined,
          verifiedBy: undefined,
        };

        this.persist();
      },

      // ------------------------------------
      // REVIEW HR INDUCTION
      // ------------------------------------

      review(
        id: string,
        approved: boolean,
        comment: string
      ) {
        if (
          this.user?.role !== "HR"
        ) {
          return;
        }

        const submission =
          this.submissions.find(
            (s) => s.employeeId === id
          );

        if (
          !submission ||
          submission.status !==
            "PENDING_HR" ||
          submission.finalApproval?.status ===
            "COMPLETED"
        ) {
          return;
        }

        if (
          !approved &&
          !comment.trim()
        ) {
          return;
        }

        submission.status = approved
          ? "COMPLETED"
          : "CHANGES_REQUESTED";

        submission.comment =
          comment;

        submission.verifiedBy =
          this.user.id;

        submission.verifiedAt =
          new Date().toISOString();

        this.persist();
      },

      // ------------------------------------
      // ASSIGN PUBLISHED WORKFLOW
      // ------------------------------------

      assignPublishedWorkflow(
        employeeId: string
      ): boolean {
        if (
          this.user?.role !== "HR"
        ) {
          return false;
        }

        const submission =
          this.submissions.find(
            (s) =>
              s.employeeId === employeeId
          );

        if (!submission) {
          return false;
        }

        if (
          submission.finalApproval?.status ===
          "COMPLETED"
        ) {
          return false;
        }

        if (
          submission.assignedWorkflow
        ) {
          return false;
        }

        const templateStore =
          useTemplateBuilderStore();

        const assigned =
          resolvePublishedWorkflow({
            employmentType:
              submission.employmentType,

            department:
              submission.department,

            workflows:
              templateStore.workflows,

            workstreams:
              templateStore.workstreams,

            forms:
              templateStore.forms,
          });

        if (!assigned) {
          return false;
        }

        // Snapshot assigned to employee.
        // Later template edits do not
        // silently change this assignment.
        submission.assignedWorkflow =
          assigned;

        submission.dynamicResponses = [];

        submission.workstreamReviews =
          assigned.workstreams.map(
            (workstream) => ({
              workstreamId:
                workstream.id,

              status:
                "DRAFT" as const,
            })
          );

        submission.finalApproval = {
          status: "IN_PROGRESS",
        };

        this.persist();

        return true;
      },

      // ------------------------------------
      // GET ASSIGNED WORKFLOW
      // ------------------------------------

      getAssignedWorkflow(
        employeeId: string
      ) {
        return (
          this.submissions.find(
            (s) =>
              s.employeeId === employeeId
          )?.assignedWorkflow ?? null
        );
      },

      // ------------------------------------
      // SAVE DYNAMIC FIELD ANSWER
      // ------------------------------------

      saveDynamicAnswer(
        employeeId: string,
        workstreamId: string,
        formId: string,
        fieldId: string,
        value: DynamicFieldValue
      ): boolean {
        if (
          this.user?.role !==
            "EMPLOYEE" ||
          this.user.id !== employeeId
        ) {
          return false;
        }

        const submission =
          this.submissions.find(
            (s) =>
              s.employeeId === employeeId
          );

        if (
          !submission ||
          submission.finalApproval?.status ===
            "COMPLETED"
        ) {
          return false;
        }

        const workstream =
          submission.assignedWorkflow?.workstreams.find(
            (w) =>
              w.id === workstreamId
          );

        const form =
          workstream?.forms.find(
            (f) =>
              f.id === formId
          );

        if (
          !form?.fields.some(
            (f) =>
              f.id === fieldId
          )
        ) {
          return false;
        }

        const review =
          getWorkstreamReview(
            submission,
            workstreamId
          );

        if (
          review.status !== "DRAFT" &&
          review.status !==
            "CHANGES_REQUESTED"
        ) {
          return false;
        }

        submission.dynamicResponses ??= [];

        let response:
          DynamicFormResponse | undefined =
          submission.dynamicResponses.find(
            (r) =>
              r.workstreamId ===
                workstreamId &&
              r.formId === formId
          );

        if (!response) {
          response = {
            workstreamId,
            formId,
            answers: {},
            status: "DRAFT",
          };

          submission.dynamicResponses.push(
            response
          );
        }

        response.answers[fieldId] =
          value;

        response.status = "DRAFT";
        response.submittedAt = undefined;

        this.persist();

        return true;
      },

      // ------------------------------------
      // SUBMIT WORKSTREAM
      // ------------------------------------

      submitWorkstream(
        employeeId: string,
        workstreamId: string
      ): boolean {
        if (
          this.user?.role !==
            "EMPLOYEE" ||
          this.user.id !== employeeId
        ) {
          return false;
        }

        const submission =
          this.submissions.find(
            (s) =>
              s.employeeId === employeeId
          );

        if (
          !submission ||
          submission.finalApproval?.status ===
            "COMPLETED"
        ) {
          return false;
        }

        const workstream =
          submission.assignedWorkflow?.workstreams.find(
            (w) =>
              w.id === workstreamId
          );

        if (!workstream) {
          return false;
        }

        const review =
          getWorkstreamReview(
            submission,
            workstreamId
          );

        if (
          review.status !== "DRAFT" &&
          review.status !==
            "CHANGES_REQUESTED"
        ) {
          return false;
        }

        if (
          !isWorkstreamValid(
            submission,
            workstream
          )
        ) {
          return false;
        }

        const now =
          new Date().toISOString();

        submission.workstreamReviews ??= [];

        const updatedReview:
          WorkstreamReview = {
            workstreamId,
            status: "PENDING_HR",
            submittedAt: now,
          };

        const reviewIndex =
          submission.workstreamReviews.findIndex(
            (r) =>
              r.workstreamId ===
              workstreamId
          );

        if (reviewIndex >= 0) {
          submission.workstreamReviews[
            reviewIndex
          ] = updatedReview;
        } else {
          submission.workstreamReviews.push(
            updatedReview
          );
        }

        for (
          const form of
          workstream.forms
        ) {
          const response =
            submission.dynamicResponses?.find(
              (r) =>
                r.workstreamId ===
                  workstreamId &&
                r.formId === form.id
            );

          if (response) {
            response.status =
              "SUBMITTED";

            response.submittedAt =
              now;
          }
        }

        this.persist();

        return true;
      },

      // ------------------------------------
      // HR REVIEW WORKSTREAM
      // ------------------------------------

      reviewWorkstream(
        employeeId: string,
        workstreamId: string,
        approved: boolean,
        comment: string
      ): boolean {
        if (
          this.user?.role !== "HR"
        ) {
          return false;
        }

        const submission =
          this.submissions.find(
            (s) =>
              s.employeeId === employeeId
          );

        if (
          !submission ||
          submission.finalApproval?.status ===
            "COMPLETED"
        ) {
          return false;
        }

        const workstream =
          submission.assignedWorkflow?.workstreams.find(
            (w) =>
              w.id === workstreamId
          );

        if (!workstream) {
          return false;
        }

        const review =
          getWorkstreamReview(
            submission,
            workstreamId
          );

        if (
          review.status !==
          "PENDING_HR"
        ) {
          return false;
        }

        if (
          !approved &&
          !comment.trim()
        ) {
          return false;
        }

        submission.workstreamReviews ??= [];

        const updatedReview:
          WorkstreamReview = {
            ...review,

            status: approved
              ? "APPROVED"
              : "CHANGES_REQUESTED",

            reviewedAt:
              new Date().toISOString(),

            reviewedBy:
              this.user.id,

            comment:
              comment.trim(),
          };

        const index =
          submission.workstreamReviews.findIndex(
            (r) =>
              r.workstreamId ===
              workstreamId
          );

        if (index >= 0) {
          submission.workstreamReviews[
            index
          ] = updatedReview;
        } else {
          submission.workstreamReviews.push(
            updatedReview
          );
        }

        submission.finalApproval = {
          status: "IN_PROGRESS",
        };

        this.persist();

        return true;
      },

      // ------------------------------------
      // EXPLICIT FINAL HR APPROVAL
      // ------------------------------------

      approveFinalOnboarding(
        employeeId: string
      ): boolean {
        if (
          this.user?.role !== "HR"
        ) {
          return false;
        }

        const submission =
          this.submissions.find(
            (s) =>
              s.employeeId === employeeId
          );

        if (
          !submission ||
          submission.finalApproval?.status ===
            "COMPLETED"
        ) {
          return false;
        }

        if (
          !canFinalApprove(
            submission
          )
        ) {
          return false;
        }

        submission.finalApproval = {
          status: "COMPLETED",

          approvedAt:
            new Date().toISOString(),

          approvedBy:
            this.user.id,
        };

        this.persist();

        return true;
      },

      // ------------------------------------
      // RESET DEMO SUBMISSION
      // ------------------------------------

      resetDemoSubmission(
        employeeId: string
      ) {
        if (
          !import.meta.env.DEV
        ) {
          return;
        }

        const profile =
          employeeProfiles[
            employeeId
          ];

        if (!profile) {
          return;
        }

        const fresh =
          createSubmission(
            profile.employeeId,
            profile.name
          );

        const index =
          this.submissions.findIndex(
            (s) =>
              s.employeeId ===
              employeeId
          );

        if (index >= 0) {
          this.submissions[index] =
            fresh;
        } else {
          this.submissions.push(
            fresh
          );
        }

        this.persist();
      },
    },
  }
);
