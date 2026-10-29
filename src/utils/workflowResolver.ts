
import type {
  EmploymentType,
  Department,
} from "../types";

import type {
  WorkflowTemplate,
  WorkstreamTemplate,
  FormTemplate,
  FormField,
} from "../types/templateBuilder";

// ==========================================
// ASSIGNED TEMPLATE TYPES
// ==========================================

export interface AssignedForm {
  id: string;
  name: string;
  version: number;
  fields: FormField[];
}

export interface AssignedWorkstream {
  id: string;
  name: string;
  responsibleDepartment: Department;
  approvalRequired: boolean;
  forms: AssignedForm[];
}

export interface AssignedWorkflow {
  id: string;
  name: string;
  version: number;
  workstreams: AssignedWorkstream[];
}

// ==========================================
// RESOLVER OPTIONS
// ==========================================

interface ResolveOptions {
  employmentType: EmploymentType;
  department: Department;
  workflows: WorkflowTemplate[];
  workstreams: WorkstreamTemplate[];
  forms: FormTemplate[];
}

// ==========================================
// COPY FORM FIELD
// ==========================================

function copyField(field: FormField): FormField {
  return JSON.parse(
    JSON.stringify(field)
  ) as FormField;
}

// ==========================================
// RESOLVE PUBLISHED WORKFLOW
// ==========================================

export function resolvePublishedWorkflow(
  options: ResolveOptions
): AssignedWorkflow | null {
  const {
    employmentType,
    department,
    workflows,
    workstreams,
    forms,
  } = options;

  // STEP 1: Find matching published workflows.

  const matches = workflows.filter(
    (workflow) =>
      workflow.status === "PUBLISHED" &&
      workflow.employmentTypes.includes(
        employmentType
      ) &&
      workflow.departments.includes(
        department
      )
  );

  if (matches.length === 0) {
    console.warn(
      `No published workflow found for ${employmentType} / ${department}`
    );

    return null;
  }

  if (matches.length > 1) {
    console.warn(
      `Multiple published workflows match ${employmentType} / ${department}`
    );

    return null;
  }

  const workflow = matches[0];

  // STEP 2: Check workflow workstreams.

  if (workflow.workstreamIds.length === 0) {
    console.warn(
      `Workflow "${workflow.name}" has no workstreams.`
    );

    return null;
  }

  const assignedWorkstreams: AssignedWorkstream[] = [];

  // STEP 3: Resolve workstreams.

  for (const workstreamId of workflow.workstreamIds) {
    const workstream = workstreams.find(
      (item) =>
        item.id === workstreamId &&
        item.status === "PUBLISHED"
    );

    if (!workstream) {
      console.warn(
        `Published workstream not found: ${workstreamId}`
      );

      return null;
    }

    const assignedForms: AssignedForm[] = [];

    // STEP 4: Resolve forms.

    for (const formId of workstream.formIds) {
      const form = forms.find(
        (item) =>
          item.id === formId &&
          item.status === "PUBLISHED"
      );

      if (!form) {
        console.warn(
          `Published form not found: ${formId}`
        );

        return null;
      }

      // STEP 5: Filter fields for employee.

      const applicableFields = form.fields
        .filter(
          (field) =>
            field.employmentTypes.includes(
              employmentType
            ) &&
            field.departments.includes(
              department
            )
        )
        .map(copyField);

      if (applicableFields.length === 0) {
        continue;
      }

      assignedForms.push({
        id: form.id,
        name: form.name,
        version: form.version,
        fields: applicableFields,
      });
    }

    // STEP 6: Ensure workstream has forms.

    if (assignedForms.length === 0) {
      console.warn(
        `Workstream "${workstream.name}" has no applicable forms.`
      );

      return null;
    }

    assignedWorkstreams.push({
      id: workstream.id,
      name: workstream.name,
      responsibleDepartment:
        workstream.responsibleDepartment,
      approvalRequired:
        workstream.approvalRequired,
      forms: assignedForms,
    });
  }

  // STEP 7: Return workflow snapshot.

  if (assignedWorkstreams.length === 0) {
    return null;
  }

  return {
    id: workflow.id,
    name: workflow.name,
    version: workflow.version,
    workstreams: assignedWorkstreams,
  };
}
