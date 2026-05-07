import { useState } from "react";

import type { PermissionFormMode, PermissionListItem } from "@/features/permissions/Permissions.types";

export function usePermissionsModals() {
  const [detailPermission, setDetailPermission] = useState<PermissionListItem | null>(null);
  const [deletePermission, setDeletePermission] = useState<PermissionListItem | null>(null);
  const [editingPermission, setEditingPermission] = useState<PermissionListItem | null>(null);
  const [formMode, setFormMode] = useState<PermissionFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingPermission(null);
  };

  return {
    detailPermission,
    deletePermission,
    editingPermission,
    formMode,
    formOpen,
    openDetail: setDetailPermission,
    closeDetail: () => setDetailPermission(null),
    requestDelete: setDeletePermission,
    clearDeleteRequest: () => setDeletePermission(null),
    openCreate() {
      setFormMode("create");
      setEditingPermission(null);
      setFormOpen(true);
    },
    openEdit(permission: PermissionListItem) {
      setFormMode("edit");
      setEditingPermission(permission);
      setFormOpen(true);
    },
    closeForm,
  };
}
