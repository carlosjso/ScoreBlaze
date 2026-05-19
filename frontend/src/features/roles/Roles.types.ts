export type RoleListItem = {
  id: number;
  name: string;
  userCount: number;
  isSystem: boolean;
};

export type RoleFormValues = {
  name: string;
};

export type RoleMutationPayload = {
  name: string;
};

export type RoleFormMode = "create" | "edit";
export type SortKey = "id" | "name" | "users";
export type SortDir = "asc" | "desc";
