import type { ReactNode } from "react";

import type { RolePermissionModuleItem } from "@/features/role-permissions/RolePermissions.types";
import { PermissionSwitch } from "@/features/role-permissions/components/PermissionSwitch";

type RolePermissionModuleCardProps = {
  module: RolePermissionModuleItem;
  icon: ReactNode;
  accentClassName: string;
  disabled?: boolean;
  onToggleModule: (moduleKey: string) => void;
  onTogglePermission: (moduleKey: string, permissionName: string) => void;
};

export function RolePermissionModuleCard({
  module,
  icon,
  accentClassName,
  disabled = false,
  onToggleModule,
  onTogglePermission,
}: RolePermissionModuleCardProps) {
  return (
    <article className="rounded-[20px] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3.5 shadow-[0_12px_24px_rgba(15,23,42,0.045)]">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border bg-[linear-gradient(135deg,var(--tw-gradient-from),var(--tw-gradient-via),var(--tw-gradient-to))] ${accentClassName}`}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-semibold tracking-tight text-slate-950">
              {module.label}
            </h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              {module.permissions.length} acciones
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Todo
          </span>
          <PermissionSwitch
            checked={module.allowAll}
            disabled={disabled}
            onClick={() => onToggleModule(module.key)}
            label={`Permitir todo en ${module.label}`}
          />
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {module.permissions.map((permission) => (
          <div
            key={permission.permissionName}
            className="flex items-center justify-between gap-2 rounded-[16px] border border-slate-200/80 bg-white/80 px-2.5 py-1.5"
          >
            <span className="text-[13px] font-medium text-slate-700">{permission.label}</span>
            <PermissionSwitch
              checked={permission.enabled}
              disabled={disabled}
              onClick={() => onTogglePermission(module.key, permission.permissionName)}
              label={`${permission.label} en ${module.label}`}
            />
          </div>
        ))}
      </div>
    </article>
  );
}
