
/**
 * KOTRA HUB
 * Onboarding Approval Utilities
 *
 * Handles:
 * - Dynamic field validation
 * - Workstream validation
 * - Workstream review status
 * - Final onboarding approval eligibility
 */

import type {
  Submission,
  DynamicFieldValue,
  WorkstreamReview,
} from "../types";

import type {
  AssignedWorkstream,
} from "./workflowResolver";

// ==========================================
// 1. VALIDATE FIELD VALUE
// ==========================================

export function isFilled(
  value: DynamicFieldValue | undefined
): boolean {
  if (typeof value === "boolean") {
    return value === true;
  }

  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

// ==========================================
// 2. VALIDATE WORKSTREAM
// ==========================================

export function isWorkstreamValid(
  submission: Submission,
  workstream: AssignedWorkstream
): boolean {
  if (workstream.forms.length === 0) {
    return false;
  }

  return workstream.forms.every((form) => {
    const response =
      submission.dynamicResponses?.find(
        (r) =>
          r.formId === form.id &&
          r.workstreamId === workstream.id
      );

    return form.fields.every((field) => {
      if (!field.required) {
        return true;
      }

      return isFilled(
        response?.answers[field.id]
      );
    });
  });
}

// ==========================================
// 3. GET WORKSTREAM REVIEW STATUS
// ==========================================

export function getWorkstreamReview(
  submission: Submission,
  workstreamId: string
): WorkstreamReview {
  const existing =
    submission.workstreamReviews?.find(
      (r) => r.workstreamId === workstreamId
    );

  if (existing) {
    return existing;
  }

  return {
    workstreamId,
    status: "DRAFT",
  };
}

// ==========================================
// 4. CHECK FINAL APPROVAL ELIGIBILITY
// ==========================================

export function canFinalApprove(
  submission: Submission
): boolean {
  // HR Induction must be approved first.
  if (submission.status !== "COMPLETED") {
    return false;
  }

  const workflow =
    submission.assignedWorkflow;

  // A published workflow must be assigned.
  if (
    !workflow ||
    workflow.workstreams.length === 0
  ) {
    return false;
  }

  // Every assigned workstream must have
  // a separate HR approval.
  const allWorkstreamsApproved =
    workflow.workstreams.every(
      (workstream) => {
        const review = getWorkstreamReview(
          submission,
          workstream.id
        );

        return review.status === "APPROVED";
      }
    );

  return allWorkstreamsApproved;
}
