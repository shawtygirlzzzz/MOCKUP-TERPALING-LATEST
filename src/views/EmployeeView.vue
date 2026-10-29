
<script setup lang="ts">
import { computed, ref } from "vue";
import { useOnboardingStore } from "../stores/onboarding";
import UndertakingForm from "../components/UndertakingForm.vue";
import DynamicFormRenderer from "../components/DynamicFormRenderer.vue";
import { getWorkstreamReview } from "../utils/onboardingApproval.ts";

const store = useOnboardingStore();

store.ensureEmployeeSubmission();

const started = ref(false);

const submission = computed(() => store.current);

const employeeName = computed(
  () => store.user?.name ?? "Employee"
);

const isCompleted = computed(
  () => submission.value?.status === "COMPLETED"
);

const isPending = computed(
  () => submission.value?.status === "PENDING_HR"
);

const isChangesRequested = computed(
  () => submission.value?.status === "CHANGES_REQUESTED"
);

const finalApproved = computed(
  () => submission.value?.finalApproval?.status === "COMPLETED"
);

const assignedWorkflow = computed(
  () => submission.value?.assignedWorkflow
);

const workstreams = computed(
  () => assignedWorkflow.value?.workstreams ?? []
);

const approvedWorkstreams = computed(() => {
  if (!submission.value) return 0;

  return workstreams.value.filter(
    workstream =>
      getWorkstreamReview(
        submission.value!,
        workstream.id
      ).status === "APPROVED"
  ).length;
});

const statusLabel = computed(() => {
  switch (submission.value?.status) {
    case "COMPLETED":
      return "Completed";
    case "PENDING_HR":
      return "Pending HR Verification";
    case "CHANGES_REQUESTED":
      return "Changes Requested";
    default:
      return "Not Completed";
  }
});

const acknowledgedCount = computed(
  () =>
    submission.value?.items.filter(
      item =>
        item.received &&
        Boolean(item.date) &&
        Boolean(item.signature.trim())
    ).length ?? 0
);

const totalTopics = computed(
  () => submission.value?.items.length ?? 0
);

const completedDocuments = computed(
  () =>
    submission.value?.documents.filter(
      doc =>
        doc.submitted &&
        Boolean(doc.fileName?.trim())
    ).length ?? 0
);

const totalDocuments = computed(
  () => submission.value?.documents.length ?? 0
);

const inductionProgress = computed(() => {
  if (isCompleted.value) return 100;

  const total = totalTopics.value + totalDocuments.value;

  if (!total) return 0;

  return Math.round(
    ((acknowledgedCount.value + completedDocuments.value) / total) * 100
  );
});

const overallProgress = computed(() => {
  const totalSteps = 1 + workstreams.value.length + 1;

  const completedSteps =
    (isCompleted.value ? 1 : 0) +
    approvedWorkstreams.value +
    (finalApproved.value ? 1 : 0);

  return Math.round((completedSteps / totalSteps) * 100);
});

function openInduction() {
  started.value = true;
}

function backToDashboard() {
  started.value = false;
}

function formatDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <v-container fluid class="employee-page pa-4 pa-md-6">
    <!-- FINAL APPROVAL -->
    <v-alert
      v-if="finalApproved"
      type="success"
      variant="tonal"
      rounded="lg"
      class="mb-5"
    >
      Your onboarding has been fully approved by HR.
      Final approval recorded on
      {{ formatDate(submission?.finalApproval?.approvedAt) }}.
    </v-alert>

    <!-- HR INDUCTION NOTIFICATIONS -->
    <v-alert
      v-else-if="isCompleted"
      type="success"
      variant="tonal"
      rounded="lg"
      class="mb-5"
    >
      HR has approved your induction.
      Continue with your assigned onboarding workstreams below.
    </v-alert>

    <v-alert
      v-else-if="isPending"
      type="info"
      variant="tonal"
      rounded="lg"
      class="mb-5"
    >
      Your HR Induction is awaiting HR verification.
    </v-alert>

    <v-alert
      v-else-if="isChangesRequested"
      type="warning"
      variant="tonal"
      rounded="lg"
      class="mb-5"
    >
      HR requested changes to your HR Induction submission.
    </v-alert>

    <!-- PAGE HEADER -->
    <div class="mb-5">
      <h1 class="text-h5 font-weight-bold">
        Hello, {{ employeeName }}
      </h1>

      <p class="text-body-2 text-medium-emphasis mt-1">
        Welcome to your Kotra Hub onboarding journey.
      </p>
    </div>

    <div class="induction-layout">
      <div class="induction-content">

        <!-- HR INDUCTION APPROVAL DETAILS -->
        <v-alert
          v-if="isCompleted"
          color="success"
          variant="tonal"
          rounded="lg"
          class="mb-5"
        >
          <div class="font-weight-bold">
            HR Induction Approved!
          </div>

          <div class="mt-1">
            Your HR Induction Acknowledgement Form
            was verified by {{ submission?.verifiedBy }}
            on {{ formatDate(submission?.verifiedAt) }}.
          </div>
        </v-alert>

        <!-- HR INDUCTION -->
        <v-card rounded="lg" elevation="1" class="mb-5">
          <v-card-title class="d-flex align-center ga-3 py-4 px-5">
            <v-avatar color="teal-lighten-5" size="38">
              <v-icon
                icon="mdi-clipboard-check-outline"
                color="primary"
              />
            </v-avatar>

            <span class="font-weight-bold">
              HR INDUCTION
            </span>
          </v-card-title>

          <v-divider />

          <v-card-text v-if="!started" class="pa-5">
            <h2 class="text-h6 mb-3">
              Get Started for Onboarding
            </h2>

            <p class="text-body-2 mb-4">
              Complete the 19 HR induction acknowledgement
              topics and submit the required employment
              documents for HR verification.
            </p>

            <v-chip
              :color="
                isCompleted
                  ? 'success'
                  : isPending
                    ? 'info'
                    : isChangesRequested
                      ? 'warning'
                      : 'grey'
              "
              variant="tonal"
              class="mb-4"
            >
              {{ statusLabel }}
            </v-chip>

            <div>
              <v-btn
                color="primary"
                prepend-icon="mdi-arrow-right"
                @click="openInduction"
              >
                {{
                  isCompleted
                    ? "View Completed HR Induction"
                    : isPending
                      ? "View Submitted HR Induction"
                      : isChangesRequested
                        ? "Update HR Induction"
                        : "Get Started"
                }}
              </v-btn>
            </div>
          </v-card-text>

          <v-card-text v-else class="pa-4 pa-md-5">
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              class="mb-4"
              @click="backToDashboard"
            >
              Back to Dashboard
            </v-btn>

            <UndertakingForm
              v-if="submission"
              :submission="submission"
              @save="store.save"
              @submit="store.submit"
            />

            <v-alert
              v-else
              type="warning"
              variant="tonal"
            >
              No onboarding record found.
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- ASSIGNED ONBOARDING WORKFLOW -->
        <v-card
          rounded="lg"
          elevation="1"
          class="mb-5"
        >
          <v-card-title class="d-flex align-center ga-3 py-4 px-5">
            <v-icon
              icon="mdi-sitemap-outline"
              color="primary"
            />

            <span class="font-weight-bold">
              ASSIGNED ONBOARDING WORKFLOW
            </span>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-5">
            <template v-if="assignedWorkflow && submission">
              <div class="d-flex align-center flex-wrap ga-2 mb-3">
                <h2 class="text-h6">
                  {{ assignedWorkflow.name }}
                </h2>

                <v-chip
                  color="primary"
                  variant="tonal"
                  size="small"
                >
                  Version {{ assignedWorkflow.version }}
                </v-chip>
              </div>

              <p class="text-body-2 text-medium-emphasis mb-4">
                {{ approvedWorkstreams }} of
                {{ workstreams.length }} workstreams approved.
              </p>

              <v-alert
                v-if="!isCompleted"
                type="info"
                variant="tonal"
                class="mb-4"
              >
                Your workflow has been assigned.
                Complete HR Induction before proceeding
                with these workstreams.
              </v-alert>

              <template v-else>
                <DynamicFormRenderer
                  v-for="workstream in workstreams"
                  :key="workstream.id"
                  :submission="submission"
                  :workstream="workstream"
                />
              </template>
            </template>

            <v-alert
              v-else
              type="info"
              variant="tonal"
            >
              No onboarding workflow has been assigned yet.
              HR will assign the appropriate published
              workflow based on your employment type
              and department.
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- OVERALL ONBOARDING PROGRESS -->
        <v-card rounded="lg" elevation="1" class="mb-5">
          <v-card-title class="d-flex align-center ga-3 py-4 px-5">
            <v-icon
              icon="mdi-format-list-checks"
              color="primary"
            />

            <span class="font-weight-bold">
              ONBOARDING PROGRESS
            </span>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-5">
            <div class="d-flex justify-space-between mb-2">
              <span class="text-body-2">
                HR Induction
              </span>
              <strong class="text-body-2">
                {{ statusLabel }}
              </strong>
            </div>

            <v-progress-linear
              :model-value="inductionProgress"
              color="primary"
              height="10"
              rounded
              class="mb-4"
            />

            <p class="text-caption text-medium-emphasis mb-5">
              {{ acknowledgedCount }} of {{ totalTopics }}
              induction topics acknowledged.
              {{ completedDocuments }} of {{ totalDocuments }}
              documents selected.
            </p>

            <div class="d-flex justify-space-between mb-2">
              <span class="text-body-2">
                Overall Onboarding
              </span>

              <strong class="text-body-2">
                {{ overallProgress }}%
              </strong>
            </div>

            <v-progress-linear
              :model-value="overallProgress"
              color="success"
              height="10"
              rounded
              class="mb-3"
            />

            <p class="text-caption text-medium-emphasis">
              Overall completion requires separate HR approval
              of HR Induction, every assigned workstream,
              and final onboarding approval.
            </p>
          </v-card-text>
        </v-card>

        <!-- RECENT ACTIVITY -->
        <v-card rounded="lg" elevation="1">
          <v-card-title class="d-flex align-center ga-3 py-4 px-5">
            <v-icon
              icon="mdi-clock-outline"
              color="primary"
            />

            <span class="font-weight-bold">
              RECENT ACTIVITY
            </span>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-5">
            <div
              v-if="submission?.verifiedAt"
              class="text-body-2 mb-3"
            >
              <v-icon
                icon="mdi-check-circle-outline"
                color="success"
                size="small"
                class="mr-2"
              />
              HR Induction reviewed on
              {{ formatDate(submission.verifiedAt) }}.
            </div>

            <div
              v-if="submission?.submittedAt"
              class="text-body-2 mb-3"
            >
              <v-icon
                icon="mdi-send-outline"
                color="primary"
                size="small"
                class="mr-2"
              />
              HR Induction submitted on
              {{ formatDate(submission.submittedAt) }}.
            </div>

            <div
              v-for="review in submission?.workstreamReviews ?? []"
              :key="review.workstreamId"
              class="text-body-2 mb-3"
            >
              <v-icon
                icon="mdi-clipboard-check-outline"
                color="primary"
                size="small"
                class="mr-2"
              />

              {{
                workstreams.find(
                  workstream => workstream.id === review.workstreamId
                )?.name ?? "Workstream"
              }}:
              {{ review.status.replaceAll("_", " ") }}
            </div>

            <div
              v-if="
                !submission?.submittedAt &&
                !submission?.verifiedAt &&
                !(submission?.workstreamReviews?.length)
              "
              class="text-body-2 text-medium-emphasis"
            >
              No recent activity.
              Start your HR Induction to begin.
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.employee-page {
  width: 100%;
  min-height: 100%;
}

.induction-layout {
  display: flex;
  justify-content: center;
  width: 100%;
}

.induction-content {
  width: 100%;
  max-width: 1200px;
  min-width: 0;
}

@media (max-width: 600px) {
  .employee-page {
    padding: 12px !important;
  }

  .induction-content {
    max-width: 100%;
  }
}
</style>
