
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Submission } from "../types";
import { useOnboardingStore } from "../stores/onboarding";

import {
  canFinalApprove,
  getWorkstreamReview,
} from "../utils/onboardingApproval.ts";

// ==========================================
// 1. PROPS
// ==========================================

const props = defineProps<{
  submission: Submission;
}>();

// ==========================================
// 2. STORE
// ==========================================

const store = useOnboardingStore();

// ==========================================
// 3. LOCAL STATE
// ==========================================

const comments = ref<Record<string, string>>({});
const message = ref("");
const messageType = ref<"success" | "error">("success");

// ==========================================
// 4. COMPUTED PROPERTIES
// ==========================================

const workflow = computed(
  () => props.submission.assignedWorkflow
);

const readyForFinal = computed(
  () => canFinalApprove(props.submission)
);

const isFinalApproved = computed(
  () =>
    props.submission.finalApproval?.status ===
    "COMPLETED"
);

const canAssignWorkflow = computed(
  () =>
    !props.submission.assignedWorkflow &&
    !isFinalApproved.value
);

// ==========================================
// 5. ASSIGN PUBLISHED WORKFLOW
// ==========================================

function assignWorkflow() {
  message.value = "";

  if (!canAssignWorkflow.value) {
    messageType.value = "error";
    message.value =
      "Workflow cannot be assigned to this employee.";
    return;
  }

  const success = store.assignPublishedWorkflow(
    props.submission.employeeId
  );

  messageType.value = success ? "success" : "error";

  message.value = success
    ? "Published workflow assigned successfully."
    : "Unable to assign workflow. Make sure exactly one published workflow matches the employee's employment type and department, and all referenced workstreams and forms are published.";
}

// ==========================================
// 6. REVIEW WORKSTREAM
// ==========================================

function review(
  workstreamId: string,
  approved: boolean
) {
  message.value = "";

  const comment = comments.value[workstreamId] ?? "";

  const success = store.reviewWorkstream(
    props.submission.employeeId,
    workstreamId,
    approved,
    comment
  );

  messageType.value = success ? "success" : "error";

  message.value = success
    ? approved
      ? "Workstream approved successfully."
      : "Changes requested. The employee can update and resubmit this workstream."
    : "Unable to review this workstream. Check its submission status and HR comments.";

  if (success) {
    comments.value[workstreamId] = "";
  }
}

// ==========================================
// 7. FINAL ONBOARDING APPROVAL
// ==========================================

function finalApprove() {
  message.value = "";

  if (!readyForFinal.value) {
    messageType.value = "error";
    message.value =
      "HR Induction and all assigned workstreams must be approved before final onboarding approval.";
    return;
  }

  const success = store.approveFinalOnboarding(
    props.submission.employeeId
  );

  messageType.value = success ? "success" : "error";

  message.value = success
    ? "Final onboarding approval recorded successfully."
    : "Final approval is not available yet.";
}

// ==========================================
// 8. DISPLAY FIELD ANSWERS
// ==========================================

function getAnswer(
  workstreamId: string,
  formId: string,
  fieldId: string
): string | boolean {
  const response =
    props.submission.dynamicResponses?.find(
      (r) =>
        r.workstreamId === workstreamId &&
        r.formId === formId
    );

  const answer = response?.answers[fieldId];

  if (answer === undefined || answer === null) {
    return "Not provided";
  }

  if (typeof answer === "boolean") {
    return answer ? "Yes" : "No";
  }

  return answer || "Not provided";
}

function isImageSignature(
  value: string | boolean
): boolean {
  return (
    typeof value === "string" &&
    value.startsWith("data:image/")
  );
}

function formatDate(value?: string): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-MY");
}
</script>

<template>
  <v-card
    variant="outlined"
    rounded="lg"
    class="my-4"
  >
    <!-- =====================================
         HEADER
    ====================================== -->

    <v-card-title class="pt-4">
      Workflow Review — {{ submission.employeeName }}
    </v-card-title>

    <v-card-subtitle class="pb-3">
      {{ submission.employeeId }}
      |
      {{ submission.employmentType }}
      |
      {{ submission.department }}
    </v-card-subtitle>

    <v-card-text>
      <!-- ===================================
           FEEDBACK MESSAGE
      ==================================== -->

      <v-alert
        v-if="message"
        :type="messageType"
        variant="tonal"
        closable
        class="mb-4"
        @click:close="message = ''"
      >
        {{ message }}
      </v-alert>

      <!-- ===================================
           NO WORKFLOW ASSIGNED
      ==================================== -->

      <template v-if="!workflow">
        <p class="mb-3">
          No published workflow assigned.
        </p>

        <v-btn
          color="primary"
          :disabled="!canAssignWorkflow"
          @click="assignWorkflow"
        >
          Assign Published Workflow
        </v-btn>

        <p class="text-caption text-medium-emphasis mt-3">
          Workflow assignment is independent of HR
          Induction approval. HR can assign a
          published workflow even after the
          employee's HR Induction is approved.
        </p>
      </template>

      <!-- ===================================
           ASSIGNED WORKFLOW
      ==================================== -->

      <template v-else>
        <div class="d-flex align-center flex-wrap ga-2 mb-4">
          <h3 class="text-subtitle-1">
            {{ workflow.name }}
          </h3>

          <v-chip
            color="primary"
            size="small"
            variant="tonal"
          >
            Version {{ workflow.version }}
          </v-chip>

          <v-chip
            v-if="isFinalApproved"
            color="success"
            size="small"
          >
            Onboarding Completed
          </v-chip>
        </div>

        <!-- =================================
             HR INDUCTION STATUS
        ================================== -->

        <v-alert
          :type="
            submission.status === 'COMPLETED'
              ? 'success'
              : 'info'
          "
          variant="tonal"
          class="mb-4"
        >
          HR Induction:
          {{
            submission.status === "COMPLETED"
              ? "Approved"
              : submission.status.replaceAll("_", " ")
          }}
        </v-alert>

        <!-- =================================
             WORKSTREAMS
        ================================== -->

        <v-card
          v-for="workstream in workflow.workstreams"
          :key="workstream.id"
          variant="tonal"
          rounded="lg"
          class="mb-4"
        >
          <v-card-title class="text-subtitle-1">
            {{ workstream.name }}
          </v-card-title>

          <v-card-subtitle>
            Responsible Department:
            {{ workstream.responsibleDepartment }}
          </v-card-subtitle>

          <v-card-text>
            <!-- WORKSTREAM STATUS -->

            <v-chip
              class="mb-4"
              variant="outlined"
              :color="
                getWorkstreamReview(
                  submission,
                  workstream.id
                ).status === 'APPROVED'
                  ? 'success'
                  : getWorkstreamReview(
                      submission,
                      workstream.id
                    ).status === 'CHANGES_REQUESTED'
                  ? 'warning'
                  : 'primary'
              "
            >
              {{
                getWorkstreamReview(
                  submission,
                  workstream.id
                ).status.replaceAll("_", " ")
              }}
            </v-chip>

            <!-- FORMS -->

            <v-card
              v-for="form in workstream.forms"
              :key="form.id"
              variant="outlined"
              rounded="md"
              class="mb-3"
            >
              <v-card-title class="text-body-1 font-weight-bold">
                {{ form.name }}
              </v-card-title>

              <v-card-text>
                <div
                  v-for="field in form.fields"
                  :key="field.id"
                  class="mb-3"
                >
                  <div class="font-weight-medium mb-1">
                    {{ field.label }}
                  </div>

                  <!-- SIGNATURE FIELD -->

                  <template
                    v-if="field.type === 'SIGNATURE'"
                  >
                    <img
                      v-if="
                        isImageSignature(
                          getAnswer(
                            workstream.id,
                            form.id,
                            field.id
                          )
                        )
                      "
                      :src="
                        String(
                          getAnswer(
                            workstream.id,
                            form.id,
                            field.id
                          )
                        )
                      "
                      class="review-signature"
                      alt="Employee signature"
                    />

                    <span
                      v-else
                      class="text-body-2 text-medium-emphasis"
                    >
                      {{
                        getAnswer(
                          workstream.id,
                          form.id,
                          field.id
                        )
                      }}
                    </span>
                  </template>

                  <!-- OTHER FIELD TYPES -->

                  <div
                    v-else
                    class="text-body-2"
                  >
                    {{
                      getAnswer(
                        workstream.id,
                        form.id,
                        field.id
                      )
                    }}
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- REVIEW COMMENTS -->

            <v-alert
              v-if="
                getWorkstreamReview(
                  submission,
                  workstream.id
                ).comment
              "
              type="info"
              variant="tonal"
              class="mb-4"
            >
              HR Remarks:
              {{
                getWorkstreamReview(
                  submission,
                  workstream.id
                ).comment
              }}
            </v-alert>

            <!-- HR REVIEW ACTIONS -->

            <template
              v-if="
                !isFinalApproved &&
                getWorkstreamReview(
                  submission,
                  workstream.id
                ).status === 'PENDING_HR'
              "
            >
              <v-textarea
                v-model="comments[workstream.id]"
                label="HR Review Comment"
                variant="outlined"
                rows="2"
                class="mb-3"
                hint="A comment is required when requesting changes."
                persistent-hint
              />

              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  color="success"
                  @click="review(workstream.id, true)"
                >
                  Approve Workstream
                </v-btn>

                <v-btn
                  color="warning"
                  variant="outlined"
                  :disabled="
                    !comments[workstream.id]?.trim()
                  "
                  @click="review(workstream.id, false)"
                >
                  Request Changes
                </v-btn>
              </div>
            </template>

            <!-- APPROVED STATUS -->

            <v-alert
              v-else-if="
                getWorkstreamReview(
                  submission,
                  workstream.id
                ).status === 'APPROVED'
              "
              type="success"
              variant="tonal"
            >
              This workstream has been approved by HR.
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- =================================
             FINAL ONBOARDING APPROVAL
        ================================== -->

        <v-divider class="my-5" />

        <h3 class="text-subtitle-1 mb-3">
          Final Onboarding Approval
        </h3>

        <!-- ALREADY APPROVED -->

        <v-alert
          v-if="isFinalApproved"
          type="success"
          variant="tonal"
        >
          Final onboarding approved by
          {{ submission.finalApproval?.approvedBy }}
          on
          {{
            formatDate(
              submission.finalApproval?.approvedAt
            )
          }}.
        </v-alert>

        <!-- AWAITING FINAL APPROVAL -->

        <template v-else>
          <v-alert
            :type="readyForFinal ? 'success' : 'info'"
            variant="tonal"
            class="mb-4"
          >
            {{
              readyForFinal
                ? "HR Induction and all assigned workstreams have been approved. Final onboarding approval is now available."
                : "HR Induction and every assigned workstream must be approved before final onboarding approval."
            }}
          </v-alert>

          <v-btn
            color="primary"
            :disabled="!readyForFinal"
            @click="finalApprove"
          >
            Approve Final Onboarding
          </v-btn>
        </template>
      </template>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.review-signature {
  display: block;
  max-width: 250px;
  max-height: 90px;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-top: 6px;
}
</style>
