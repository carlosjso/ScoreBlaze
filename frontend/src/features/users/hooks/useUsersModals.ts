import { useState } from "react";

import type { UserFormMode, UserListItem } from "@/features/users/Users.types";

export function useUsersModals() {
  const [detailUser, setDetailUser] = useState<UserListItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserListItem | null>(null);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [formMode, setFormMode] = useState<UserFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingUser(null);
  };

  return {
    detailUser,
    deleteUser,
    editingUser,
    formMode,
    formOpen,
    openDetail: setDetailUser,
    closeDetail: () => setDetailUser(null),
    requestDelete: setDeleteUser,
    clearDeleteRequest: () => setDeleteUser(null),
    openCreate() {
      setFormMode("create");
      setEditingUser(null);
      setFormOpen(true);
    },
    openEdit(user: UserListItem) {
      setFormMode("edit");
      setEditingUser(user);
      setFormOpen(true);
    },
    closeForm,
  };
}
