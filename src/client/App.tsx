import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/Toast";
import { LoginPage } from "./pages/LoginPage";
import { DashboardLayout } from "./layout/DashboardLayout";
import { OverviewPage } from "./pages/OverviewPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { EmptyProjectsPage } from "./pages/EmptyProjectsPage";

function Guard({ children }: { children: ReactNode }) {
  const { loading, username } = useAuth();
  if (loading) {
    return (
      <div className="login-wrap">
        <p style={{ color: "#737373" }}>Loading FormRelay…</p>
      </div>
    );
  }
  if (!username) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { username } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={username ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <Guard>
            <DashboardLayout />
          </Guard>
        }
      >
        <Route index element={<EmptyProjectsPage />} />
        <Route path="p/:projectId" element={<OverviewPage />} />
        <Route path="p/:projectId/submissions" element={<SubmissionsPage />} />
        <Route path="p/:projectId/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}
