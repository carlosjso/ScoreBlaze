export type UserListItem = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  roleCount: number;
  createdAt: string;
};

export type UserFormValues = {
  name: string;
  email: string;
  roleName: string;
  password: string;
};

export type UserMutationPayload = {
  name: string;
  email: string;
  role_name?: string;
  password?: string;
};

export type UserFormMode = "create" | "edit";
export type SortKey = "id" | "name" | "email";
export type SortDir = "asc" | "desc";
