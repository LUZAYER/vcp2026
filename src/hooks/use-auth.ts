import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/permissions";
import { hasPermission, type Permission } from "@/lib/permissions";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user);
      if (data.user) {
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        if (mounted) setRoles((r ?? []).map((x: { role: AppRole }) => x.role));
      }
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).then(({ data }) => {
          setRoles((data ?? []).map((x: { role: AppRole }) => x.role));
        });
      } else {
        setRoles([]);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return {
    user,
    roles,
    loading,
    can: (perm: Permission) => hasPermission(roles, perm),
    isAdmin: roles.includes("admin"),
  };
}
