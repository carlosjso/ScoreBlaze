import {
  KeyRound,
  Link2,
  ShieldCheck,
  UserCog,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type ShortcutItem = {
  title: string;
  description: string;
  icon: ReactNode;
  accentClassName: string;
  to?: string;
};

const shortcutItems: ShortcutItem[] = [
  {
    title: "Roles",
    description: "Estructura base para perfiles de acceso.",
    icon: <ShieldCheck size={18} />,
    accentClassName: "from-orange-100 via-white to-orange-50 text-orange-700 border-orange-200",
    to: "/settings/roles",
  },
  {
    title: "Permisos",
    description: "Catalogo visual de acciones disponibles.",
    icon: <KeyRound size={18} />,
    accentClassName: "from-sky-100 via-white to-sky-50 text-sky-700 border-sky-200",
  },
  {
    title: "Roles por permiso",
    description: "Relacion visual entre roles y acciones.",
    icon: <Link2 size={18} />,
    accentClassName: "from-emerald-100 via-white to-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    title: "Usuarios",
    description: "Vista base para administrar cuentas.",
    icon: <UsersRound size={18} />,
    accentClassName: "from-violet-100 via-white to-violet-50 text-violet-700 border-violet-200",
  },
  {
    title: "Roles de usuario",
    description: "Asignacion final por usuario.",
    icon: <UserCog size={18} />,
    accentClassName: "from-rose-100 via-white to-rose-50 text-rose-700 border-rose-200",
  },
];

function ShortcutCard({ item }: { item: ShortcutItem }) {
  const className =
    "group rounded-[22px] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 text-left text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(15,23,42,0.08)]";

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
  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1380px]">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {shortcutItems.map((item) => (
            <ShortcutCard key={item.title} item={item} />
          ))}
        </section>
      </div>
    </div>
  );
}
