import { useEffect, useState } from "react";

import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { UserDetailModal } from "@/features/users/components/UserDetailModal";
import { UserFormModal } from "@/features/users/components/UserFormModal";
import { UsersTable } from "@/features/users/components/UsersTable";
import { UsersToolbar } from "@/features/users/components/UsersToolbar";
import { useUsersModals } from "@/features/users/hooks/useUsersModals";
import { useUsersMutations } from "@/features/users/hooks/useUsersMutations";
import { useUsersTableData } from "@/features/users/hooks/useUsersTableData";
import type { SortDir, SortKey } from "@/features/users/Users.types";

export default function Users() {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { users, loading, error, page, totalPages } = useUsersTableData({
    page: currentPage,
    search,
    sortKey,
    sortDir,
  });
  const modals = useUsersModals();
  const {
    submitting,
    deletingUserId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveUser,
    deleteUser,
  } = useUsersMutations();

  useEffect(() => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage, page]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      setCurrentPage(1);
      return;
    }

    setSortDir((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
    setCurrentPage(1);
  };

  const openCreate = () => {
    clearMutationError();
    modals.openCreate();
  };

  const handleSubmit = async (values: Parameters<typeof saveUser>[0]["values"]) => {
    await saveUser({
      mode: modals.formMode,
      userId: modals.editingUser?.id,
      currentRoleName: modals.editingUser?.roles[0],
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleDelete = async () => {
    if (!modals.deleteUser) return;

    try {
      await deleteUser(modals.deleteUser.id);
      modals.clearDeleteRequest();
    } catch {
      return;
    }
  };

  const panelError = mutationErrorMessage ?? error;

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Usuarios"
          subtitle="Gestiona cuentas del sistema y administra sus datos base."
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          <UsersToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <UsersTable
              users={users}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              currentPage={page}
              totalPages={totalPages}
              pageSize={DEFAULT_TABLE_PAGE_SIZE}
              deletingUserId={deletingUserId}
              onToggleSort={toggleSort}
              onPageChange={setCurrentPage}
              onView={modals.openDetail}
              onEdit={(user) => {
                clearMutationError();
                modals.openEdit(user);
              }}
              onDelete={(user) => {
                clearMutationError();
                modals.requestDelete(user);
              }}
            />
          </div>
        </Panel>
      </div>

      <UserFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialUser={modals.editingUser}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <UserDetailModal
        user={modals.detailUser}
        isOpen={modals.detailUser !== null}
        onClose={modals.closeDetail}
      />

      <ConfirmModal
        isOpen={modals.deleteUser !== null}
        title="Eliminar usuario"
        message={
          modals.deleteUser
            ? `Seguro que deseas eliminar ${modals.deleteUser.name}. Esta accion no se puede deshacer.`
            : "Esta accion no se puede deshacer."
        }
        loading={deletingUserId !== null}
        onCancel={() => {
          clearMutationError();
          modals.clearDeleteRequest();
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
