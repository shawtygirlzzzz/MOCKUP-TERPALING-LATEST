
<script setup lang="ts">
import { computed, ref } from "vue";
import { useOnboardingStore } from "../stores/onboarding";
import PropertyChecklist from "../components/PropertyChecklist.vue";
import HRWorkflowReview from "../components/HRWorkflowReview.vue";

const store = useOnboardingStore();

const selected = ref<string | null>(null);
const comment = ref("");
const message = ref("");

const selectedSubmission = computed(() =>
  store.submissions.find(
    (s) => s.employeeId === selected.value
  )
);

const pendingWorkstreams = computed(() =>
  store.submissions.reduce((total, submission) => {
    return (
      total +
      (submission.workstreamReviews ?? []).filter(
        (review) => review.status === "PENDING_HR"
      ).length
    );
  }, 0)
);

const completedOnboarding = computed(() =>
  store.submissions.filter(
    (submission) =>
      submission.finalApproval?.status === "COMPLETED"
  ).length
);

const pendingActions = computed(
  () => store.pending.length + pendingWorkstreams.value
);

function review(approved: boolean) {
  if (
    !selected.value ||
    (!approved && !comment.value.trim())
  ) {
    return;
  }

  store.review(
    selected.value,
    approved,
    comment.value
  );

  message.value = approved
    ? "HR Induction approved successfully."
    : "Changes requested from employee.";

  selected.value = null;
  comment.value = "";
}

function formatDate(value?: string) {
  if (!value) return "Not dated";

  return new Date(value).toLocaleString("en-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div class="hub-banner mb-5 d-flex align-center ga-3">
    <v-icon color="primary">
      mdi-bell-ring-outline
    </v-icon>

    <span>
      {{ pendingActions }} HR verification action(s)
      require attention.
    </span>
  </div>

  <h1 class="hub-welcome">HR Dashboard</h1>

  <p class="hub-muted mb-5">
    Manage employee onboarding workflows,
    verify HR Induction submissions,
    review assigned workstreams and approve
    final onboarding completion.
  </p>

  <v-alert
    v-if="message"
    type="success"
    variant="tonal"
    closable
    class="mb-5"
    @click:close="message = ''"
  >
    {{ message }}
  </v-alert>

  <!-- DASHBOARD STATISTICS -->
  <v-row>
    <v-col cols="12" sm="6" lg="3">
      <v-card class="hub-panel pa-5">
        <div class="text-subtitle-1 hub-muted">
          PENDING ACTIONS
        </div>

        <div class="text-h3 font-weight-bold mt-2">
          {{ pendingActions }}
        </div>

        <p class="hub-muted">
          HR Induction and workstream reviews
        </p>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <v-card class="hub-panel pa-5">
        <div class="text-subtitle-1 hub-muted">
          HR INDUCTION APPROVED
        </div>

        <div class="text-h3 font-weight-bold mt-2">
          {{
            store.submissions.filter(
              (s) => s.status === "COMPLETED"
            ).length
          }}
        </div>

        <p class="hub-muted">
          Approved induction forms
        </p>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <v-card class="hub-panel pa-5">
        <div class="text-subtitle-1 hub-muted">
          ONBOARDING COMPLETED
        </div>

        <div class="text-h3 font-weight-bold mt-2">
          {{ completedOnboarding }}
        </div>

        <p class="hub-muted">
          Final HR approval recorded
        </p>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <v-card class="hub-panel pa-5">
        <div class="text-subtitle-1 hub-muted">
          TOTAL EMPLOYEES
        </div>

        <div class="text-h3 font-weight-bold mt-2">
          {{ store.submissions.length }}
        </div>

        <p class="hub-muted">
          Onboarding employee records
        </p>
      </v-card>
    </v-col>

    <!-- PENDING HR INDUCTION -->
    <v-col cols="12">
      <v-card class="hub-panel">
        <div class="hub-panel-heading">
          <span class="hub-icon">
            <v-icon>
              mdi-format-list-checks
            </v-icon>
          </span>

          PENDING HR INDUCTION VERIFICATION
        </div>

        <v-list v-if="store.pending.length">
          <v-list-item
            v-for="s in store.pending"
            :key="s.employeeId"
            :title="s.employeeName"
            :subtitle="
              `${s.employeeId} · Submitted ${formatDate(s.submittedAt)}`
            "
          >
            <template #append>
              <v-btn
                color="primary"
                variant="tonal"
                @click="selected = s.employeeId"
              >
                Review Checklist
              </v-btn>
            </template>
          </v-list-item>
        </v-list>

        <v-card-text v-else>
          No pending HR Induction requests.
        </v-card-text>
      </v-card>
    </v-col>

    <!-- HR INDUCTION REVIEW -->
    <v-col
      v-if="selectedSubmission"
      cols="12"
    >
      <v-card class="hub-panel">
        <div class="hub-panel-heading">
          <span class="hub-icon">
            <v-icon>
              mdi-account-check-outline
            </v-icon>
          </span>

          VERIFY {{ selectedSubmission.employeeName }}
        </div>

        <v-card-text>
          <PropertyChecklist
            :items="selectedSubmission.items"
            :signature="
              selectedSubmission.employeeSignature || ''
            "
            readonly
          />

          <v-divider class="my-4" />

          <h3 class="text-subtitle-1 mb-3">
            Required Documents
          </h3>

          <v-list density="compact">
            <v-list-item
              v-for="doc in selectedSubmission.documents"
              :key="doc.id"
              :title="doc.label"
              :subtitle="
                doc.fileName || 'Not selected'
              "
            >
              <template #append>
                <v-chip
                  :color="
                    doc.submitted
                      ? 'success'
                      : 'warning'
                  "
                  size="small"
                  variant="tonal"
                >
                  {{
                    doc.submitted
                      ? "Selected"
                      : "Missing"
                  }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <v-textarea
            v-model="comment"
            class="mt-4"
            label="HR remarks (required for changes requested)"
            rows="2"
            variant="outlined"
          />

          <v-alert
            type="warning"
            variant="tonal"
          >
            Verify actual induction attendance and
            employee acknowledgements before approving.
            Checklist completion alone does not prove
            physical attendance. In this frontend demo,
            document filenames are not actual uploaded files.
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-btn
            variant="text"
            @click="
              selected = null;
              comment = '';
            "
          >
            Cancel
          </v-btn>

          <v-spacer />

          <v-btn
            color="warning"
            variant="outlined"
            :disabled="!comment.trim()"
            @click="review(false)"
          >
            Request Changes
          </v-btn>

          <v-btn
            color="primary"
            @click="review(true)"
          >
            Verify & Approve HR Induction
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>

    <!-- WORKFLOW ASSIGNMENT AND REVIEWS -->
    <v-col cols="12">
      <v-card class="hub-panel">
        <div class="hub-panel-heading">
          <span class="hub-icon">
            <v-icon>
              mdi-sitemap-outline
            </v-icon>
          </span>

          EMPLOYEE WORKFLOW MANAGEMENT
        </div>

        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Assign a published workflow based on the
            employee's employment type and department.
            Review each workstream separately.
            Final onboarding completion requires
            explicit HR approval.
          </p>

          <HRWorkflowReview
            v-for="submission in store.submissions"
            :key="submission.employeeId"
            :submission="submission"
          />
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
