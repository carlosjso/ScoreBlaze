import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { getFirstAllowedPath, hasAllPermissions } from "@/features/auth/permissions";

function AuthScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#161616] px-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm font-medium text-white/80 shadow-2xl backdrop-blur">
        Cargando sesión...
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const location = useLocation();
  const { loading, session } = useAuth();

  if (loading) {
    return <AuthScreenLoader />;
  }

  if (!session) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}

function AccessDenied() {
  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[920px]">
        <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-sm">
          <p className="text-sm font-semibold">No tienes acceso a esta seccion.</p>
          <p className="mt-1 text-sm text-red-700">Pide a un administrador que revise los permisos de tu rol.</p>
        </section>
      </div>
    </div>
  );
}

export function PermissionRoute({ permissions }: { permissions: readonly string[] }) {
  const { session } = useAuth();
  const location = useLocation();

  if (!hasAllPermissions(session, permissions)) {
    const firstAllowedPath = getFirstAllowedPath(session);
    if (firstAllowedPath && firstAllowedPath !== location.pathname) {
      return <Navigate to={firstAllowedPath} replace />;
    }

    return <AccessDenied />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { loading, session } = useAuth();

  if (loading) {
    return <AuthScreenLoader />;
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
