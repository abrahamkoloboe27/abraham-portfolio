import { createContext, use, useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, http, tokens } from "@/lib/api";
import { ROLE_LEVEL, type Role, type TokenPair, type User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** True when the signed-in user's role is at least `role`. */
  can: (role: Role) => boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(() => Boolean(tokens.access()));

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => http.get<User>("/admin/auth/me"),
    enabled: authenticated,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 2,
    staleTime: 5 * 60 * 1000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const pair = await http.public<TokenPair>("/admin/auth/login", { email, password });
      tokens.set(pair.access_token, pair.refresh_token);
      setAuthenticated(true);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokens.refresh();
    if (refreshToken) {
      // Best effort: a failed revoke must not keep the user stuck in the console.
      await http.post("/admin/auth/logout", { refresh_token: refreshToken }).catch(() => undefined);
    }
    tokens.clear();
    setAuthenticated(false);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const user = authenticated ? (data ?? null) : null;
    return {
      user,
      loading: authenticated && isLoading,
      login,
      logout,
      can: (role) => (user ? ROLE_LEVEL[user.role] >= ROLE_LEVEL[role] : false),
      refresh: () => void queryClient.invalidateQueries({ queryKey: ["me"] }),
    };
  }, [authenticated, data, isLoading, login, logout, queryClient]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

// The hook lives beside its provider on purpose; splitting it into another file
// only to satisfy fast-refresh would scatter tightly coupled code.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return context;
}
