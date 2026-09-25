import { Pencil, Search, Trash2 } from "lucide-react";

import type { RoleListItem, SortDir, SortKey } from "@/features/roles/Roles.types";
import { Paginator } from "@/shared/components/table/Paginator";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { cn } from "@/shared/utils/cn";

type RolesTableProps = {
  roles: RoleListItem[];
  loading: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  deletingRoleId: number | null;
  onToggleSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onView: (role: RoleListItem) => void;
  onEdit: (role: RoleListItem) => void;
  onDelete: (role: RoleListItem) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

function SkeletonCell({ className }: { className?: string }) {
  return <div className={cn("h-4 animate-pulse rounded-full bg-slate-200/80", className)} />;
}

function RoleActionButton({
  title,
  icon,
  onClick,
  className,
  disabled = false,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  className: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100",
        className,
      )}
    >
      {icon}
    </button>
  );
}

export function RolesTable({
  roles,
  loading,
  sortKey,
  sortDir,
  currentPage,
  totalPages,
  pageSize,
  deletingRoleId,
  onToggleSort,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: RolesTableProps) {
  const emptyRowsCount = Math.max(0, pageSize - roles.length);

  return (
    <TableShell className="min-h-[460px]">
      <table className="w-full min-w-[860px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "90px" }} />
          <col style={{ width: "150px" }} />
          <col style={{ width: "150px" }} />
          <col />
        </colgroup>
        <thead>
          <tr className={tableHeaderClass}>
            <th className={tableCellClass}>
              <SortHeaderButton label="ID" sortKey="id" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>
              <SortHeaderButton label="ROL" sortKey="name" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>
              <SortHeaderButton
                label="USUARIOS"
                sortKey="users"
                activeKey={sortKey}
                direction={sortDir}
                onToggle={onToggleSort}
              />
            </th>
            <th className={`${tableCellClass} text-right`}>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: pageSize }).map((_, index) => (
              <tr key={`roles-skeleton-${index}`} className={tableRowClass}>
                <td className={tableCellClass}>
                  <SkeletonCell className="w-10" />
                </td>
                <td className={tableCellClass}>
                  <SkeletonCell className="w-32" />
                </td>
                <td className={tableCellClass}>
                  <SkeletonCell className="w-24" />
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <div className="flex justify-end gap-2">
                    {Array.from({ length: 3 }).map((__, actionIndex) => (
                      <div
                        key={`roles-skeleton-action-${index}-${actionIndex}`}
                        className="h-9 w-9 animate-pulse rounded-lg bg-slate-200/80"
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))
          ) : null}

          {!loading &&
            roles.map((role) => {
              const actionsDisabled = deletingRoleId === role.id;
              const protectedRole = role.isSystem;

              return (
                <tr key={role.id} className={tableRowClass}>
                  <td className={`${tableCellClass} font-semibold text-slate-800`}>{role.id}</td>
                  <td className={tableCellClass}>
                    <p className="truncate font-medium text-slate-900" title={role.name}>
                      {role.name}
                    </p>
                  </td>
                  <td className={tableCellClass}>
                    <p className="font-medium text-slate-900">
                      {role.userCount} {role.userCount === 1 ? "usuario" : "usuarios"}
                    </p>
                  </td>
                  <td className={`${tableCellClass} text-right`}>
                    <div className="flex justify-end gap-2">
                      <RoleActionButton
                        title="Ver detalle"
                        icon={<Search size={14} />}
                        onClick={() => onView(role)}
                        className="border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                        disabled={actionsDisabled}
                      />
                      <RoleActionButton
                        title="Editar"
                        icon={<Pencil size={14} />}
                        onClick={() => onEdit(role)}
                        className="border border-slate-300 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                        disabled={actionsDisabled || protectedRole || !canEdit}
                      />
                      <RoleActionButton
                        title="Eliminar"
                        icon={<Trash2 size={14} />}
                        onClick={() => onDelete(role)}
                        className="border border-red-200 bg-white text-red-500 hover:bg-red-50"
                        disabled={actionsDisabled || protectedRole || !canDelete}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

          {!loading && roles.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-center" colSpan={4}>
                <TableEmptyState
                  mode="empty"
                  title="No hay roles registrados"
                  description="Comienza creando tu primer rol para que aparezca en este listado."
                />
              </td>
            </tr>
          ) : null}

          {!loading && roles.length > 0
            ? Array.from({ length: emptyRowsCount }).map((_, index) => (
                <tr key={`empty-role-row-${index}`} className={tableRowClass}>
                  <td className={tableCellClass}>&nbsp;</td>
                  <td className={tableCellClass}>&nbsp;</td>
                  <td className={tableCellClass}>&nbsp;</td>
                  <td className={tableCellClass}>&nbsp;</td>
                </tr>
              ))
            : null}
        </tbody>
      </table>

      {!loading ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-xs font-medium text-slate-500">
            Pagina {currentPage} de {totalPages}
          </p>

          <Paginator currentPage={currentPage} totalPages={totalPages} onChange={onPageChange} />
        </div>
      ) : null}
    </TableShell>
  );
}
