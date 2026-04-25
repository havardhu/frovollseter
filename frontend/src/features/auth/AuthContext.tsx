import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAccessToken } from "@/api/client";
import type { CurrentUser } from "@/api/types";

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  requestMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<boolean>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState & AuthActions | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const me = await api.get<CurrentUser>("/auth/me");
    setUser(me);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("access_token");
    if (stored) {
      setAccessToken(stored);
      fetchMe()
        .catch(() => {
          sessionStorage.removeItem("access_token");
          setAccessToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchMe]);

  const storeToken = useCallback((token: string) => {
    sessionStorage.setItem("access_token", token);
    setAccessToken(token);
  }, []);

  const requestMagicLink = async (email: string) => {
    await api.post("/auth/request-magic-link", { email });
  };

  const verifyMagicLink = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await api.post<{ accessToken: string }>("/auth/verify-magic-link", { token });
      storeToken(res.accessToken);
      await fetchMe();
      return true;
    } catch {
      return false;
    }
  }, [fetchMe, storeToken]);

  const requestOtp = async (email: string) => {
    await api.post("/auth/request-otp", { email });
  };

  const verifyOtp = useCallback(async (email: string, code: string): Promise<boolean> => {
    try {
      const res = await api.post<{ accessToken: string }>("/auth/verify-otp", { email, code });
      storeToken(res.accessToken);
      await fetchMe();
      return true;
    } catch {
      return false;
    }
  }, [fetchMe, storeToken]);

  const logout = async () => {
    await api.post("/auth/logout");
    sessionStorage.removeItem("access_token");
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        requestMagicLink,
        verifyMagicLink,
        requestOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
