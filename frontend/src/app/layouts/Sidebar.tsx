import { Bell, Menu, Settings, UserCircle2, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type SidebarRoute = {
  path: string;
  label: string;
  icon: ReactNode;
};

type SidebarProps = {
  routes: SidebarRoute[];
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
};

const linkBase = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const linkIdle = "text-slate-600 hover:bg-slate-100";
const linkActive = "bg-orange-50 text-orange-700";
const collapsedTooltipClass =
  "pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-sm transition-opacity duration-150";

export default function Sidebar({ routes, open, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-label="Cerrar menu"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[248px] flex-col border-r border-slate-300 bg-slate-50/95 px-3 py-4 shadow-md backdrop-blur transition-all duration-200",
          collapsed ? "lg:w-[68px] lg:px-1" : "lg:w-[248px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "mb-4 flex min-h-[64px] items-center border-b border-slate-200 pb-3",
            collapsed ? "justify-center" : "justify-between px-1"
          )}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden items-center justify-center lg:inline-flex"
              title="Expandir menu"
              aria-label="Expandir menu"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50">
                <img src="/ScoreBlazeLogoMark.png" alt="S de ScoreBlaze" className="h-6 w-6 object-contain" />
              </span>
            </button>
          ) : (
            <Link to="/dashboard" onClick={onClose} className="flex min-w-0 items-center gap-2 no-underline">
              <img src="/ScoreBlazeLogoMark.png" alt="S de ScoreBlaze" className="h-10 w-10 object-contain" />
              <span className="truncate text-xl font-semibold leading-none tracking-tight text-slate-900">ScoreBlaze</span>
            </Link>
          )}

          <div className={cn("flex items-center gap-1", collapsed ? "lg:hidden" : "")}>
            {!collapsed ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:inline-flex"
                title="Contraer menu"
                aria-label="Contraer menu"
              >
                <Menu size={16} />
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
              onClick={onClose}
              aria-label="Cerrar menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {routes.length ? (
          <nav className={cn("space-y-1", collapsed ? "lg:flex lg:flex-col lg:items-center" : "")}>
            {routes.map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                onClick={onClose}
                title={route.label}
                className={({ isActive }) =>
                  cn(
                    "group relative",
                    linkBase,
                    isActive ? linkActive : linkIdle,
                    collapsed ? "lg:mx-auto lg:h-10 lg:w-10 lg:justify-center lg:gap-0 lg:px-0" : "justify-start pl-4"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-r-full bg-orange-500 transition-opacity lg:block",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {route.icon}
                    <span className={cn(collapsed ? "lg:hidden" : "")}>{route.label}</span>
                    {collapsed ? (
                      <span className={cn(collapsedTooltipClass, "lg:block lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100")}>
                        {route.label}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        ) : null}

        <div className={cn("mt-auto space-y-1 pt-6", collapsed ? "lg:flex lg:flex-col lg:items-center" : "")}>
          <button
            type="button"
            className={cn(
              "group relative",
              linkBase,
              linkIdle,
              collapsed ? "lg:mx-auto lg:h-10 lg:w-10 lg:justify-center lg:gap-0 lg:px-0" : "w-full justify-start pl-4"
            )}
            title="Setting"
          >
            <Settings size={16} />
            <span className={cn(collapsed ? "lg:hidden" : "")}>Setting</span>
            {collapsed ? (
              <span className={cn(collapsedTooltipClass, "lg:block lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100")}>
                Setting
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className={cn(
              "group relative",
              linkBase,
              linkIdle,
              collapsed ? "lg:mx-auto lg:h-10 lg:w-10 lg:justify-center lg:gap-0 lg:px-0" : "w-full justify-start pl-4"
            )}
            title="Notifications"
          >
            <Bell size={16} />
            <span className={cn(collapsed ? "lg:hidden" : "")}>Notifications</span>
            {collapsed ? (
              <span className={cn(collapsedTooltipClass, "lg:block lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100")}>
                Notifications
              </span>
            ) : null}
          </button>

          {collapsed ? (
            <div className="mt-3 hidden justify-center lg:flex">
              <div className="rounded-xl border border-slate-200 bg-white p-1.5">
                <UserCircle2 size={26} className="text-slate-500" />
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
              <UserCircle2 size={26} className="text-slate-500" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-700">Culaccino_</p>
                <p className="truncate text-[11px] text-slate-500">UX Designer</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
