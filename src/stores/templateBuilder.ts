
import { defineStore } from "pinia";

import type {
  WorkflowTemplate,
  WorkstreamTemplate,
  FormTemplate,
} from "../types/templateBuilder";

const STORAGE_KEY = "kotra-template-builder";

interface TemplateBuilderState {
  workflows: WorkflowTemplate[];
  workstreams: WorkstreamTemplate[];
  forms: FormTemplate[];
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadState(): TemplateBuilderState {
  const empty: TemplateBuilderState = {
    workflows: [],
    workstreams: [],
    forms: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return empty;

    const saved: unknown = JSON.parse(raw);

    if (
      typeof saved !== "object" ||
      saved === null
    ) {
      return empty;
    }

    const data = saved as Partial<TemplateBuilderState>;

    return {
      workflows: Array.isArray(data.workflows)
        ? data.workflows
        : [],
      workstreams: Array.isArray(data.workstreams)
        ? data.workstreams
        : [],
      forms: Array.isArray(data.forms)
        ? data.forms
        : [],
    };
  } catch (error) {
    console.error("Failed to load templates:", error);
    return empty;
  }
}

export const useTemplateBuilderStore = defineStore(
  "templateBuilder",
  {
    state: (): TemplateBuilderState => loadState(),

    getters: {
      publishedWorkflows(state): WorkflowTemplate[] {
        return state.workflows.filter(
          (workflow) => workflow.status === "PUBLISHED"
        );
      },

      publishedWorkstreams(state): WorkstreamTemplate[] {
        return state.workstreams.filter(
          (workstream) => workstream.status === "PUBLISHED"
        );
      },

      publishedForms(state): FormTemplate[] {
        return state.forms.filter(
          (form) => form.status === "PUBLISHED"
        );
      },
    },

    actions: {
      persist(): void {
        const data: TemplateBuilderState = {
          workflows: this.workflows,
          workstreams: this.workstreams,
          forms: this.forms,
        };

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(data)
        );
      },

      // ====================================
      // WORKFLOW TEMPLATES
      // ====================================

      createWorkflow(): string {
        const id = generateId();

        const workflow: WorkflowTemplate = {
          id,
          name: "New Workflow",
          description: "",
          version: 1,
          status: "DRAFT",
          employmentTypes: [],
          departments: [],
          workstreamIds: [],
        };

        this.workflows.push(workflow);
        this.persist();

        return id;
      },

      updateWorkflow(workflow: WorkflowTemplate): void {
        const index = this.workflows.findIndex(
          (item) => item.id === workflow.id
        );

        if (index === -1) return;

        const previous = this.workflows[index];

        this.workflows[index] = {
          ...clone(workflow),
          status: "DRAFT",
          version: previous.version + 1,
        };

        this.persist();
      },

      publishWorkflow(id: string): boolean {
        const workflow = this.workflows.find(
          (item) => item.id === id
        );

        if (!workflow) return false;
        if (!workflow.name.trim()) return false;

        if (workflow.employmentTypes.length === 0) {
          return false;
        }

        if (workflow.departments.length === 0) {
          return false;
        }

        if (workflow.workstreamIds.length === 0) {
          return false;
        }

        const allWorkstreamsPublished =
          workflow.workstreamIds.every((workstreamId) =>
            this.workstreams.some(
              (workstream) =>
                workstream.id === workstreamId &&
                workstream.status === "PUBLISHED"
            )
          );

        if (!allWorkstreamsPublished) return false;

        workflow.status = "PUBLISHED";
        this.persist();

        return true;
      },

      deleteWorkflow(id: string): void {
        this.workflows = this.workflows.filter(
          (item) => item.id !== id
        );

        this.persist();
      },

      // ====================================
      // WORKSTREAM TEMPLATES
      // ====================================

      createWorkstream(): string {
        const id = generateId();

        const workstream: WorkstreamTemplate = {
          id,
          name: "New Workstream",
          description: "",
          version: 1,
          status: "DRAFT",
          responsibleDepartment: "HR",
          approvalRequired: true,
          formIds: [],
        };

        this.workstreams.push(workstream);
        this.persist();

        return id;
      },

      updateWorkstream(
        workstream: WorkstreamTemplate
      ): void {
        const index = this.workstreams.findIndex(
          (item) => item.id === workstream.id
        );

        if (index === -1) return;

        const previous = this.workstreams[index];

        this.workstreams[index] = {
          ...clone(workstream),
          status: "DRAFT",
          version: previous.version + 1,
        };

        this.persist();
      },

      publishWorkstream(id: string): boolean {
        const workstream = this.workstreams.find(
          (item) => item.id === id
        );

        if (!workstream) return false;
        if (!workstream.name.trim()) return false;
        if (workstream.formIds.length === 0) return false;

        const allFormsPublished =
          workstream.formIds.every((formId) =>
            this.forms.some(
              (form) =>
                form.id === formId &&
                form.status === "PUBLISHED"
            )
          );

        if (!allFormsPublished) return false;

        workstream.status = "PUBLISHED";
        this.persist();

        return true;
      },

      deleteWorkstream(id: string): void {
        this.workstreams = this.workstreams.filter(
          (item) => item.id !== id
        );

        // Remove references from workflows.
        for (const workflow of this.workflows) {
          if (workflow.workstreamIds.includes(id)) {
            workflow.workstreamIds =
              workflow.workstreamIds.filter(
                (workstreamId) => workstreamId !== id
              );

            workflow.status = "DRAFT";
          }
        }

        this.persist();
      },

      // ====================================
      // FORM TEMPLATES
      // ====================================

      createForm(): string {
        const id = generateId();

        const form: FormTemplate = {
          id,
          name: "New Form",
          description: "",
          version: 1,
          status: "DRAFT",
          fields: [],
        };

        this.forms.push(form);
        this.persist();

        return id;
      },

      updateForm(form: FormTemplate): void {
        const index = this.forms.findIndex(
          (item) => item.id === form.id
        );

        if (index === -1) return;

        const previous = this.forms[index];

        this.forms[index] = {
          ...clone(form),
          status: "DRAFT",
          version: previous.version + 1,
        };

        this.persist();
      },

      publishForm(id: string): boolean {
        const form = this.forms.find(
          (item) => item.id === id
        );

        if (!form) return false;
        if (!form.name.trim()) return false;
        if (form.fields.length === 0) return false;

        const validFields = form.fields.every(
          (field) =>
            field.label.trim().length > 0 &&
            field.employmentTypes.length > 0 &&
            field.departments.length > 0
        );

        if (!validFields) return false;

        form.status = "PUBLISHED";
        this.persist();

        return true;
      },

      deleteForm(id: string): void {
        this.forms = this.forms.filter(
          (item) => item.id !== id
        );

        // Remove references from workstreams.
        const affectedWorkstreamIds: string[] = [];

        for (const workstream of this.workstreams) {
          if (workstream.formIds.includes(id)) {
            workstream.formIds =
              workstream.formIds.filter(
                (formId) => formId !== id
              );

            workstream.status = "DRAFT";
            affectedWorkstreamIds.push(workstream.id);
          }
        }

        // Workflows using affected workstreams
        // must also be reviewed again.
        for (const workflow of this.workflows) {
          if (
            workflow.workstreamIds.some(
              (workstreamId) =>
                affectedWorkstreamIds.includes(workstreamId)
            )
          ) {
            workflow.status = "DRAFT";
          }
        }

        this.persist();
      },
    },
  }
);
