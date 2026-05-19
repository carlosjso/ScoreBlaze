import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dribbble,
  House,
  KeyRound,
  Shield,
  ShieldCheck,
  Trophy,
  UserRoundCog,
  UsersRound,
} from "lucide-react";

import { rolePermissionsQueryKeys, rolePermissionsService } from "@/features/role-permissions/RolePermissions.service";
import { RolePermissionModuleCard } from "@/features/role-permissions/components/RolePermissionModuleCard";
import { toRolePermissionMutationPayload } from "@/features/role-permissions/schemas/RolePermissions.schema";
import type { RolePermissionModuleItem } from "@/features/role-permissions/RolePermissions.types";
import { rolesQueryKeys, rolesService } from "@/features/roles/Roles.service";
import { getApiGlobalErrorMessage } from "@/shared/api/client";
import { Button, PageHeader, Panel, Select } from "@/shared/components/ui";

type ModuleVisual = {
  icon: ReactNode;
  accentClassName: string;
};

const moduleVisuals: Record<string, ModuleVisual> = {
  dashboard: {
    icon: <House size={18} />,
    accentClassName: "from-rose-100 via-white to-rose-50 text-rose-700 border-rose-200",
  },
  players: {
    icon: <UsersRound size={18} />,
    accentClassName: "from-sky-100 via-white to-sky-50 text-sky-700 border-sky-200",
  },
  teams: {
    icon: <Shield size={18} />,
    accentClassName: "from-indigo-100 via-white to-indigo-50 text-indigo-700 border-indigo-200",
  },
  quick_match: {
    icon: <Dribbble size={18} />,
    accentClassName: "from-orange-100 via-white to-orange-50 text-orange-700 border-orange-200",
  },
  leagues: {
    icon: <Trophy size={18} />,
    accentClassName: "from-amber-100 via-white to-amber-50 text-amber-700 border-amber-200",
  },
  roles: {
    icon: <ShieldCheck size={18} />,
    accentClassName: "from-emerald-100 via-white to-emerald-50 text-emerald-700 border-emerald-200",
  },
  permissions: {
    icon: <KeyRound size={18} />,
    accentClassName: "from-cyan-100 via-white to-cyan-50 text-cyan-700 border-cyan-200",
  },
  users: {
    icon: <UserRoundCog size={18} />,
    accentClassName: "from-violet-100 via-white to-violet-50 text-violet-700 border-violet-200",
  },
};

function normalizeModules(modules: RolePermissionModuleItem[]): RolePermissionModuleItem[] {
  return modules.map((module) => {
    const permissions = module.permissions.map((permission) => ({
      ...permission,
      enabled: Boolean(permission.enabled),
    }));

    return {
      ...module,
      permissions,
      allowAll: permissions.length > 0 && permissions.every((permission) => permission.enabled),
    };
  });
}

function collectEnabledPermissionNames(modules: RolePermissionModuleItem[]): string[] {
  return modules
    .flatMap((module) => module.permissions)
    .filter((permission) => permission.enabled)
    .map((permission) => permission.permissionName)
    .sort((left, right) => left.localeCompare(right));
}

function buildModulesSignature(modules: RolePermissionModuleItem[]): string {
  return collectEnabledPermissionNames(modules).join("|");
}

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [draftModules, setDraftModules] = useState<RolePermissionModuleItem[]>([]);

  const rolesQuery = useQuery({
    queryKey: rolesQueryKeys.list(),
    queryFn: ({ signal }) => rolesService.getAll(signal),
  });

  useEffect(() => {
    if (!rolesQuery.data || rolesQuery.data.length === 0) {
      setSelectedRoleId(null);
      return;
    }

    setSelectedRoleId((currentRoleId) => {
      if (currentRoleId && rolesQuery.data.some((role) => role.id === currentRoleId)) {
        return currentRoleId;
      }

      return rolesQuery.data[0]?.id ?? null;
    });
  }, [rolesQuery.data]);

  const matrixQuery = useQuery({
    queryKey: selectedRoleId ? rolePermissionsQueryKeys.matrix(selectedRoleId) : rolePermissionsQueryKeys.all,
    queryFn: ({ signal }) => {
      if (!selectedRoleId) {
        throw new Error("Selecciona un rol para consultar sus permisos.");
      }

      return rolePermissionsService.getMatrix(selectedRoleId, signal);
    },
    enabled: selectedRoleId !== null,
  });

  useEffect(() => {
    if (matrixQuery.data) {
      setDraftModules(normalizeModules(matrixQuery.data.modules));
      return;
    }

    setDraftModules([]);
  }, [matrixQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) {
        throw new Error("Selecciona un rol para guardar sus permisos.");
      }

      return rolePermissionsService.updateMatrix(
        selectedRoleId,
        toRolePermissionMutationPayload(collectEnabledPermissionNames(draftModules)),
      );
    },
    onSuccess: (matrix) => {
      if (!selectedRoleId) {
        return;
      }

      queryClient.setQueryData(rolePermissionsQueryKeys.matrix(selectedRoleId), matrix);
      setDraftModules(normalizeModules(matrix.modules));
    },
  });

  const panelError = getApiGlobalErrorMessage(
    saveMutation.error ?? matrixQuery.error ?? rolesQuery.error,
  );

  const activePermissionsCount = useMemo(
    () => collectEnabledPermissionNames(draftModules).length,
    [draftModules],
  );

  const hasChanges = useMemo(() => {
    if (!matrixQuery.data) {
      return false;
    }

    return buildModulesSignature(draftModules) !== buildModulesSignature(matrixQuery.data.modules);
  }, [draftModules, matrixQuery.data]);

  const toggleModule = (moduleKey: string) => {
    setDraftModules((currentModules) =>
      currentModules.map((module) => {
        if (module.key !== moduleKey) {
          return module;
        }

        const nextEnabled = !module.allowAll;
        return {
          ...module,
          allowAll: nextEnabled,
          permissions: module.permissions.map((permission) => ({
            ...permission,
            enabled: nextEnabled,
          })),
        };
      }),
    );
  };

  const togglePermission = (moduleKey: string, permissionName: string) => {
    setDraftModules((currentModules) =>
      normalizeModules(
        currentModules.map((module) => {
          if (module.key !== moduleKey) {
            return module;
          }

          return {
            ...module,
            permissions: module.permissions.map((permission) =>
              permission.permissionName === permissionName
                ? { ...permission, enabled: !permission.enabled }
                : permission,
            ),
          };
        }),
      ),
    );
  };

  const resetDraft = () => {
    if (matrixQuery.data) {
      setDraftModules(normalizeModules(matrixQuery.data.modules));
    }
  };

  const isBusy = rolesQuery.isLoading || matrixQuery.isLoading || saveMutation.isPending;
  const selectedRoleValue = selectedRoleId === null ? "" : String(selectedRoleId);

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Roles por permiso"
          subtitle="Define visualmente que acciones puede realizar cada rol en cada modulo del sistema."
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/70 p-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-xs">
              <Select
                label="Rol"
                value={selectedRoleValue}
                onChange={(event) => {
                  const nextRoleId = Number(event.target.value);
                  setSelectedRoleId(Number.isFinite(nextRoleId) && nextRoleId > 0 ? nextRoleId : null);
                }}
                disabled={rolesQuery.isLoading || saveMutation.isPending}
                className="bg-slate-100"
              >
                <option value="">
                  {rolesQuery.isLoading ? "Cargando roles..." : "Selecciona un rol"}
                </option>
                {(rolesQuery.data ?? []).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                {activePermissionsCount} permisos activos
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={resetDraft}
                  disabled={!hasChanges || isBusy}
                >
                  Restablecer
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => saveMutation.mutate()}
                  disabled={!selectedRoleId || !hasChanges || isBusy}
                >
                  {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
          </div>

          {!rolesQuery.isLoading && (rolesQuery.data?.length ?? 0) === 0 ? (
            <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              Primero crea al menos un rol para poder asignarle permisos.
            </div>
          ) : null}

          {selectedRoleId && matrixQuery.isLoading ? (
            <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              Cargando matriz de permisos...
            </div>
          ) : null}

          {draftModules.length > 0 ? (
            <section className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {draftModules.map((module) => {
                const visual = moduleVisuals[module.key] ?? {
                  icon: <ShieldCheck size={18} />,
                  accentClassName: "from-slate-100 via-white to-slate-50 text-slate-700 border-slate-200",
                };

                return (
                  <RolePermissionModuleCard
                    key={module.key}
                    module={module}
                    icon={visual.icon}
                    accentClassName={visual.accentClassName}
                    disabled={saveMutation.isPending}
                    onToggleModule={toggleModule}
                    onTogglePermission={togglePermission}
                  />
                );
              })}
            </section>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
