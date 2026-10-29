
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Submission, DynamicFieldValue } from "../types";
import type { AssignedWorkstream } from "../utils/workflowResolver";
import { useOnboardingStore } from "../stores/onboarding";
import { getWorkstreamReview, isWorkstreamValid } from "../utils/onboardingApproval.ts";

const props = defineProps<{
  submission: Submission;
  workstream: AssignedWorkstream;
}>();

const store = useOnboardingStore();

const message = ref("");
const messageType = ref<"success" | "error">("success");

const review = computed(() =>
  getWorkstreamReview(props.submission, props.workstream.id)
);

const editable = computed(() =>
  ["DRAFT", "CHANGES_REQUESTED"].includes(review.value.status) &&
  props.submission.finalApproval?.status !== "COMPLETED"
);

const valid = computed(() =>
  isWorkstreamValid(props.submission, props.workstream)
);

const statusColor = computed(() => {
  switch (review.value.status) {
    case "APPROVED":
      return "success";
    case "PENDING_HR":
      return "info";
    case "CHANGES_REQUESTED":
      return "warning";
    default:
      return "grey";
  }
});

function getAnswer(formId: string, fieldId: string): DynamicFieldValue {
  const response = props.submission.dynamicResponses?.find(
    r =>
      r.workstreamId === props.workstream.id &&
      r.formId === formId
  );

  return response?.answers[fieldId] ?? null;
}

function updateAnswer(
  formId: string,
  fieldId: string,
  value: DynamicFieldValue
) {
  if (!editable.value) return;

  const success = store.saveDynamicAnswer(
    props.submission.employeeId,
    props.workstream.id,
    formId,
    fieldId,
    value
  );

  if (!success) {
    messageType.value = "error";
    message.value = "Unable to save this answer.";
  }
}

function handleFile(
  event: Event,
  formId: string,
  fieldId: string
) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    messageType.value = "error";
    message.value = "Maximum file size is 5 MB.";
    input.value = "";
    return;
  }

  // Frontend prototype: filename only.
  // Actual file bytes are not uploaded.
  updateAnswer(formId, fieldId, file.name);
}

function useRegisteredSignature(formId: string, fieldId: string) {
  const signature = props.submission.employeeSignature;

  if (!signature) {
    messageType.value = "error";
    message.value =
      "Please register your signature in HR Induction first.";
    return;
  }

  updateAnswer(formId, fieldId, signature);
}

function submit() {
  message.value = "";

  if (!valid.value) {
    messageType.value = "error";
    message.value = "Please complete all required fields before submitting.";
    return;
  }

  const success = store.submitWorkstream(
    props.submission.employeeId,
    props.workstream.id
  );

  messageType.value = success ? "success" : "error";
  message.value = success
    ? "Workstream submitted successfully. Awaiting HR review."
    : "Unable to submit this workstream.";
}
</script>

<template>
  <v-card rounded="lg" elevation="1" class="mb-5">
    <v-card-title class="d-flex align-center flex-wrap ga-3 pa-5">
      <v-icon icon="mdi-clipboard-text-outline" color="primary" />

      <span class="font-weight-bold">
        {{ workstream.name }}
      </span>

      <v-spacer />

      <v-chip :color="statusColor" variant="tonal" size="small">
        {{ review.status.replaceAll("_", " ") }}
      </v-chip>
    </v-card-title>

    <v-divider />

    <v-card-text class="pa-5">
      <p class="text-body-2 text-medium-emphasis mb-4">
        Responsible department: {{ workstream.responsibleDepartment }}
      </p>

      <v-alert
        v-if="message"
        :type="messageType"
        variant="tonal"
        class="mb-4"
      >
        {{ message }}
      </v-alert>

      <v-alert
        v-if="review.status === 'APPROVED'"
        type="success"
        variant="tonal"
        class="mb-4"
      >
        This workstream has been approved by HR.
      </v-alert>

      <v-alert
        v-else-if="review.status === 'PENDING_HR'"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        Submitted successfully. Waiting for HR approval.
      </v-alert>

      <v-alert
        v-else-if="review.status === 'CHANGES_REQUESTED'"
        type="warning"
        variant="tonal"
        class="mb-4"
      >
        HR requested changes.
        <div v-if="review.comment" class="mt-2">
          Remarks: {{ review.comment }}
        </div>
      </v-alert>

      <v-card
        v-for="form in workstream.forms"
        :key="form.id"
        variant="outlined"
        rounded="lg"
        class="mb-4"
      >
        <v-card-title class="text-subtitle-1 pa-4">
          {{ form.name }}
          <v-chip size="x-small" variant="tonal" class="ml-2">
            v{{ form.version }}
          </v-chip>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <div
            v-for="field in form.fields"
            :key="field.id"
            class="mb-5"
          >
            <div
              v-if="field.type !== 'CHECKBOX'"
              class="text-body-2 font-weight-medium mb-2"
            >
              {{ field.label }}
              <span v-if="field.required" class="text-error">*</span>
            </div>

            <!-- CHECKBOX -->
            <v-checkbox
              v-if="field.type === 'CHECKBOX'"
              :model-value="getAnswer(form.id, field.id) === true"
              :label="field.label + (field.required ? ' *' : '')"
              :disabled="!editable"
              color="primary"
              hide-details
              @update:model-value="
                value => updateAnswer(form.id, field.id, value === true)
              "
            />

            <!-- TEXT -->
            <v-text-field
              v-else-if="field.type === 'TEXT'"
              :model-value="String(getAnswer(form.id, field.id) ?? '')"
              :disabled="!editable"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="
                value => updateAnswer(form.id, field.id, String(value ?? ''))
              "
            />

            <!-- DATE -->
            <v-text-field
              v-else-if="field.type === 'DATE'"
              :model-value="String(getAnswer(form.id, field.id) ?? '')"
              type="date"
              :disabled="!editable"
              variant="outlined"
              hide-details
              @update:model-value="
                value => updateAnswer(form.id, field.id, String(value ?? ''))
              "
            />

            <!-- FILE -->
            <div v-else-if="field.type === 'FILE'">
              <v-file-input
  v-if="editable"
  label="Choose file (maximum 5 MB)"
  variant="outlined"
  prepend-icon="mdi-paperclip"
  hide-details
  @change="handleFile($event, form.id, field.id)"
/>

              <p class="text-body-2 mt-2">
                Selected:
                {{ getAnswer(form.id, field.id) || "No file selected" }}
              </p>

              <p class="text-caption text-medium-emphasis">
                Demo only: the filename is saved, not the actual file.
              </p>
            </div>

            <!-- SIGNATURE -->
            <div v-else-if="field.type === 'SIGNATURE'">
              <img
                v-if="
                  String(getAnswer(form.id, field.id) ?? '').startsWith(
                    'data:image/'
                  )
                "
                :src="String(getAnswer(form.id, field.id))"
                class="signature-preview mb-3"
                alt="Employee signature"
              />

              <p v-else class="text-body-2 mb-3">
                No signature provided.
              </p>

              <v-btn
                v-if="editable"
                color="primary"
                variant="outlined"
                prepend-icon="mdi-draw"
                :disabled="!submission.employeeSignature"
                @click="useRegisteredSignature(form.id, field.id)"
              >
                Use Registered Signature
              </v-btn>
            </div>

            <!-- UNSUPPORTED FIELD -->
            <v-alert
              v-else
              type="warning"
              variant="tonal"
              density="compact"
            >
              Unsupported field type: {{ field.type }}
            </v-alert>
          </div>
        </v-card-text>
      </v-card>

      <div v-if="editable" class="d-flex justify-end">
        <v-btn
          color="primary"
          prepend-icon="mdi-send-outline"
          :disabled="!valid"
          @click="submit"
        >
          Submit Workstream
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.signature-preview {
  display: block;
  max-width: 280px;
  max-height: 110px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
}
</style>
