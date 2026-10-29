
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Submission } from "../types";
import PropertyChecklist from "./PropertyChecklist.vue";
import SignaturePad from "./SignaturePad.vue";

const props = defineProps<{
  submission: Submission;
}>();

const emit = defineEmits<{
  save: [submission: Submission];
  submit: [submission: Submission];
}>();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
];

function cloneSubmission(s: Submission): Submission {
  return {
    ...s,
    items: (s.items ?? []).map((item) => ({
      ...item,
    })),
    documents: (s.documents ?? []).map((doc) => ({
      ...doc,
    })),
  };
}

const draft = ref<Submission>(
  cloneSubmission(props.submission)
);

const fileErrors = ref<Record<string, string>>({});
const selectedFiles = ref<Record<string, File>>({});
const fileInputKeys = ref<Record<string, number>>({});

watch(
  () => props.submission,
  (value) => {
    draft.value = cloneSubmission(value);
  },
  { deep: true }
);

const locked = computed(() =>
  ["PENDING_HR", "COMPLETED"].includes(
    draft.value.status
  )
);

const hasSignature = computed(
  () => Boolean(draft.value.employeeSignature)
);

const employmentTypeLabel = computed(() => {
  const labels = {
    INTERN: "Intern",
    PERMANENT: "Permanent",
    CONTRACT: "Contract",
  };

  return labels[draft.value.employmentType];
});

const acknowledgedCount = computed(() =>
  draft.value.items.filter(
    (item) =>
      item.received &&
      Boolean(item.date) &&
      Boolean(item.signature)
  ).length
);

const inductionValid = computed(
  () =>
    draft.value.items.length === 19 &&
    draft.value.items.every(
      (item) =>
        !item.required ||
        (
          item.received &&
          Boolean(item.date) &&
          Boolean(item.signature)
        )
    )
);

const documentsValid = computed(() =>
  draft.value.documents.every(
    (doc) =>
      !doc.required ||
      (
        doc.submitted &&
        Boolean(doc.fileName?.trim()) &&
        !fileErrors.value[doc.id]
      )
  )
);

const valid = computed(
  () =>
    hasSignature.value &&
    inductionValid.value &&
    documentsValid.value &&
    Object.values(fileErrors.value).every(
      (error) => !error
    )
);

function saveEmployeeSignature(signature: string) {
  if (locked.value) return;

  draft.value.employeeSignature = signature;
}

function resetEmployeeSignature() {
  if (locked.value) return;

  draft.value.employeeSignature = "";

  // Clear all previous acknowledgments because
  // their signatures would no longer match.
  draft.value.items = draft.value.items.map(
    (item) => ({
      ...item,
      received: false,
      date: "",
      signature: "",
    })
  );
}

function handleFileChange(
  documentId: string,
  value: File | File[] | null
) {
  if (locked.value) return;

  const file = Array.isArray(value)
    ? value[0]
    : value;

  const document = draft.value.documents.find(
    (doc) => doc.id === documentId
  );

  if (!document) return;

  delete fileErrors.value[documentId];

  if (!file) {
    delete selectedFiles.value[documentId];
    document.fileName = "";
    document.submitted = false;
    return;
  }

  const extension =
    file.name.split(".").pop()?.toLowerCase() ?? "";

  let error = "";

  if (file.size > MAX_FILE_SIZE) {
    error = "File size must not exceed 5 MB.";
  } else if (
    !ALLOWED_EXTENSIONS.includes(extension)
  ) {
    error =
      "Only PDF, JPG, JPEG and PNG files are allowed.";
  }

  if (error) {
    fileErrors.value[documentId] = error;

    delete selectedFiles.value[documentId];

    document.fileName = "";
    document.submitted = false;

    fileInputKeys.value[documentId] =
      (fileInputKeys.value[documentId] ?? 0) + 1;

    return;
  }

  selectedFiles.value[documentId] = file;
  document.fileName = file.name;
  document.submitted = true;
}

function saveDraft() {
  if (locked.value) return;

  emit("save", cloneSubmission(draft.value));
}

function submitToHR() {
  if (locked.value || !valid.value) return;

  emit("submit", cloneSubmission(draft.value));
}
</script>

<template>
  <v-card rounded="lg" elevation="1">
    <v-card-title class="pt-4 px-4">
      HR Induction
    </v-card-title>

    <v-card-subtitle>
      Complete your HR Induction Acknowledgement
      Form and required documents.
    </v-card-subtitle>

    <v-card-text>
      <!-- STATUS -->
      <v-alert
        v-if="draft.status === 'PENDING_HR'"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        Submitted — waiting for HR verification.
      </v-alert>

      <v-alert
        v-else-if="draft.status === 'COMPLETED'"
        type="success"
        variant="tonal"
        class="mb-4"
      >
        Your HR Induction has been approved by HR.
      </v-alert>

      <v-alert
        v-else-if="draft.status === 'CHANGES_REQUESTED'"
        type="warning"
        variant="tonal"
        class="mb-4"
      >
        HR requested changes: {{ draft.comment }}
      </v-alert>

      <!-- EMPLOYEE INFO -->
      <v-row class="mt-2 mb-3">
        <v-col cols="12" md="6">
          <v-text-field
            label="Employment Type"
            :model-value="employmentTypeLabel"
            readonly
            variant="outlined"
            hide-details
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            label="Department"
            :model-value="draft.department"
            readonly
            variant="outlined"
            hide-details
          />
        </v-col>
      </v-row>

      <!-- SIGNATURE REGISTRATION -->
      <v-card
        variant="outlined"
        rounded="lg"
        class="mb-5"
      >
        <v-card-title class="text-subtitle-1">
          Employee Signature Registration
        </v-card-title>

        <v-card-text>
          <SignaturePad
            v-if="!hasSignature && !locked"
            @save="saveEmployeeSignature"
          />

          <template v-else-if="hasSignature">
            <v-alert
              type="success"
              variant="tonal"
              density="compact"
              class="mb-3"
            >
              Your electronic signature is registered.
              It will be applied automatically when
              you acknowledge an induction topic.
            </v-alert>

            <div class="saved-signature">
              <img
                :src="draft.employeeSignature"
                alt="Saved employee signature"
              />
            </div>

            <v-btn
              v-if="!locked"
              variant="outlined"
              color="warning"
              class="mt-3"
              @click="resetEmployeeSignature"
            >
              Change Signature
            </v-btn>
          </template>

          <v-alert
            v-else
            type="warning"
            variant="tonal"
          >
            No electronic signature is available.
          </v-alert>
        </v-card-text>
      </v-card>

      <!-- SECTION A -->
      <v-card
        variant="outlined"
        rounded="lg"
        class="mb-5"
      >
        <v-card-title class="text-subtitle-1">
          Section A — HR Induction Acknowledgement Form
        </v-card-title>

        <v-card-subtitle>
          Acknowledge all 19 HR induction topics
        </v-card-subtitle>

        <v-card-text>
          <v-alert
            v-if="!hasSignature && !locked"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Please register your electronic signature
            before ticking the induction topics.
          </v-alert>

          <div
            class="d-flex justify-space-between
                   text-body-2 mb-2"
          >
            <span>Topics completed</span>

            <strong>
              {{ acknowledgedCount }} /
              {{ draft.items.length }}
            </strong>
          </div>

          <v-progress-linear
            :model-value="
              draft.items.length
                ? (acknowledgedCount /
                    draft.items.length) * 100
                : 0
            "
            color="primary"
            rounded
            height="7"
            class="mb-4"
          />

          <PropertyChecklist
            :items="draft.items"
            :signature="draft.employeeSignature || ''"
            :readonly="locked"
            @change="draft.items = $event"
          />

          <p class="text-caption mt-4">
            Your acknowledgment date and registered
            electronic signature are automatically
            applied when you tick a topic.
          </p>
        </v-card-text>
      </v-card>

      <!-- SECTION B -->
      <v-card variant="outlined" rounded="lg">
        <v-card-title class="text-subtitle-1">
          Section B — Required Documents
        </v-card-title>

        <v-card-subtitle>
          Documents for {{ employmentTypeLabel }}
        </v-card-subtitle>

        <v-card-text>
          <v-row
            v-for="doc in draft.documents"
            :key="doc.id"
            class="align-center mb-3"
          >
            <v-col cols="12" md="5">
              <div class="font-weight-medium">
                {{ doc.label }}
              </div>

              <v-chip
                :color="
                  doc.required ? 'success' : 'grey'
                "
                size="x-small"
                variant="tonal"
                class="mt-1"
              >
                {{
                  doc.required
                    ? "Required"
                    : "Optional"
                }}
              </v-chip>
            </v-col>

            <v-col cols="12" md="7">
              <v-file-input
                v-if="!locked"
                :key="
                  `${doc.id}-${
                    fileInputKeys[doc.id] ?? 0
                  }`
                "
                label="Upload document"
                accept=".pdf,.jpg,.jpeg,.png"
                variant="outlined"
                density="comfortable"
                prepend-icon=""
                prepend-inner-icon="mdi-cloud-upload-outline"
                show-size
                clearable
                :error-messages="
                  fileErrors[doc.id]
                    ? [fileErrors[doc.id]]
                    : []
                "
                hint="PDF, JPG, JPEG or PNG — Maximum 5 MB"
                persistent-hint
                @update:model-value="
                  handleFileChange(doc.id, $event)
                "
              />

              <v-text-field
                v-else
                :model-value="
                  doc.fileName || 'Not submitted'
                "
                label="Submitted document"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-file-check-outline"
              />

              <div
                v-if="
                  !locked &&
                  doc.fileName &&
                  !fileErrors[doc.id]
                "
                class="text-caption text-success mt-1"
              >
                <v-icon
                  icon="mdi-check-circle"
                  size="small"
                />
                {{ doc.fileName }} selected
              </div>
            </v-col>
          </v-row>

          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            Frontend demo: only filenames are saved.
            Actual files are not uploaded or stored.
            Maximum file size is 5 MB.
          </v-alert>
        </v-card-text>
      </v-card>

      <!-- VALIDATION -->
      <v-alert
        v-if="!locked && !valid"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        Register your electronic signature,
        acknowledge all 19 induction topics,
        and select every required document
        before submitting to HR.
      </v-alert>
    </v-card-text>

    <v-card-actions
      v-if="!locked"
      class="pa-4"
    >
      <v-spacer />

      <v-btn
        variant="outlined"
        @click="saveDraft"
      >
        Save Draft
      </v-btn>

      <v-btn
        color="primary"
        :disabled="!valid"
        @click="submitToHR"
      >
        Submit to HR
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.saved-signature {
  width: 100%;
  max-width: 350px;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.saved-signature img {
  max-width: 100%;
  max-height: 85px;
  object-fit: contain;
}
</style>
