
export type DepartmentCode =
  | "QA"
  | "QC"
  | "PRODUCTION"
  | "HR"
  | "IT";

export interface DepartmentRequirements {
  uniform: boolean;
  safetyShoes: boolean;
}

export const departmentRequirements: Record<
  DepartmentCode,
  DepartmentRequirements
> = {
  QA: {
    uniform: true,
    safetyShoes: true,
  },
  QC: {
    uniform: true,
    safetyShoes: true,
  },
  PRODUCTION: {
    uniform: true,
    safetyShoes: true,
  },
  HR: {
    uniform: false,
    safetyShoes: false,
  },
  IT: {
    uniform: false,
    safetyShoes: false,
  },
};
