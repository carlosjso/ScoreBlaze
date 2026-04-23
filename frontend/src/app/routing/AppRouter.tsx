import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "@/app/layouts/AppLayout";
import { routes } from "@/app/routing/routes";

export const AppRouter = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/sports" element={<Navigate to="/dashboard" replace />} />
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
