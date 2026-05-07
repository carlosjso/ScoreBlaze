import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, Mail, User2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import type { AuthMode, LoginFormValues, RegisterFormValues } from "@/features/auth/Auth.types";
import {
  authLoginFieldMap,
  authLoginMessageFieldMap,
  authRegisterFieldMap,
  authRegisterMessageFieldMap,
  loginFormSchema,
  registerFormSchema,
} from "@/features/auth/schemas/Auth.schema";
import { mapApiErrorToForm } from "@/shared/api/client";
import { Button, Input } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type AuthPageProps = {
  mode: AuthMode;
};

function AuthPanelFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#191919] p-3 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1280px] overflow-hidden rounded-[30px] border border-white/10 bg-[#f6f8fb] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:min-h-[calc(100vh-2.5rem)]">
        {children}
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative hidden flex-1 overflow-hidden border-r border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),rgba(233,241,251,0.92)_42%,rgba(210,223,242,0.95)_100%)] lg:flex">
      <img
        src="/ScoreBlazeLogoFull.png"
        alt="ScoreBlaze"
        className="absolute left-10 top-8 h-10 w-auto object-contain"
      />

      <div className="absolute inset-y-0 left-[54%] w-[150px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(160,255,170,0.55)_0%,rgba(255,240,160,0.48)_30%,rgba(255,170,120,0.42)_60%,rgba(170,205,255,0.44)_100%)] blur-3xl" />
      <div className="absolute -left-16 bottom-0 h-[430px] w-[430px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0)_68%)]" />
      <div className="absolute right-16 top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0)_72%)]" />

      <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
        <div className="max-w-[420px]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">Control de acceso</p>
          <h1 className="mt-4 text-[42px] leading-[0.98] text-slate-950">
            Bienvenido a la cabina de control de ScoreBlaze
          </h1>
          <p className="mt-5 max-w-[360px] text-sm leading-6 text-slate-600">
            Administra partidos, jugadores, equipos y marcador en tiempo real desde una sola sesión segura.
          </p>
        </div>

        <div className="relative mt-10 flex min-h-[420px] items-end">
          <div className="absolute bottom-10 left-20 h-[250px] w-[250px] rounded-full border-[10px] border-white/80 bg-[radial-gradient(circle_at_35%_30%,#ffb26a_0%,#f97316_58%,#c24e06_100%)] shadow-[0_28px_60px_rgba(249,115,22,0.3)]">
            <span className="absolute inset-y-0 left-1/2 w-[9px] -translate-x-1/2 rounded-full bg-[#5a2400]/50" />
            <span className="absolute inset-x-[14%] top-1/2 h-[9px] -translate-y-1/2 rounded-full bg-[#5a2400]/50" />
            <span className="absolute inset-y-[10%] left-[18%] right-[18%] rounded-[50%] border-[8px] border-[#5a2400]/45" />
            <span className="absolute inset-x-[16%] bottom-[12%] top-[12%] rounded-[50%] border-[8px] border-[#5a2400]/45" />
          </div>

          <div className="relative ml-6 flex h-[360px] w-[360px] items-end justify-center rounded-[48px] bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0))]">
            <img
              src="/ScoreBlazeImageLogin.png"
              alt="ScoreBlaze mark"
              className="h-[280px] w-[280px] -rotate-6 object-contain drop-shadow-[0_25px_40px_rgba(15,23,42,0.28)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthTabs({ mode }: { mode: AuthMode }) {
  const linkBase =
    "inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold transition";

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        to="/login"
        className={cn(
          linkBase,
          mode === "login" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-200/70",
        )}
      >
        Iniciar
      </Link>
      <Link
        to="/register"
        className={cn(
          linkBase,
          mode === "register" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-200/70",
        )}
      >
        Registrar
      </Link>
    </div>
  );
}

export default function AuthPage({ mode }: AuthPageProps) {
  return mode === "login" ? <LoginView /> : <RegisterView />;
}

function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [apiError, setApiError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const formError = mapApiErrorToForm(apiError, authLoginFieldMap, authLoginMessageFieldMap);

  const handleLogin = async (values: LoginFormValues) => {
    setApiError(null);
    setSubmitting(true);

    try {
      await login(values);
      const from =
        typeof location.state === "object" &&
        location.state !== null &&
        "from" in location.state &&
        typeof location.state.from === "string"
          ? location.state.from
          : "/dashboard";

      navigate(from, { replace: true });
    } catch (error) {
      setApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPanelFrame>
      <HeroSection />

      <section className="flex w-full flex-col justify-center bg-[linear-gradient(180deg,#eef4fb_0%,#dbe6f4_100%)] px-6 py-8 sm:px-10 lg:w-[420px] xl:w-[470px]">
        <AuthTabs mode="login" />

        <div className="mx-auto mt-10 w-full max-w-[320px]">
          <p className="text-center text-3xl font-semibold text-slate-950">Bienvenido</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit(handleLogin)}>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="Usuario"
                  leftIcon={<Mail size={14} />}
                  error={fieldState.error?.message ?? formError.fieldErrors.email}
                  disabled={submitting}
                  className="rounded-lg border-slate-200 bg-white/78"
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="Contraseña"
                  leftIcon={<LockKeyhole size={14} />}
                  error={fieldState.error?.message ?? formError.fieldErrors.password}
                  disabled={submitting}
                  className="rounded-lg border-slate-200 bg-white/78"
                />
              )}
            />

            <div className="flex justify-end">
              <button
                type="button"
                className="text-[11px] font-medium text-slate-500 transition hover:text-slate-700"
                disabled
              >
                ¿Olvidaste la contraseña?
              </button>
            </div>

            {formError.globalMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError.globalMessage}
              </div>
            ) : null}

            <Button
              variant="secondary"
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-slate-950 py-3 text-sm text-white hover:bg-black"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
              <span className="h-px flex-1 bg-slate-400/50" />
              <span>O continúa con</span>
              <span className="h-px flex-1 bg-slate-400/50" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500 opacity-70"
              >
                G
              </button>
              <button
                type="button"
                disabled
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500 opacity-70"
              >
                f
              </button>
            </div>
          </div>

          <p className="mt-7 text-center text-xs text-slate-600">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="font-semibold text-slate-900 no-underline transition hover:text-orange-600">
              Regístrate
            </Link>
          </p>
        </div>
      </section>
    </AuthPanelFrame>
  );
}

function RegisterView() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [apiError, setApiError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const formError = mapApiErrorToForm(apiError, authRegisterFieldMap, authRegisterMessageFieldMap);

  const handleRegister = async (values: RegisterFormValues) => {
    setApiError(null);
    setSubmitting(true);

    try {
      await register(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPanelFrame>
      <HeroSection />

      <section className="flex w-full flex-col justify-center bg-[linear-gradient(180deg,#eef4fb_0%,#dbe6f4_100%)] px-6 py-8 sm:px-10 lg:w-[420px] xl:w-[470px]">
        <AuthTabs mode="register" />

        <div className="mx-auto mt-8 w-full max-w-[340px]">
          <p className="text-center text-3xl font-semibold text-slate-950">Crear cuenta</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit(handleRegister)}>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  placeholder="Nombre completo"
                  leftIcon={<User2 size={14} />}
                  error={fieldState.error?.message ?? formError.fieldErrors.name}
                  disabled={submitting}
                  className="rounded-lg border-slate-200 bg-white/78"
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="Correo"
                  leftIcon={<Mail size={14} />}
                  error={fieldState.error?.message ?? formError.fieldErrors.email}
                  disabled={submitting}
                  className="rounded-lg border-slate-200 bg-white/78"
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="Contraseña"
                  leftIcon={<LockKeyhole size={14} />}
                  error={fieldState.error?.message ?? formError.fieldErrors.password}
                  disabled={submitting}
                  className="rounded-lg border-slate-200 bg-white/78"
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="Confirmar contraseña"
                  leftIcon={<LockKeyhole size={14} />}
                  error={fieldState.error?.message}
                  disabled={submitting}
                  className="rounded-lg border-slate-200 bg-white/78"
                />
              )}
            />

            {formError.globalMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError.globalMessage}
              </div>
            ) : null}

            <Button
              variant="secondary"
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-slate-950 py-3 text-sm text-white hover:bg-black"
            >
              {submitting ? "Creando..." : "Registrar"}
            </Button>
          </form>

          <p className="mt-7 text-center text-xs text-slate-600">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold text-slate-900 no-underline transition hover:text-orange-600">
              Inicia sesión
            </Link>
          </p>

          <div className="mt-8 rounded-2xl border border-white/60 bg-white/55 px-4 py-4 text-xs leading-5 text-slate-600 backdrop-blur">
            Tu cuenta se registra con sesión persistida por cookie y cierre automático por inactividad.
            <span className="mt-2 inline-flex items-center gap-1 font-semibold text-slate-900">
              Listo para equipos, jugadores y marcador
              <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </section>
    </AuthPanelFrame>
  );
}
