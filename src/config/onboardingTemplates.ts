
import type { EmploymentType } from "../types";

export interface ChecklistTemplateItem {
  id: string;
  label: string;
  type: "PROPERTY" | "DOCUMENT";
  required: boolean;
}

export const onboardingTemplates: Record<
  EmploymentType,
  ChecklistTemplateItem[]
> = {
  INTERN: [
    {
      id: "placement-letter",
      label: "Internship Placement Letter",
      type: "DOCUMENT",
      required: true,
    },
    {
      id: "intern-agreement",
      label: "Internship Agreement",
      type: "DOCUMENT",
      required: true,
    },
    {
      id: "personal-info",
      label: "Personal Information Form",
      type: "DOCUMENT",
      required: true,
    },
  ],

  PERMANENT: [
    {
      id: "offer-letter",
      label: "Employment Offer Letter",
      type: "DOCUMENT",
      required: true,
    },
    {
      id: "personal-info",
      label: "Personal Information Form",
      type: "DOCUMENT",
      required: true,
    },
  ],

  CONTRACT: [
    {
      id: "employment-contract",
      label: "Employment Contract",
      type: "DOCUMENT",
      required: true,
    },
    {
      id: "offer-letter",
      label: "Employment Offer Letter",
      type: "DOCUMENT",
      required: true,
    },
  ],
};
