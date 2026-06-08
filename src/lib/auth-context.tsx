import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "buyer" | "seller" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (error) {
      setRoles([]);
      return [] as Role[];
    }
    const nextRoles = (data ?? []).map((r) => r.role as Role);
    setRoles(nextRoles);
    return nextRoles;
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setLoading(true);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await loadRoles(s.user.id);
      } else {
        setRoles([]);
      }
      if (mounted) setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) await loadRoles(data.session.user.id);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        loading,
        isAdmin: roles.includes("admin"),
        isSeller: roles.includes("seller"),
        signOut: async () => { await supabase.auth.signOut(); },
        refreshRoles: async () => { if (user) await loadRoles(user.id); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
