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
    <article className="rounded-[26px] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-[linear-gradient(135deg,var(--tw-gradient-from),var(--tw-gradient-via),var(--tw-gradient-to))] ${accentClassName}`}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[22px] font-semibold tracking-tight text-slate-950">
              {module.label}
            </h3>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Permitir todo</span>
          <PermissionSwitch
            checked={module.allowAll}
            disabled={disabled}
            onClick={() => onToggleModule(module.key)}
            label={`Permitir todo en ${module.label}`}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {module.permissions.map((permission) => (
          <div
            key={permission.permissionName}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2.5"
          >
            <span className="text-[15px] font-medium text-slate-700">{permission.label}</span>
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
