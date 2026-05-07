import { useEffect, useState } from "react";

import { PermissionDetailModal } from "@/features/permissions/components/PermissionDetailModal";
import { PermissionFormModal } from "@/features/permissions/components/PermissionFormModal";
import { PermissionsTable } from "@/features/permissions/components/PermissionsTable";
import { PermissionsToolbar } from "@/features/permissions/components/PermissionsToolbar";
import { usePermissionsModals } from "@/features/permissions/hooks/usePermissionsModals";
import { usePermissionsMutations } from "@/features/permissions/hooks/usePermissionsMutations";
import { usePermissionsTableData } from "@/features/permissions/hooks/usePermissionsTableData";
import type { SortDir, SortKey } from "@/features/permissions/Permissions.types";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

export default function Permissions() {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { permissions, loading, error, page, totalPages } = usePermissionsTableData({
    page: currentPage,
    search,
    sortKey,
    sortDir,
  });
  const modals = usePermissionsModals();
  const {
    submitting,
    deletingPermissionId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    savePermission,
    deletePermission,
  } = usePermissionsMutations();

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

  const handleSubmit = async (values: Parameters<typeof savePermission>[0]["values"]) => {
    await savePermission({
      mode: modals.formMode,
      permissionId: modals.editingPermission?.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleDelete = async () => {
    if (!modals.deletePermission) return;

    try {
      await deletePermission(modals.deletePermission.id);
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
          title="Permisos"
          subtitle="Gestiona el catalogo de permisos disponibles y revisa cuantos roles los utilizan."
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          <PermissionsToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <PermissionsTable
              permissions={permissions}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              currentPage={page}
              totalPages={totalPages}
              pageSize={DEFAULT_TABLE_PAGE_SIZE}
              deletingPermissionId={deletingPermissionId}
              onToggleSort={toggleSort}
              onPageChange={setCurrentPage}
              onView={modals.openDetail}
              onEdit={(permission) => {
                clearMutationError();
                modals.openEdit(permission);
              }}
              onDelete={(permission) => {
                clearMutationError();
                modals.requestDelete(permission);
              }}
            />
          </div>
        </Panel>
      </div>

      <PermissionFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialPermission={modals.editingPermission}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <PermissionDetailModal
        permission={modals.detailPermission}
        isOpen={modals.detailPermission !== null}
        onClose={modals.closeDetail}
      />

      <ConfirmModal
        isOpen={modals.deletePermission !== null}
        title="Eliminar permiso"
        message={
          modals.deletePermission
            ? `Seguro que deseas eliminar ${modals.deletePermission.name}. Esta accion no se puede deshacer.`
            : "Esta accion no se puede deshacer."
        }
        loading={deletingPermissionId !== null}
        onCancel={() => {
          clearMutationError();
          modals.clearDeleteRequest();
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
