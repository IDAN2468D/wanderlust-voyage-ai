"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Mountain, Loader2 } from "lucide-react";

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  picture?: string | null;
  auth_provider?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (credential?: string, profile?: { email?: string; name?: string; picture?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "wanderlust_auth_token";
const USER_KEY = "wanderlust_user";
const PUBLIC_PATHS = ["/login"];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Helper to persist auth tokens in localStorage and document.cookie
  const saveAuthSession = (authToken: string, authUser: User) => {
    setToken(authToken);
    setUser(authUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authUser));
      // Set cookie for SSR/edge compatibility
      document.cookie = `${TOKEN_KEY}=${authToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
  };

  // Helper to clear auth session
  const clearAuthSession = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  };

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUserStr = localStorage.getItem(USER_KEY);

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        if (storedUserStr) {
          setUser(JSON.parse(storedUserStr));
        }
        setToken(storedToken);

        // Verify token validity with backend /api/auth/me
        const res = await fetch(`${apiBase}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const freshUser = await res.json();
          setUser(freshUser);
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        } else if (res.status === 401) {
          // Token expired or invalid
          clearAuthSession();
        }
      } catch (err) {
        console.warn("Could not verify session with backend, continuing with cached session:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, [apiBase]);

  // Login with Email & Password
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail || "כתובת אימייל או סיסמה שגויים" };
      }

      saveAuthSession(data.access_token, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "שגיאת תקשורת עם שרת האימות. אנא נסה שוב." };
    }
  };

  // Register with Email, Password and Name
  const register = async (email: string, password: string, fullName?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName?.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail || "שגיאה ברישום המשתמש" };
      }

      saveAuthSession(data.access_token, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "שגיאת תקשורת עם השרת בעת ההרשמה" };
    }
  };

  // Login with Google OAuth
  const loginWithGoogle = async (
    credential?: string,
    profile?: { email?: string; name?: string; picture?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload: any = {};
      if (credential) payload.credential = credential;
      if (profile?.email) payload.email = profile.email;
      if (profile?.name) payload.name = profile.name;
      if (profile?.picture) payload.picture = profile.picture;

      const res = await fetch(`${apiBase}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail || "שגיאה בהתחברות באמצעות Google" };
      }

      saveAuthSession(data.access_token, data.user);
      return { success: true };
    } catch (err: any) {
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

    const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));

    if (!isAuthenticated && !isPublic) {
      // Unauthenticated user attempting to access protected area -> redirect to /login
      const currentUrl = pathname ? `${pathname}${searchParams ? `?${searchParams.toString()}` : ""}` : "/";
      router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    } else if (isAuthenticated && pathname === "/login") {
      // Authenticated user already logged in -> redirect to target or home
      const redirectUrl = searchParams.get("redirect") || "/";
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
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
  if (!isAuthenticated && !isPublic) {
    return (
      <div className="min-h-screen bg-[#070c12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-mint-400 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};
