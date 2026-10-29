
import type { Department, EmploymentType } from "./index";

export type TemplateStatus = "DRAFT" | "PUBLISHED";

export type FormFieldType =
  | "CHECKBOX"
  | "TEXT"
  | "DATE"
  | "SIGNATURE"
  | "FILE";

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  employmentTypes: EmploymentType[];
  departments: Department[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  version: number;
  status: TemplateStatus;
  fields: FormField[];
}

export interface WorkstreamTemplate {
  id: string;
  name: string;
  description: string;
  version: number;
  status: TemplateStatus;
  responsibleDepartment: Department;
  approvalRequired: boolean;
  formIds: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  version: number;
  status: TemplateStatus;
  employmentTypes: EmploymentType[];
  departments: Department[];
  workstreamIds: string[];
}
