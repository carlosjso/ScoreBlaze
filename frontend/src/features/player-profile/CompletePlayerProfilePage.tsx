import { LockKeyhole, Mail, Ruler, ShieldCheck, User2, Weight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  accountInvitationService,
  type AccountInvitation,
} from "@/features/player-profile/PlayerProfileInvitation.service";
import { getApiGlobalErrorMessage } from "@/shared/api/client";
import { Button, Input } from "@/shared/components/ui";

type FormState = {
  password: string;
  confirmPassword: string;
  phone: string;
  age: string;
  heightCm: string;
  weightKg: string;
  nationality: string;
  favoritePosition: string;
};

const emptyForm: FormState = {
  password: "",
  confirmPassword: "",
  phone: "",
  age: "",
  heightCm: "",
  weightKg: "",
  nationality: "",
  favoritePosition: "",
};

function optionalNumber(value: string) {
  return value.trim() ? Number(value.trim()) : null;
}

export default function CompletePlayerProfilePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [invitation, setInvitation] = useState<AccountInvitation | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    if (!token) {
      setInvitationError("El enlace de invitacion no tiene token.");
      setLoadingInvitation(false);
      return () => controller.abort();
    }

    setLoadingInvitation(true);
    setInvitationError(null);
    accountInvitationService
      .validate(token, controller.signal)
      .then(setInvitation)
      .catch((error) => {
        setInvitationError(getApiGlobalErrorMessage(error, "La invitacion no es valida o ya expiro."));
      })
      .finally(() => setLoadingInvitation(false));

    return () => controller.abort();
  }, [token]);

  const canSubmit = useMemo(() => Boolean(invitation && !completed && !loadingInvitation), [completed, invitation, loadingInvitation]);
  const requiresPlayerProfile = invitation?.requiresPlayerProfile ?? false;

  const updateField = (fieldName: keyof FormState, value: string) => {
    setFormError(null);
    setForm((current) => ({ ...current, [fieldName]: value }));
  };

  const submitProfile = async () => {
    if (!canSubmit) {
      return;
    }

    const password = form.password.trim();
    if (password.length < 8) {
      setFormError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== form.confirmPassword.trim()) {
      setFormError("Las contrasenas no coinciden.");
      return;
    }

    if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) {
      setFormError("El telefono debe tener 10 digitos.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await accountInvitationService.complete({
        token,
        password,
        phone: requiresPlayerProfile ? form.phone.trim() || null : null,
        age: requiresPlayerProfile ? optionalNumber(form.age) : null,
        height_cm: requiresPlayerProfile ? optionalNumber(form.heightCm) : null,
        weight_kg: requiresPlayerProfile ? optionalNumber(form.weightKg) : null,
        nationality: requiresPlayerProfile ? form.nationality.trim() || null : null,
        favorite_position: requiresPlayerProfile ? form.favoritePosition.trim() || null : null,
        photo_base64: null,
      });
      setCompleted(true);
    } catch (error) {
      setFormError(getApiGlobalErrorMessage(error, "No se pudo completar el perfil."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[960px] items-center justify-center">
        <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.14)]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <section className="bg-slate-950 px-8 py-10 text-white">
              <img src="/ScoreBlazeLogoFull.png" alt="ScoreBlaze" className="h-12 w-auto object-contain" />
              <div className="mt-16">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                  <ShieldCheck size={24} />
                </span>
                <h1 className="mt-5 text-4xl font-semibold leading-tight">Completa tu invitacion</h1>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  Valida tu cuenta, crea tu contrasena y deja listo tu acceso a ScoreBlaze.
                </p>
              </div>
            </section>

            <section className="px-6 py-8 sm:px-10">
              {loadingInvitation ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Validando invitacion...
                </div>
              ) : invitationError ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                    {invitationError}
                  </div>
                  <Link to="/login" className="inline-flex no-underline">
                    <Button variant="secondary">Ir a iniciar sesion</Button>
                  </Link>
                </div>
              ) : completed ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                    Tu cuenta quedo activa. Ya puedes iniciar sesion con tu correo.
                  </div>
                  <Link to="/login" className="inline-flex no-underline">
                    <Button variant="secondary">Iniciar sesion</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Invitacion para</p>
                    <h2 className="mt-1 text-3xl font-semibold text-slate-950">{invitation?.name}</h2>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                      <Mail size={14} />
                      {invitation?.email}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Rol: {invitation?.role === "coach" ? "Coach" : invitation?.role === "jugador" ? "Jugador" : invitation?.role}
                    </p>
                    {invitation?.teamName ? (
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        Equipo: {invitation.teamName}
                      </p>
                    ) : null}
                  </div>

                  {formError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Contrasena"
                      type="password"
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      leftIcon={<LockKeyhole size={14} />}
                      placeholder="Minimo 8 caracteres"
                      disabled={submitting}
                      className="bg-slate-100"
                    />
                    <Input
                      label="Confirmar contrasena"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => updateField("confirmPassword", event.target.value)}
                      leftIcon={<LockKeyhole size={14} />}
                      placeholder="Repite tu contrasena"
                      disabled={submitting}
                      className="bg-slate-100"
                    />
                    {requiresPlayerProfile ? (
                      <>
                        <Input
                          label="Telefono"
                          value={form.phone}
                          onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 10))}
                          leftIcon={<User2 size={14} />}
                          placeholder="7717777344"
                          inputMode="numeric"
                          disabled={submitting}
                          className="bg-slate-100"
                        />
                        <Input
                          label="Edad"
                          value={form.age}
                          onChange={(event) => updateField("age", event.target.value.replace(/\D/g, "").slice(0, 2))}
                          placeholder="18"
                          inputMode="numeric"
                          disabled={submitting}
                          className="bg-slate-100"
                        />
                        <Input
                          label="Estatura cm"
                          value={form.heightCm}
                          onChange={(event) => updateField("heightCm", event.target.value.replace(/\D/g, "").slice(0, 3))}
                          leftIcon={<Ruler size={14} />}
                          placeholder="180"
                          inputMode="numeric"
                          disabled={submitting}
                          className="bg-slate-100"
                        />
                        <Input
                          label="Peso kg"
                          value={form.weightKg}
                          onChange={(event) => updateField("weightKg", event.target.value.replace(/\D/g, "").slice(0, 3))}
                          leftIcon={<Weight size={14} />}
                          placeholder="75"
                          inputMode="numeric"
                          disabled={submitting}
                          className="bg-slate-100"
                        />
                        <Input
                          label="Nacionalidad"
                          value={form.nationality}
                          onChange={(event) => updateField("nationality", event.target.value)}
                          placeholder="Mexicana"
                          disabled={submitting}
                          className="bg-slate-100"
                        />
                        <Input
                          label="Posicion favorita"
                          value={form.favoritePosition}
                          onChange={(event) => updateField("favoritePosition", event.target.value)}
                          placeholder="Base"
                          disabled={submitting}
                          className="bg-slate-100"
                        />
                      </>
                    ) : null}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={() => void submitProfile()} disabled={submitting}>
                      {submitting ? "Guardando..." : "Completar invitacion"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
