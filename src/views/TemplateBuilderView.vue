
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useTemplateBuilderStore } from "../stores/templateBuilder";
import { useOnboardingStore } from "../stores/onboarding";

import type {
  EmploymentType,
  Department,
} from "../types";

import type {
  WorkflowTemplate,
  WorkstreamTemplate,
  FormTemplate,
  FormField,
  FormFieldType,
} from "../types/templateBuilder";

// ==========================================
// 1. STORES
// ==========================================

const store = useTemplateBuilderStore();
const onboarding = useOnboardingStore();

// ==========================================
// 2. TYPES
// ==========================================

type Tab = "WORKFLOW" | "WORKSTREAM" | "FORM";

type TemplateItem =
  | WorkflowTemplate
  | WorkstreamTemplate
  | FormTemplate;

// ==========================================
// 3. STATE
// ==========================================

const tab = ref<Tab>("WORKFLOW");
const selectedId = ref<string | null>(null);

const message = ref("");
const messageType = ref<"success" | "error">("success");

const workflowDraft = ref<WorkflowTemplate | null>(null);
const workstreamDraft = ref<WorkstreamTemplate | null>(null);
const formDraft = ref<FormTemplate | null>(null);

const employmentTypes: EmploymentType[] = [
  "INTERN",
  "PERMANENT",
  "CONTRACT",
];

const departments: Department[] = [
  "QA",
  "QC",
  "PRODUCTION",
  "HR",
  "IT",
];

const fieldTypes: FormFieldType[] = [
  "CHECKBOX",
  "TEXT",
  "DATE",
  "SIGNATURE",
  "FILE",
];

// ==========================================
// 4. COMPUTED PROPERTIES
// ==========================================

const isHR = computed<boolean>(
  () => onboarding.user?.role === "HR"
);

const items = computed<TemplateItem[]>(() => {
  if (tab.value === "WORKFLOW") {
    return store.workflows;
  }

  if (tab.value === "WORKSTREAM") {
    return store.workstreams;
  }

  return store.forms;
});

const selected = computed<TemplateItem | undefined>(
  () =>
    items.value.find(
      (item: TemplateItem) =>
        item.id === selectedId.value
    )
);

const publishedCount = computed<number>(() =>
  items.value.filter(
    (item: TemplateItem) =>
      item.status === "PUBLISHED"
  ).length
);

const draftCount = computed<number>(() =>
  items.value.filter(
    (item: TemplateItem) =>
      item.status === "DRAFT"
  ).length
);

// ==========================================
// 5. WATCHERS
// ==========================================

watch(tab, () => {
  clearSelection();
  message.value = "";
});

// ==========================================
// 6. HELPER FUNCTIONS
// ==========================================

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clearSelection(): void {
  selectedId.value = null;
  workflowDraft.value = null;
  workstreamDraft.value = null;
  formDraft.value = null;
}

function showMessage(
  text: string,
  type: "success" | "error" = "success"
): void {
  message.value = text;
  messageType.value = type;
}

function toggleString<T extends string>(
  values: T[],
  value: T
): T[] {
  return values.includes(value)
    ? values.filter((item: T) => item !== value)
    : [...values, value];
}

// ==========================================
// 7. SELECT TEMPLATE
// ==========================================

function selectItem(id: string): void {
  selectedId.value = id;
  message.value = "";

  workflowDraft.value = null;
  workstreamDraft.value = null;
  formDraft.value = null;

  if (tab.value === "WORKFLOW") {
    const item = store.workflows.find(
      (w: WorkflowTemplate) => w.id === id
    );

    if (item) {
      workflowDraft.value = clone(item);
    }
  }

  if (tab.value === "WORKSTREAM") {
    const item = store.workstreams.find(
      (w: WorkstreamTemplate) => w.id === id
    );

    if (item) {
      workstreamDraft.value = clone(item);
    }
  }

  if (tab.value === "FORM") {
    const item = store.forms.find(
      (f: FormTemplate) => f.id === id
    );

    if (item) {
      formDraft.value = clone(item);
    }
  }
}

// ==========================================
// 8. CREATE NEW TEMPLATE
// ==========================================

function createNew(): void {
  if (!isHR.value) return;

  let id: string;

  if (tab.value === "WORKFLOW") {
    id = store.createWorkflow();
  } else if (tab.value === "WORKSTREAM") {
    id = store.createWorkstream();
  } else {
    id = store.createForm();
  }

  selectItem(id);
}

// ==========================================
// 9. SAVE TEMPLATE
// ==========================================

function saveDraft(): boolean {
  if (!isHR.value) return false;

  if (
    tab.value === "WORKFLOW" &&
    workflowDraft.value
  ) {
    if (!workflowDraft.value.name.trim()) {
      showMessage(
        "Workflow name is required.",
        "error"
      );
      return false;
    }

    store.updateWorkflow(
      clone(workflowDraft.value)
    );
  } else if (
    tab.value === "WORKSTREAM" &&
    workstreamDraft.value
  ) {
    if (!workstreamDraft.value.name.trim()) {
      showMessage(
        "Workstream name is required.",
        "error"
      );
      return false;
    }

    store.updateWorkstream(
      clone(workstreamDraft.value)
    );
  } else if (
    tab.value === "FORM" &&
    formDraft.value
  ) {
    if (!formDraft.value.name.trim()) {
      showMessage(
        "Form name is required.",
        "error"
      );
      return false;
    }

    store.updateForm(
      clone(formDraft.value)
    );
  } else {
    return false;
  }

  if (selectedId.value) {
    selectItem(selectedId.value);
  }

  showMessage("Draft saved successfully.");

  return true;
}

// ==========================================
// 10. PUBLISH TEMPLATE
// ==========================================

function publishTemplate(): void {
  if (!isHR.value || !selectedId.value) {
    return;
  }

  const saved = saveDraft();

  if (!saved) return;

  let success = false;

  if (tab.value === "WORKFLOW") {
    success = store.publishWorkflow(
      selectedId.value
    );
  } else if (tab.value === "WORKSTREAM") {
    success = store.publishWorkstream(
      selectedId.value
    );
  } else {
    success = store.publishForm(
      selectedId.value
    );
  }

  if (success) {
    selectItem(selectedId.value);

    showMessage(
      "Template published successfully."
    );
  } else {
    showMessage(
      "Unable to publish. Check the template name, linked forms, and workstreams. Linked templates must be published first.",
      "error"
    );
  }
}

// ==========================================
// 11. DELETE TEMPLATE
// ==========================================

function deleteTemplate(): void {
  if (!isHR.value || !selectedId.value) {
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to delete this template? Existing published workflow snapshots will be retained."
  );

  if (!confirmed) return;

  if (tab.value === "WORKFLOW") {
    store.deleteWorkflow(selectedId.value);
  } else if (tab.value === "WORKSTREAM") {
    store.deleteWorkstream(selectedId.value);
  } else {
    store.deleteForm(selectedId.value);
  }

  clearSelection();

  showMessage(
    "Template deleted successfully."
  );
}

// ==========================================
// 12. WORKFLOW CONFIGURATION
// ==========================================

function toggleEmploymentType(
  type: EmploymentType
): void {
  if (!workflowDraft.value) return;

  workflowDraft.value.employmentTypes =
    toggleString(
      workflowDraft.value.employmentTypes,
      type
    );
}

function toggleDepartment(
  department: Department
): void {
  if (!workflowDraft.value) return;

  workflowDraft.value.departments =
    toggleString(
      workflowDraft.value.departments,
      department
    );
}

function toggleWorkstream(
  id: string
): void {
  if (!workflowDraft.value) return;

  workflowDraft.value.workstreamIds =
    toggleString(
      workflowDraft.value.workstreamIds,
      id
    );
}

function moveWorkstream(
  id: string,
  direction: number
): void {
  if (!workflowDraft.value) return;

  const ids = workflowDraft.value.workstreamIds;
  const index = ids.indexOf(id);
  const next = index + direction;

  if (
    index < 0 ||
    next < 0 ||
    next >= ids.length
  ) {
    return;
  }

  const [moved] = ids.splice(index, 1);
  ids.splice(next, 0, moved);
}

function workstreamName(
  id: string
): string {
  return (
    store.workstreams.find(
      (w: WorkstreamTemplate) =>
        w.id === id
    )?.name ?? "Unknown Workstream"
  );
}

// ==========================================
// 13. WORKSTREAM CONFIGURATION
// ==========================================

function toggleForm(id: string): void {
  if (!workstreamDraft.value) return;

  workstreamDraft.value.formIds =
    toggleString(
      workstreamDraft.value.formIds,
      id
    );
}

// ==========================================
// 14. FORM BUILDER
// ==========================================

function addField(): void {
  if (!formDraft.value) return;

  const field: FormField = {
    id: crypto.randomUUID(),
    label: "New Field",
    type: "CHECKBOX",
    required: true,
    employmentTypes: [
      ...employmentTypes
    ],
    departments: [
      ...departments
    ],
  };

  formDraft.value.fields.push(field);
}

function removeField(index: number): void {
  if (!formDraft.value) return;

  formDraft.value.fields.splice(
    index,
    1
  );
}

function moveField(
  index: number,
  direction: number
): void {
  if (!formDraft.value) return;

  const fields = formDraft.value.fields;
  const next = index + direction;

  if (
    next < 0 ||
    next >= fields.length
  ) {
    return;
  }

  const [field] = fields.splice(index, 1);
  fields.splice(next, 0, field);
}

function toggleFieldEmploymentType(
  field: FormField,
  type: EmploymentType
): void {
  field.employmentTypes =
    toggleString(
      field.employmentTypes,
      type
    );
}

function toggleFieldDepartment(
  field: FormField,
  department: Department
): void {
  field.departments =
    toggleString(
      field.departments,
      department
    );
}
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- PAGE HEADER -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
      <div>
        <h2 class="text-h5 font-weight-bold">
          Template Builder
        </h2>

        <p class="text-body-2 text-medium-emphasis">
          Create and manage onboarding workflows,
          workstreams, and forms.
        </p>
      </div>

      <v-chip
        color="primary"
        variant="tonal"
        prepend-icon="mdi-shield-account"
      >
        HR Management
      </v-chip>
    </div>

    <!-- ACCESS CONTROL -->
    <v-alert
      v-if="!isHR"
      type="error"
      variant="tonal"
    >
      Only HR users can access the Template Builder.
    </v-alert>

    <template v-else>
      <!-- FEEDBACK MESSAGE -->
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

      <!-- STATISTICS -->
      <v-row class="mb-3">
        <v-col cols="12" sm="4">
          <v-card rounded="lg" elevation="1">
            <v-card-text>
              <div class="text-caption text-medium-emphasis">
                Total Templates
              </div>

              <div class="text-h4 font-weight-bold">
                {{ items.length }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="4">
          <v-card rounded="lg" elevation="1">
            <v-card-text>
              <div class="text-caption text-medium-emphasis">
                Published
              </div>

              <div class="text-h4 font-weight-bold text-success">
                {{ publishedCount }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="4">
          <v-card rounded="lg" elevation="1">
            <v-card-text>
              <div class="text-caption text-medium-emphasis">
                Drafts
              </div>

              <div class="text-h4 font-weight-bold">
                {{ draftCount }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- MAIN BUILDER -->
      <v-card rounded="lg" elevation="1">
        <v-tabs
          v-model="tab"
          color="primary"
          show-arrows
        >
          <v-tab value="WORKFLOW">
            <v-icon
              start
              icon="mdi-sitemap"
            />
            Workflow Templates
          </v-tab>

          <v-tab value="WORKSTREAM">
            <v-icon
              start
              icon="mdi-format-list-checks"
            />
            Workstream Templates
          </v-tab>

          <v-tab value="FORM">
            <v-icon
              start
              icon="mdi-form-select"
            />
            Form Builder
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text>
          <v-row>
            <!-- LEFT: TEMPLATE LIST -->
            <v-col cols="12" md="4">
              <div class="d-flex align-center justify-space-between mb-3">
                <h3 class="text-subtitle-1 font-weight-bold">
                  Templates
                </h3>

                <v-btn
                  color="primary"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="createNew"
                >
                  New
                </v-btn>
              </div>

              <v-list
                class="border rounded-lg"
                bg-color="surface"
              >
                <v-list-item
                  v-for="item in items"
                  :key="item.id"
                  :active="selectedId === item.id"
                  color="primary"
                  @click="selectItem(item.id)"
                >
                  <v-list-item-title>
                    {{ item.name }}
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    Version {{ item.version }}
                  </v-list-item-subtitle>

                  <template #append>
                    <v-chip
                      :color="
                        item.status === 'PUBLISHED'
                          ? 'success'
                          : 'warning'
                      "
                      size="x-small"
                    >
                      {{ item.status }}
                    </v-chip>
                  </template>
                </v-list-item>

                <v-list-item v-if="items.length === 0">
                  <v-list-item-title>
                    No templates created
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-col>

            <!-- RIGHT: TEMPLATE EDITOR -->
            <v-col cols="12" md="8">
              <!-- NO SELECTION -->
              <v-sheet
                v-if="!selected"
                class="border rounded-lg pa-8 text-center"
              >
                <v-icon
                  icon="mdi-file-document-edit-outline"
                  size="48"
                  color="grey"
                  class="mb-3"
                />

                <h3 class="mb-2">
                  Select a Template
                </h3>

                <p class="text-body-2 text-medium-emphasis">
                  Choose an existing template or click
                  New to create one.
                </p>
              </v-sheet>

              <!-- EDITOR CARD -->
              <v-card
                v-else
                variant="outlined"
                rounded="lg"
              >
                <v-card-title class="d-flex align-center justify-space-between">
                  <span>
                    Edit Template
                  </span>

                  <v-chip
                    :color="
                      selected.status === 'PUBLISHED'
                        ? 'success'
                        : 'warning'
                    "
                    size="small"
                  >
                    {{ selected.status }}
                  </v-chip>
                </v-card-title>

                <v-divider />

                <v-card-text class="pt-5">
                  <!-- ====================== -->
                  <!-- WORKFLOW TEMPLATE -->
                  <!-- ====================== -->
                  <template
                    v-if="
                      tab === 'WORKFLOW' &&
                      workflowDraft
                    "
                  >
                    <v-text-field
                      v-model="workflowDraft.name"
                      label="Workflow Name"
                      variant="outlined"
                      class="mb-3"
                    />

                    <v-textarea
                      v-model="workflowDraft.description"
                      label="Description"
                      variant="outlined"
                      rows="2"
                    />

                    <h4 class="text-subtitle-1 font-weight-bold mb-2">
                      Applicable Employment Types
                    </h4>

                    <div class="d-flex flex-wrap ga-3 mb-5">
                      <v-checkbox
                        v-for="type in employmentTypes"
                        :key="type"
                        :model-value="
                          workflowDraft.employmentTypes.includes(
                            type
                          )
                        "
                        :label="type"
                        density="compact"
                        hide-details
                        color="primary"
                        @update:model-value="
                          toggleEmploymentType(type)
                        "
                      />
                    </div>

                    <h4 class="text-subtitle-1 font-weight-bold mb-2">
                      Applicable Departments
                    </h4>

                    <div class="d-flex flex-wrap ga-3 mb-5">
                      <v-checkbox
                        v-for="department in departments"
                        :key="department"
                        :model-value="
                          workflowDraft.departments.includes(
                            department
                          )
                        "
                        :label="department"
                        density="compact"
                        hide-details
                        color="primary"
                        @update:model-value="
                          toggleDepartment(department)
                        "
                      />
                    </div>

                    <h4 class="text-subtitle-1 font-weight-bold mb-2">
                      Available Workstreams
                    </h4>

                    <v-alert
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mb-3"
                    >
                      Select the workstreams to include
                      in this onboarding workflow.
                    </v-alert>

                    <v-list class="border rounded-lg mb-5">
                      <v-list-item
                        v-for="ws in store.workstreams"
                        :key="ws.id"
                      >
                        <template #prepend>
                          <v-checkbox-btn
                            :model-value="
                              workflowDraft.workstreamIds.includes(
                                ws.id
                              )
                            "
                            color="primary"
                            @update:model-value="
                              toggleWorkstream(ws.id)
                            "
                          />
                        </template>

                        <v-list-item-title>
                          {{ ws.name }}
                        </v-list-item-title>

                        <v-list-item-subtitle>
                          Responsible:
                          {{ ws.responsibleDepartment }}
                          • {{ ws.status }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>

                    <h4 class="text-subtitle-1 font-weight-bold mb-2">
                      Selected Workstream Order
                    </h4>

                    <v-list
                      v-if="workflowDraft.workstreamIds.length"
                      class="border rounded-lg"
                    >
                      <v-list-item
                        v-for="(wsId, index) in workflowDraft.workstreamIds"
                        :key="wsId"
                      >
                        <template #prepend>
                          <v-avatar
                            color="primary"
                            size="28"
                          >
                            <span class="text-white text-caption">
                              {{ index + 1 }}
                            </span>
                          </v-avatar>
                        </template>

                        <v-list-item-title>
                          {{ workstreamName(wsId) }}
                        </v-list-item-title>

                        <template #append>
                          <v-btn
                            icon="mdi-arrow-up"
                            variant="text"
                            size="small"
                            :disabled="index === 0"
                            @click="moveWorkstream(wsId, -1)"
                          />

                          <v-btn
                            icon="mdi-arrow-down"
                            variant="text"
                            size="small"
                            :disabled="
                              index ===
                              workflowDraft.workstreamIds.length - 1
                            "
                            @click="moveWorkstream(wsId, 1)"
                          />
                        </template>
                      </v-list-item>
                    </v-list>

                    <v-alert
                      v-else
                      type="warning"
                      variant="tonal"
                    >
                      No workstreams selected.
                    </v-alert>
                  </template>

                  <!-- ====================== -->
                  <!-- WORKSTREAM TEMPLATE -->
                  <!-- ====================== -->
                  <template
                    v-else-if="
                      tab === 'WORKSTREAM' &&
                      workstreamDraft
                    "
                  >
                    <v-text-field
                      v-model="workstreamDraft.name"
                      label="Workstream Name"
                      variant="outlined"
                      class="mb-3"
                    />

                    <v-textarea
                      v-model="workstreamDraft.description"
                      label="Description"
                      variant="outlined"
                      rows="2"
                    />

                    <v-select
                      v-model="workstreamDraft.responsibleDepartment"
                      :items="departments"
                      label="Responsible Department"
                      variant="outlined"
                    />

                    <v-switch
                      v-model="workstreamDraft.approvalRequired"
                      label="Requires Approval"
                      color="primary"
                    />

                    <h4 class="text-subtitle-1 font-weight-bold mb-3">
                      Forms in this Workstream
                    </h4>

                    <v-alert
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mb-3"
                    >
                      Attach one or more forms created
                      using the Form Builder.
                    </v-alert>

                    <v-list class="border rounded-lg">
                      <v-list-item
                        v-for="form in store.forms"
                        :key="form.id"
                      >
                        <template #prepend>
                          <v-checkbox-btn
                            :model-value="
                              workstreamDraft.formIds.includes(
                                form.id
                              )
                            "
                            color="primary"
                            @update:model-value="
                              toggleForm(form.id)
                            "
                          />
                        </template>

                        <v-list-item-title>
                          {{ form.name }}
                        </v-list-item-title>

                        <v-list-item-subtitle>
                          {{ form.fields.length }} fields
                          • {{ form.status }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </template>

                  <!-- ====================== -->
                  <!-- FORM BUILDER -->
                  <!-- ====================== -->
                  <template
                    v-else-if="
                      tab === 'FORM' &&
                      formDraft
                    "
                  >
                    <v-text-field
                      v-model="formDraft.name"
                      label="Form Name"
                      variant="outlined"
                      class="mb-3"
                    />

                    <v-textarea
                      v-model="formDraft.description"
                      label="Description"
                      variant="outlined"
                      rows="2"
                    />

                    <div class="d-flex align-center justify-space-between mb-3">
                      <h4 class="text-subtitle-1 font-weight-bold">
                        Form Fields
                      </h4>

                      <v-btn
                        color="primary"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-plus"
                        @click="addField"
                      >
                        Add Field
                      </v-btn>
                    </div>

                    <v-alert
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mb-4"
                    >
                      Configure fields for different
                      employment types and departments.
                    </v-alert>

                    <v-expansion-panels
                      variant="accordion"
                    >
                      <v-expansion-panel
                        v-for="(field, index) in formDraft.fields"
                        :key="field.id"
                      >
                        <v-expansion-panel-title>
                          <span class="mr-2">
                            {{ index + 1 }}.
                          </span>

                          {{ field.label }}

                          <v-chip
                            size="x-small"
                            class="ml-2"
                          >
                            {{ field.type }}
                          </v-chip>
                        </v-expansion-panel-title>

                        <v-expansion-panel-text>
                          <v-text-field
                            v-model="field.label"
                            label="Field Label"
                            variant="outlined"
                          />

                          <v-select
                            v-model="field.type"
                            :items="fieldTypes"
                            label="Field Type"
                            variant="outlined"
                          />

                          <v-switch
                            v-model="field.required"
                            label="Required Field"
                            color="primary"
                          />

                          <h4 class="mb-2">
                            Applicable Employment Types
                          </h4>

                          <div class="d-flex flex-wrap ga-2 mb-4">
                            <v-checkbox
                              v-for="type in employmentTypes"
                              :key="type"
                              :model-value="
                                field.employmentTypes.includes(
                                  type
                                )
                              "
                              :label="type"
                              density="compact"
                              hide-details
                              color="primary"
                              @update:model-value="
                                toggleFieldEmploymentType(
                                  field,
                                  type
                                )
                              "
                            />
                          </div>

                          <h4 class="mb-2">
                            Applicable Departments
                          </h4>

                          <div class="d-flex flex-wrap ga-2 mb-4">
                            <v-checkbox
                              v-for="department in departments"
                              :key="department"
                              :model-value="
                                field.departments.includes(
                                  department
                                )
                              "
                              :label="department"
                              density="compact"
                              hide-details
                              color="primary"
                              @update:model-value="
                                toggleFieldDepartment(
                                  field,
                                  department
                                )
                              "
                            />
                          </div>

                          <v-divider class="mb-3" />

                          <div class="d-flex flex-wrap ga-2">
                            <v-btn
                              size="small"
                              variant="outlined"
                              prepend-icon="mdi-arrow-up"
                              :disabled="index === 0"
                              @click="moveField(index, -1)"
                            >
                              Move Up
                            </v-btn>

                            <v-btn
                              size="small"
                              variant="outlined"
                              prepend-icon="mdi-arrow-down"
                              :disabled="
                                index ===
                                formDraft.fields.length - 1
                              "
                              @click="moveField(index, 1)"
                            >
                              Move Down
                            </v-btn>

                            <v-spacer />

                            <v-btn
                              size="small"
                              color="error"
                              variant="tonal"
                              prepend-icon="mdi-delete"
                              @click="removeField(index)"
                            >
                              Remove
                            </v-btn>
                          </div>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>

                    <v-alert
                      v-if="formDraft.fields.length === 0"
                      type="warning"
                      variant="tonal"
                      class="mt-4"
                    >
                      This form has no fields.
                      Click Add Field to begin.
                    </v-alert>
                  </template>
                </v-card-text>

                <v-divider />

                <!-- ACTION BUTTONS -->
                <v-card-actions class="pa-4">
                  <v-btn
                    color="error"
                    variant="text"
                    prepend-icon="mdi-delete"
                    @click="deleteTemplate"
                  >
                    Delete
                  </v-btn>

                  <v-spacer />

                  <v-btn
                    variant="outlined"
                    prepend-icon="mdi-content-save-outline"
                    @click="saveDraft"
                  >
                    Save Draft
                  </v-btn>

                  <v-btn
                    color="primary"
                    prepend-icon="mdi-check-circle-outline"
                    @click="publishTemplate"
                  >
                    Publish
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>
