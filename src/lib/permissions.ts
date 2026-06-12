export type AppRole = "admin" | "physician" | "clinical_staff" | "billing";

export type Permission =
  | "auth:create" | "auth:edit" | "auth:approve"
  | "appeal:draft" | "appeal:submit"
  | "doc:upload" | "doc:delete"
  | "analytics:view" | "analytics:export"
  | "admin:users" | "admin:audit" | "admin:settings";

export const ROLE_GRANTS: Record<AppRole, Permission[]> = {
  admin: [
    "auth:create", "auth:edit", "auth:approve",
    "appeal:draft", "appeal:submit",
    "doc:upload", "doc:delete",
    "analytics:view", "analytics:export",
    "admin:users", "admin:audit", "admin:settings",
  ],
  physician: [
    "auth:create", "auth:edit", "auth:approve",
    "appeal:draft", "appeal:submit",
    "doc:upload", "doc:delete",
    "analytics:view",
  ],
  clinical_staff: [
    "auth:create", "auth:edit",
    "appeal:draft",
    "doc:upload",
    "analytics:view",
  ],
  billing: [
    "appeal:draft",
    "analytics:view",
  ],
};

export function hasPermission(roles: AppRole[], perm: Permission): boolean {
  return roles.some((r) => ROLE_GRANTS[r]?.includes(perm));
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  physician: "Physician",
  clinical_staff: "Clinical Staff",
  billing: "Billing Specialist",
};
