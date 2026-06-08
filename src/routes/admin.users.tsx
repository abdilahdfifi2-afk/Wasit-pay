import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-users-live",
    enabled: isAdmin,
    tables: [{ table: "profiles" }, { table: "user_roles" }],
    queryKeys: [["admin-users"], ["admin-stats"]],
  });

  const toggleBan = async (id: string, is_banned: boolean) => {
    setUpdating(id);
    const { error } = await supabase.from("profiles").update({ is_banned: !is_banned }).eq("id", id);
    setUpdating(null);
    if (error) { toast.error(error.message); return; }
    toast.success(is_banned ? "User unbanned" : "User banned");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  if (!isAdmin) return null;

  return (
    <DashboardShell variant="admin">
      <h1 className="text-2xl md:text-3xl font-bold font-display mb-6">Users</h1>
      <div className="glass-card rounded-2xl overflow-hidden">
        {users?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
            <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm">{u.full_name?.[0]?.toUpperCase() ?? "?"}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate flex items-center gap-2">
                {u.full_name || "Unnamed"}
                {u.is_banned && <span className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/15 text-destructive font-bold">BANNED</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{u.phone || "—"} • {u.id.slice(0, 8)}</div>
            </div>
            <div className="text-xs text-muted-foreground hidden md:block">{Number(u.wallet_balance).toFixed(2)} MAD</div>
            <Button size="sm" variant="outline" disabled={updating === u.id} onClick={() => toggleBan(u.id, u.is_banned)} className={u.is_banned ? "hover:bg-success/20 hover:text-success" : "hover:bg-destructive/20 hover:text-destructive"}>
              {updating === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : u.is_banned ? <><ShieldCheck className="h-3 w-3 mr-1" /> Unban</> : <><Ban className="h-3 w-3 mr-1" /> Ban</>}
            </Button>
          </div>
        ))}
        {!users?.length && <div className="py-12 text-center text-muted-foreground text-sm">No users.</div>}
      </div>
    </DashboardShell>
  );
}
