import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setCsrfToken } from "../api";

type AuthState = {
  loading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    api<{ username: string; csrfToken: string }>("/api/auth/me")
      .then((data) => {
        setUsername(data.username);
        if (data.csrfToken) setCsrfToken(data.csrfToken);
      })
      .catch(() => setUsername(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      username,
      async login(user, password) {
        const data = await api<{ csrfToken: string }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username: user, password }),
        });
        setCsrfToken(data.csrfToken);
        setUsername(user);
      },
      async logout() {
        await api("/api/auth/logout", { method: "POST" });
        setCsrfToken("");
        setUsername(null);
      },
    }),
    [loading, username],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
