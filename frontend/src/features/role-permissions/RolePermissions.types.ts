import type { RoleListItem } from "@/features/roles/Roles.types";

export type RolePermissionActionItem = {
  key: string;
  label: string;
  permissionName: string;
  enabled: boolean;
};

export type RolePermissionModuleItem = {
  key: string;
  label: string;
  description: string;
  allowAll: boolean;
  permissions: RolePermissionActionItem[];
};

export type RolePermissionMatrix = {
  role: RoleListItem;
  modules: RolePermissionModuleItem[];
};

export type RolePermissionMutationPayload = {
  permission_names: string[];
};
