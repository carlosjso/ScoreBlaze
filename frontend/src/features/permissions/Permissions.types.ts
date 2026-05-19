export type PermissionListItem = {
  id: number;
  name: string;
  roleCount: number;
};

export type PermissionFormValues = {
  name: string;
};

export type PermissionMutationPayload = {
  name: string;
};

export type PermissionFormMode = "create" | "edit";
export type SortKey = "id" | "name" | "roles";
export type SortDir = "asc" | "desc";
