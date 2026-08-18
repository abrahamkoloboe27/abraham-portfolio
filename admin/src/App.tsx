import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { LoadingBlock } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { AcceptInvite, ResetPassword } from "@/pages/AcceptInvite";
import { Audit } from "@/pages/Audit";
import { Dashboard } from "@/pages/Dashboard";
import { ForgotPassword, Login } from "@/pages/Login";
import { Media } from "@/pages/Media";
import { Messages } from "@/pages/Messages";
import { ResourcePage } from "@/pages/ResourcePage";
import { Settings } from "@/pages/Settings";
import { Team } from "@/pages/Team";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingBlock label="Vérification de la session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingBlock />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <Login />
          </RedirectIfAuthenticated>
        }
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/r/:resourceKey" element={<ResourcePage />} />
        <Route path="/media" element={<Media />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/team" element={<Team />} />
        <Route path="/audit" element={<Audit />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
