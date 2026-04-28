import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAccessToken } from "@/api/client";
import type { CurrentUser } from "@/api/types";

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  requestMagicLink: (email: string, rememberMe?: boolean) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<boolean>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState & AuthActions | null>(null);

const TOKEN_KEY = "access_token";

function readStoredToken(): string | null {
  // Prefer localStorage (remember-me sessions) over sessionStorage.
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

function writeStoredToken(token: string, persistent: boolean) {
  // Make sure the token only lives in one place so logout cleans up cleanly.
  if (persistent) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const me = await api.get<CurrentUser>("/auth/me");
    setUser(me);
  }, []);

  useEffect(() => {
    const stored = readStoredToken();
    if (stored) {
      setAccessToken(stored);
      fetchMe()
        .catch(() => {
          clearStoredToken();
          setAccessToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchMe]);

  const storeToken = useCallback((token: string, persistent: boolean) => {
    writeStoredToken(token, persistent);
    setAccessToken(token);
  }, []);

  const requestMagicLink = async (email: string, rememberMe = false) => {
    await api.post("/auth/request-magic-link", { email, rememberMe });
  };

  const verifyMagicLink = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await api.post<{ accessToken: string; rememberMe?: boolean }>(
        "/auth/verify-magic-link",
        { token },
      );
      storeToken(res.accessToken, res.rememberMe === true);
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
      storeToken(res.accessToken, false);
      await fetchMe();
      return true;
    } catch {
      return false;
    }
  }, [fetchMe, storeToken]);

  const logout = async () => {
    await api.post("/auth/logout");
    clearStoredToken();
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
