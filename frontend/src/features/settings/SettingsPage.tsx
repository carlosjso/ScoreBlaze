import {
  KeyRound,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { hasAllPermissions } from "@/features/auth/permissions";

type ShortcutItem = {
  title: string;
  description: string;
  icon: ReactNode;
  accentClassName: string;
  to?: string;
  permissions: readonly string[];
};

const shortcutItems: ShortcutItem[] = [
  {
    title: "Roles",
    description: "Estructura base para perfiles de acceso.",
    icon: <ShieldCheck size={18} />,
    accentClassName: "from-orange-100 via-white to-orange-50 text-orange-700 border-orange-200",
    to: "/settings/roles",
    permissions: ["roles.view"],
  },
  {
    title: "Permisos",
    description: "Catalogo visual de acciones disponibles.",
    icon: <KeyRound size={18} />,
    accentClassName: "from-sky-100 via-white to-sky-50 text-sky-700 border-sky-200",
    to: "/settings/permissions",
    permissions: ["permissions.view"],
  },
  {
    title: "Permisos por rol",
    description: "Define que acciones puede realizar cada rol.",
    icon: <UserRoundCog size={18} />,
    accentClassName: "from-emerald-100 via-white to-emerald-50 text-emerald-700 border-emerald-200",
    to: "/settings/role-permissions",
    permissions: ["roles.view"],
  },
  {
    title: "Usuarios",
    description: "Vista base para administrar cuentas.",
    icon: <UsersRound size={18} />,
    accentClassName: "from-violet-100 via-white to-violet-50 text-violet-700 border-violet-200",
    to: "/settings/users",
    permissions: ["users.view"],
  },
];

function ShortcutCard({ item }: { item: ShortcutItem }) {
  const className =
    "group flex h-full w-full flex-col items-start rounded-[22px] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 text-left text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(15,23,42,0.08)] appearance-none";

  const content = (
    <>
      <div
        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border bg-[linear-gradient(135deg,var(--tw-gradient-from),var(--tw-gradient-via),var(--tw-gradient-to))] ${item.accentClassName}`}
      >
        {item.icon}
      </div>
      <h3 className="mt-5 text-[20px] font-semibold tracking-tight text-slate-950">
        {item.title}
      </h3>
      <p className="mt-3 text-sm leading-8 text-slate-500">{item.description}</p>
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} className={`${className} no-underline`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
    >
      {content}
    </button>
  );
}

export default function SettingsPage() {
  const { session } = useAuth();
  const visibleShortcuts = shortcutItems.filter((item) => hasAllPermissions(session, item.permissions));

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1380px]">
        {visibleShortcuts.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleShortcuts.map((item) => (
            <ShortcutCard key={item.title} item={item} />
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-sm">
            <p className="text-sm font-semibold">No tienes accesos de configuracion disponibles.</p>
            <p className="mt-1 text-sm text-red-700">Pide a un administrador que revise los permisos de tu rol.</p>
          </section>
        )}
      </div>
    </div>
  );
}
