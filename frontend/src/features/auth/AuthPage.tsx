import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Mail, User2 } from "lucide-react";
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

type AuthPanelFrameProps = {
  mode: AuthMode;
  children: ReactNode;
};

type SocialButtonProps = {
  icon: ReactNode;
};

function AuthPanelFrame({ mode, children }: AuthPanelFrameProps) {
  return (
    <div className="min-h-screen bg-[#1b1b1b] p-3 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1160px] overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#f8fbfe_0%,#e8f0fa_52%,#dce8f6_100%)] shadow-[0_32px_90px_rgba(0,0,0,0.34)] sm:min-h-[calc(100vh-3rem)]">
        <HeroSection />
        <section className="relative flex w-full flex-col justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(237,244,253,0.12)_0%,rgba(219,230,244,0.22)_100%)] px-7 py-9 sm:px-10 lg:w-[355px] xl:w-[390px] xl:px-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),rgba(255,255,255,0)_72%)]" />
          <div className="absolute inset-x-7 top-7 z-10 sm:inset-x-10 sm:top-8">
            <div className="mx-auto w-full max-w-[352px]">
              <AuthTabs />
            </div>
          </div>
          <div className="relative z-10 mx-auto w-full max-w-[352px]">{children}</div>
        </section>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative hidden flex-1 overflow-hidden lg:flex">
      <img
        src="/ScoreBlazeLogoFull.png"
        alt="ScoreBlaze"
        className="absolute left-14 top-8 h-11 w-auto object-contain"
      />

      <div className="absolute inset-y-0 left-[57%] w-[165px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(175,255,178,0.44)_0%,rgba(255,244,155,0.46)_24%,rgba(255,193,139,0.44)_52%,rgba(173,212,255,0.36)_100%)] blur-[46px]" />
      <div className="absolute inset-y-0 left-[57%] w-[68px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(149,255,173,0.76)_0%,rgba(255,243,170,0.74)_26%,rgba(255,191,133,0.74)_55%,rgba(185,220,255,0.56)_100%)] opacity-90 blur-[14px]" />
      <div className="absolute right-10 top-[22%] h-24 w-[38%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0)_72%)] blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,rgba(214,226,243,0)_0%,rgba(210,223,241,0.7)_100%)]" />

      <div className="relative z-10 h-full w-full">
        <img
          src="/ScoreBlazeImageLogin.png"
          alt="Jugador de ScoreBlaze"
          className="pointer-events-none absolute bottom-[-18%] left-[5%] h-[108%] w-auto max-w-none object-contain xl:bottom-[-19%] xl:left-[7%] xl:h-[112%]"
        />
      </div>
    </section>
  );
}

function AuthTabs() {
  return (
    <div className="flex items-center justify-end gap-3">
      <Link
        to="/login"
        className={cn("relative inline-flex items-center px-2 py-1 text-sm font-semibold no-underline transition text-slate-950")}
      >
        Iniciar
        <span className="absolute -bottom-1 left-2 right-2 h-[2px] rounded-full bg-slate-950" />
      </Link>
    </div>
  );
}

function SocialButton({ icon }: SocialButtonProps) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex h-11 items-center justify-center rounded-[10px] border border-white/70 bg-white shadow-[0_10px_18px_rgba(148,163,184,0.12)]"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center">{icon}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.227 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.96 3.04l5.657-5.657C34.046 6.053 29.272 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.96 3.04l5.657-5.657C34.046 6.053 29.272 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083 43.595 20 24 20v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073c0 6.026 4.388 11.021 10.125 11.927V15.562H7.078v-3.489h3.047V9.41c0-3.017 1.792-4.686 4.533-4.686 1.312 0 2.686.235 2.686.235V7.92h-1.513c-1.491 0-1.955.931-1.955 1.887v2.266h3.328l-.532 3.489h-2.796V24C19.612 23.094 24 18.099 24 12.073Z"
      />
      <path
        fill="#FFFFFF"
        d="m16.672 15.562.532-3.489h-3.328V9.807c0-.956.464-1.887 1.955-1.887h1.513V4.959s-1.374-.235-2.686-.235c-2.741 0-4.533 1.669-4.533 4.686v2.663H7.078v3.489h3.047V24a12.15 12.15 0 0 0 3.75 0v-8.438h2.797Z"
      />
    </svg>
  );
}

function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-16 sm:mt-14">
      <h1 className="text-center text-[30px] font-semibold tracking-tight text-slate-950 sm:text-[32px]">
        {title}
      </h1>
      {children}
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
    <AuthPanelFrame mode="login">
      <AuthCard title="Bienvenido">
        <form className="mt-10 space-y-4" onSubmit={handleSubmit(handleLogin)}>
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
                className="h-[44px] rounded-[8px] border-slate-200 bg-white/92 text-[15px] shadow-none"
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
                placeholder="Contrasena"
                leftIcon={<LockKeyhole size={14} />}
                error={fieldState.error?.message ?? formError.fieldErrors.password}
                disabled={submitting}
                className="h-[44px] rounded-[8px] border-slate-200 bg-white/92 text-[15px] shadow-none"
              />
            )}
          />

          <div className="flex justify-end">
            <button
              type="button"
              className="text-[12px] font-medium text-slate-500 transition hover:text-slate-700"
              disabled
            >
              Olvidaste la Contrasena?
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
            className="mt-4 h-[48px] w-full rounded-[8px] bg-slate-950 text-[15px] text-white hover:bg-black"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-7">
          <div className="flex items-center gap-3 text-[12px] font-medium text-slate-500">
            <span className="h-px flex-1 bg-slate-400/55" />
            <span>O Continua Con</span>
            <span className="h-px flex-1 bg-slate-400/55" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <SocialButton icon={<GoogleIcon />} />
            <SocialButton icon={<FacebookIcon />} />
          </div>
        </div>

        <p className="mt-9 text-center text-[13px] leading-6 text-slate-600">
          El acceso se habilita por invitacion. Si todavia no tienes cuenta, pide a un administrador que te comparta tu enlace.
        </p>
      </AuthCard>
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
    <AuthPanelFrame mode="register">
      <AuthCard title="Crear cuenta">
        <form className="mt-10 space-y-4" onSubmit={handleSubmit(handleRegister)}>
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
                className="h-[44px] rounded-[8px] border-slate-200 bg-white/92 text-[15px] shadow-none"
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
                className="h-[44px] rounded-[8px] border-slate-200 bg-white/92 text-[15px] shadow-none"
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
                placeholder="Contrasena"
                leftIcon={<LockKeyhole size={14} />}
                error={fieldState.error?.message ?? formError.fieldErrors.password}
                disabled={submitting}
                className="h-[44px] rounded-[8px] border-slate-200 bg-white/92 text-[15px] shadow-none"
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
                placeholder="Confirmar contrasena"
                leftIcon={<LockKeyhole size={14} />}
                error={fieldState.error?.message}
                disabled={submitting}
                className="h-[44px] rounded-[8px] border-slate-200 bg-white/92 text-[15px] shadow-none"
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
            className="mt-4 h-[48px] w-full rounded-[8px] bg-slate-950 text-[15px] text-white hover:bg-black"
          >
            {submitting ? "Creando..." : "Registrar"}
          </Button>
        </form>

        <p className="mt-9 text-center text-[13px] text-slate-600">
          Ya Tienes Cuenta?{" "}
          <Link to="/login" className="font-semibold text-slate-950 no-underline transition hover:text-orange-600">
            Inicia sesion
          </Link>
        </p>
      </AuthCard>
    </AuthPanelFrame>
  );
}
