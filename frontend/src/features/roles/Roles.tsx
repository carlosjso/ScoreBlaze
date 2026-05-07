import { useEffect, useState } from "react";

import { RoleDetailModal } from "@/features/roles/components/RoleDetailModal";
import { RoleFormModal } from "@/features/roles/components/RoleFormModal";
import { RolesTable } from "@/features/roles/components/RolesTable";
import { RolesToolbar } from "@/features/roles/components/RolesToolbar";
import { useRolesModals } from "@/features/roles/hooks/useRolesModals";
import { useRolesMutations } from "@/features/roles/hooks/useRolesMutations";
import { useRolesTableData } from "@/features/roles/hooks/useRolesTableData";
import type { SortDir, SortKey } from "@/features/roles/Roles.types";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

export default function Roles() {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { roles, loading, error, page, totalPages } = useRolesTableData({
    page: currentPage,
    search,
    sortKey,
    sortDir,
  });
  const modals = useRolesModals();
  const {
    submitting,
    deletingRoleId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveRole,
    deleteRole,
  } = useRolesMutations();

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

  const handleSubmit = async (values: Parameters<typeof saveRole>[0]["values"]) => {
    await saveRole({
      mode: modals.formMode,
      roleId: modals.editingRole?.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleDelete = async () => {
    if (!modals.deleteRole) return;

    try {
      await deleteRole(modals.deleteRole.id);
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
          title="Roles"
          subtitle="Gestiona roles del sistema y revisa rapidamente cuantos usuarios los tienen asignados."
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          <RolesToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <RolesTable
              roles={roles}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              currentPage={page}
              totalPages={totalPages}
              pageSize={DEFAULT_TABLE_PAGE_SIZE}
              deletingRoleId={deletingRoleId}
              onToggleSort={toggleSort}
              onPageChange={setCurrentPage}
              onView={modals.openDetail}
              onEdit={(role) => {
                clearMutationError();
                modals.openEdit(role);
              }}
              onDelete={(role) => {
                clearMutationError();
                modals.requestDelete(role);
              }}
            />
          </div>
        </Panel>
      </div>

      <RoleFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialRole={modals.editingRole}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <RoleDetailModal
        role={modals.detailRole}
        isOpen={modals.detailRole !== null}
        onClose={modals.closeDetail}
      />

      <ConfirmModal
        isOpen={modals.deleteRole !== null}
        title="Eliminar rol"
        message={
          modals.deleteRole
            ? `Seguro que deseas eliminar ${modals.deleteRole.name}. Esta accion no se puede deshacer.`
            : "Esta accion no se puede deshacer."
        }
        loading={deletingRoleId !== null}
        onCancel={() => {
          clearMutationError();
          modals.clearDeleteRequest();
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
