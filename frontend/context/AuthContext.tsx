"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Mountain, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/utils/apiConfig";

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  picture?: string | null;
  auth_provider?: string;
}

export interface GoogleLoginOptions {
  credential?: string;
  code?: string;
  redirect_uri?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (
    optionsOrCredential?: string | GoogleLoginOptions,
    profile?: { email?: string; name?: string; picture?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "wanderlust_auth_token";
const USER_KEY = "wanderlust_user";
const PUBLIC_PATHS = ["/login"];

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota / private-mode errors
  }
}

function safeStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

function sanitizeUser(candidate: unknown): User | null {
  if (!candidate || typeof candidate !== "object") return null;
  const obj = candidate as Record<string, unknown>;
  const email = typeof obj.email === "string" ? obj.email.trim() : "";
  const fullName = typeof obj.full_name === "string" ? obj.full_name.trim() : "";

  if (!email && !fullName) return null;
  if (email.startsWith("usr_g_") && email.includes("@travelplanner.ai")) return null;

  return {
    id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : "user",
    email: email || "traveler@wanderlust.ai",
    full_name: fullName || null,
    role: typeof obj.role === "string" && obj.role.trim() ? obj.role.trim() : "user",
    picture: typeof obj.picture === "string" && obj.picture.trim() ? obj.picture.trim() : null,
    auth_provider: typeof obj.auth_provider === "string" ? obj.auth_provider : undefined,
  };
}

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    if (padLength > 0) {
      base64 += "=".repeat(padLength);
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to persist auth tokens in localStorage and document.cookie
  const saveAuthSession = (authToken: string, authUser: User) => {
    const cleanUser = sanitizeUser(authUser) || authUser;
    setToken(authToken);
    setUser(cleanUser);
    if (typeof window !== "undefined") {
      safeStorageSet(TOKEN_KEY, authToken);
      safeStorageSet(USER_KEY, JSON.stringify(cleanUser));
      try {
        document.cookie = `${TOKEN_KEY}=${encodeURIComponent(authToken)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(cleanUser))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } catch {
        // Ignore cookie write failures
      }
    }
  };

  // Helper to clear auth session
  const clearAuthSession = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      safeStorageRemove(TOKEN_KEY);
      safeStorageRemove(USER_KEY);
      try {
        document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `${USER_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      } catch {
        // Ignore cookie clear failures
      }
    }
  };

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      let hydratedUser: User | null = null;

      try {
        let storedToken = safeStorageGet(TOKEN_KEY);
        let storedUserStr = safeStorageGet(USER_KEY);

        // Check URL parameters first (e.g. redirected from Google OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get("auth_token") || urlParams.get("token");
        if (urlToken) {
          storedToken = urlToken;
          safeStorageSet(TOKEN_KEY, storedToken);

          // Also check if cookie has fresh user data from callback route
          const userMatch = document.cookie.match(new RegExp(`(?:^|; )${USER_KEY}=([^;]*)`));
          if (userMatch && userMatch[1]) {
            const decodedUser = safeDecodeURIComponent(userMatch[1]);
            if (decodedUser) {
              storedUserStr = decodedUser;
              safeStorageSet(USER_KEY, storedUserStr);
            }
          }

          // Clean up the URL parameter without page reload
          urlParams.delete("auth_token");
          urlParams.delete("token");
          const cleanSearch = urlParams.toString() ? `?${urlParams.toString()}` : "";
          const cleanUrl = window.location.pathname + cleanSearch;
          window.history.replaceState({}, "", cleanUrl);
        }

        // If still no token, check document.cookie fallback
        if (!storedToken && typeof document !== "undefined") {
          const tokenMatch = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
          if (tokenMatch && tokenMatch[1]) {
            const decodedToken = safeDecodeURIComponent(tokenMatch[1]);
            if (decodedToken) {
              storedToken = decodedToken;
              safeStorageSet(TOKEN_KEY, storedToken);
            }
          }
          const userMatch = document.cookie.match(new RegExp(`(?:^|; )${USER_KEY}=([^;]*)`));
          if (userMatch && userMatch[1]) {
            const decodedUser = safeDecodeURIComponent(userMatch[1]);
            if (decodedUser) {
              storedUserStr = decodedUser;
              safeStorageSet(USER_KEY, storedUserStr);
            }
          }
        }

        if (!storedToken) {
          return;
        }

        // Fast hydration: extract claims directly from JWT token
        const jwtClaims = parseJwtPayload(storedToken);
        if (
          jwtClaims &&
          typeof jwtClaims.email === "string" &&
          jwtClaims.email.trim() &&
          !jwtClaims.email.includes("@travelplanner.ai")
        ) {
          hydratedUser = sanitizeUser({
            id: jwtClaims.user_id || jwtClaims.sub,
            email: jwtClaims.email,
            full_name: jwtClaims.full_name || jwtClaims.name || null,
            picture: jwtClaims.picture || null,
            role: jwtClaims.role || "user",
            auth_provider: jwtClaims.auth_provider || (jwtClaims.picture ? "google" : "local"),
          });
        } else if (storedUserStr) {
          try {
            const parsed = JSON.parse(storedUserStr);
            hydratedUser = sanitizeUser(parsed);
          } catch {
            hydratedUser = null;
          }
        }

        if (hydratedUser) {
          setUser(hydratedUser);
          setToken(storedToken);
          safeStorageSet(USER_KEY, JSON.stringify(hydratedUser));
        } else {
          safeStorageRemove(USER_KEY);
        }

        // Verify & sync with backend /api/auth/me
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const rawFreshUser = await res.json().catch(() => null);
          const freshUser = sanitizeUser(rawFreshUser);
          if (freshUser) {
            setUser(freshUser);
            setToken(storedToken);
            safeStorageSet(USER_KEY, JSON.stringify(freshUser));
          } else if (!hydratedUser) {
            clearAuthSession();
          }
        } else if (res.status === 401 || !hydratedUser) {
          // Token expired/invalid or local user payload was corrupt
          clearAuthSession();
        }
      } catch (err) {
        console.warn("Could not verify session with backend, continuing with cached session:", err);
        if (!hydratedUser) {
          clearAuthSession();
        }
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  // Login with Email & Password
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data.detail || "כתובת אימייל או סיסמה שגויים" };
      }

      const validUser = sanitizeUser(data.user);
      if (!data.access_token || !validUser) {
        return { success: false, error: "תגובת השרת אינה תקינה. אנא נסה שוב." };
      }

      saveAuthSession(data.access_token, validUser);
      return { success: true };
    } catch {
      return { success: false, error: "שגיאת תקשורת עם שרת האימות. אנא נסה שוב." };
    }
  };

  // Register with Email, Password and Name
  const register = async (email: string, password: string, fullName?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName?.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data.detail || "שגיאה ברישום המשתמש" };
      }

      const validUser = sanitizeUser(data.user);
      if (!data.access_token || !validUser) {
        return { success: false, error: "תגובת השרת אינה תקינה. אנא נסה שוב." };
      }

      saveAuthSession(data.access_token, validUser);
      return { success: true };
    } catch {
      return { success: false, error: "שגיאת תקשורת עם השרת בעת ההרשמה" };
    }
  };

  // Login with Google OAuth
  const loginWithGoogle = async (
    optionsOrCredential?: string | GoogleLoginOptions,
    profile?: { email?: string; name?: string; picture?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload: any = {};
      if (typeof optionsOrCredential === "string") {
        payload.credential = optionsOrCredential;
      } else if (optionsOrCredential && typeof optionsOrCredential === "object") {
        if (optionsOrCredential.credential) payload.credential = optionsOrCredential.credential;
        if (optionsOrCredential.code) payload.code = optionsOrCredential.code;
        if (optionsOrCredential.redirect_uri) payload.redirect_uri = optionsOrCredential.redirect_uri;
        if (optionsOrCredential.email) payload.email = optionsOrCredential.email;
        if (optionsOrCredential.name) payload.name = optionsOrCredential.name;
        if (optionsOrCredential.picture) payload.picture = optionsOrCredential.picture;
      }

      if (profile?.email) payload.email = profile.email;
      if (profile?.name) payload.name = profile.name;
      if (profile?.picture) payload.picture = profile.picture;

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data.detail || "שגיאה בהתחברות באמצעות Google" };
      }

      const validUser = sanitizeUser(data.user);
      if (!data.access_token || !validUser) {
        return { success: false, error: "פרטי המשתמש שהתקבלו אינם תקינים" };
      }

      saveAuthSession(data.access_token, validUser);
      return { success: true };
    } catch {
      return { success: false, error: "שגיאת רשת בהתחברות עם Google" };
    }
  };

  // Logout
  const logout = () => {
    clearAuthSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      <Suspense
        fallback={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070c12] text-white">
            <Loader2 className="w-8 h-8 text-mint-400 animate-spin" />
          </div>
        }
      >
        <AuthGuard>{children}</AuthGuard>
      </Suspense>
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// ==============================================================================
// AuthGuard: Route Protection & Enforced Login Gate
// ==============================================================================
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_PATHS.some(
      (path) => pathname === path || Boolean(pathname?.startsWith(path + "/"))
    );

    if (!isAuthenticated && !isPublic) {
      // Unauthenticated user attempting to access protected area -> redirect to /login
      const queryStr = searchParams?.toString() || "";
      const currentUrl = pathname ? `${pathname}${queryStr ? `?${queryStr}` : ""}` : "/";
      router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    } else if (isAuthenticated && pathname === "/login") {
      // Authenticated user already logged in -> redirect to target or home
      const rawRedirect = searchParams?.get("redirect") || "/";
      const redirectUrl =
        rawRedirect.startsWith("/") &&
        !rawRedirect.startsWith("//") &&
        !rawRedirect.startsWith("/login")
          ? rawRedirect
          : "/";
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, isLoading, pathname, router, searchParams]);

  // Splash Loading Screen with Liquid Glass Aesthetics
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070c12] text-white p-6" dir="rtl">
        {/* Ambient Aurora Glow */}
        <div className="absolute w-[360px] h-[360px] rounded-full bg-teal-500/15 blur-[120px] pointer-events-none -top-10" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-mint-500/10 blur-[100px] pointer-events-none -bottom-10" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl mb-5 animate-pulse text-mint-400">
            <Mountain className="w-8 h-8" />
          </div>

          <h2 className="font-heading font-black text-2xl tracking-[0.2em] text-white mb-2">
            WANDERLUST
          </h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide mb-6">
            טוען את המערכת ומאמת הרשאות גישה...
          </p>

          <div className="flex items-center gap-2 text-mint-400 text-xs font-semibold bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>סנכרון מאובטח</span>
          </div>
        </div>
      </div>
    );
  }

  // Prevent flash of protected content while redirecting
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || Boolean(pathname?.startsWith(path + "/"))
  );
  if (!isAuthenticated && !isPublic) {
    return (
      <div className="min-h-screen bg-[#070c12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-mint-400 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};
