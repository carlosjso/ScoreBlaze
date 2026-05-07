import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, Mail, User2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { rolesQueryKeys, rolesService } from "@/features/roles/Roles.service";
import type { UserFormValues, UserListItem } from "@/features/users/Users.types";
import {
  USER_FORM_LIMITS,
  toUserFormValues,
  userFormApiFieldMap,
  userFormApiMessageFieldMap,
  userFormSchema,
} from "@/features/users/schemas/Users.schema";
import { mapApiErrorToForm } from "@/shared/api/client";
import { Button, Input, Modal, Select } from "@/shared/components/ui";

type UserFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialUser?: UserListItem | null;
  loading?: boolean;
  apiError?: unknown;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
};

export function UserFormModal({
  isOpen,
  mode,
  initialUser,
  loading = false,
  apiError,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const { control, handleSubmit, reset, setError, clearErrors } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toUserFormValues(null),
  });

  const apiFormError = mapApiErrorToForm(apiError, userFormApiFieldMap, userFormApiMessageFieldMap);
  const rolesQuery = useQuery({
    queryKey: rolesQueryKeys.list(),
    queryFn: ({ signal }) => rolesService.getAll(signal),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      reset(toUserFormValues(initialUser));
      return;
    }

    reset(toUserFormValues(null));
  }, [initialUser, isOpen, reset]);

  const submitForm = async (values: UserFormValues) => {
    if (values.roleName.trim().length === 0) {
      setError("roleName", {
        type: "manual",
        message: "Selecciona un rol para el usuario.",
      });
      return;
    }

    if (mode === "create" && values.password.length === 0) {
      setError("password", {
        type: "manual",
        message: "La contrasena es obligatoria.",
      });
      return;
    }

    clearErrors(["roleName", "password"]);
    await onSubmit(values);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onClose}
      title={mode === "create" ? "Crear usuario" : "Editar usuario"}
      maxWidthClassName="max-w-lg"
    >
      <form className="space-y-5" onSubmit={handleSubmit(submitForm)}>
        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700">
              <User2 size={18} />
            </span>
            <div>
              <p className="text-base font-semibold text-slate-900">
                {mode === "create" ? "Nuevo usuario" : "Ajustar usuario"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Administra la informacion base de la cuenta.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  label="Nombre del usuario"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  leftIcon={<User2 size={14} />}
                  placeholder="Juan Perez"
                  maxLength={USER_FORM_LIMITS.name}
                  error={fieldState.error?.message ?? apiFormError.fieldErrors.name}
                  disabled={loading}
                  className="bg-slate-100"
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  label="Correo"
                  type="email"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  leftIcon={<Mail size={14} />}
                  placeholder="usuario@scoreblaze.com"
                  error={fieldState.error?.message ?? apiFormError.fieldErrors.email}
                  disabled={loading}
                  className="bg-slate-100"
                />
              )}
            />

            <Controller
              name="roleName"
              control={control}
              render={({ field, fieldState }) => (
                <Select
                  label="Rol"
                  value={field.value}
                  onChange={(event) => {
                    clearErrors("roleName");
                    field.onChange(event);
                  }}
                  onBlur={field.onBlur}
                  error={
                    fieldState.error?.message
                    ?? apiFormError.fieldErrors.roleName
                    ?? (rolesQuery.error instanceof Error ? rolesQuery.error.message : undefined)
                  }
                  disabled={loading || rolesQuery.isLoading}
                  className="bg-slate-100"
                >
                  <option value="">
                    {rolesQuery.isLoading ? "Cargando roles..." : "Selecciona un rol"}
                  </option>
                  {(rolesQuery.data ?? []).map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  label={mode === "create" ? "Contrasena" : "Nueva contrasena"}
                  type="password"
                  value={field.value}
                  onChange={(event) => {
                    clearErrors("password");
                    field.onChange(event);
                  }}
                  onBlur={field.onBlur}
                  leftIcon={<LockKeyhole size={14} />}
                  placeholder={mode === "create" ? "Minimo 8 caracteres" : "Dejar vacia para conservar"}
                  maxLength={USER_FORM_LIMITS.password}
                  hint={mode === "edit" ? "Si la dejas vacia, la contrasena actual se conserva." : undefined}
                  error={fieldState.error?.message ?? apiFormError.fieldErrors.password}
                  disabled={loading}
                  className="bg-slate-100"
                />
              )}
            />
          </div>
        </div>

        {apiFormError.globalMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiFormError.globalMessage}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="secondary" type="submit" disabled={loading}>
            {loading ? "Guardando..." : mode === "create" ? "Crear" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
