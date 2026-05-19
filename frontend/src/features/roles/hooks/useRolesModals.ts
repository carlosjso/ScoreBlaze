import { useState } from "react";

import type { RoleFormMode, RoleListItem } from "@/features/roles/Roles.types";

export function useRolesModals() {
  const [detailRole, setDetailRole] = useState<RoleListItem | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleListItem | null>(null);
  const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);
  const [formMode, setFormMode] = useState<RoleFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingRole(null);
  };

  return {
    detailRole,
    deleteRole,
    editingRole,
    formMode,
    formOpen,
    openDetail: setDetailRole,
    closeDetail: () => setDetailRole(null),
    requestDelete: setDeleteRole,
    clearDeleteRequest: () => setDeleteRole(null),
    openCreate() {
      setFormMode("create");
      setEditingRole(null);
      setFormOpen(true);
    },
    openEdit(role: RoleListItem) {
      setFormMode("edit");
      setEditingRole(role);
      setFormOpen(true);
    },
    closeForm,
  };
}
