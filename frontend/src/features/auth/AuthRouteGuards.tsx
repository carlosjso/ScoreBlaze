import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";

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
