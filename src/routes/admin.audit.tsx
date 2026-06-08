import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ShieldCheck, FileCheck, UserCheck, Banknote, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Admin" }] }),
  component: AdminAuditLog,
});

const iconFor = (action: string) => {
  if (action.startsWith("order")) return ShieldCheck;
  if (action.startsWith("payment_proof")) return FileCheck;
  if (action.startsWith("kyc")) return UserCheck;
  if (action.startsWith("withdrawal")) return Banknote;
  if (action.startsWith("user.")) return Ban;
  return ScrollText;
};

function AdminAuditLog() {
  const { isAdmin } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-log"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_actions_log")
        .select("id, action, target_type, target_id, details, admin_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-audit-live",
    enabled: isAdmin,
    tables: [{ table: "admin_actions_log" }],
    queryKeys: [["admin-audit-log"]],
  });

  if (!isAdmin) return null;

  return (
    <DashboardShell variant="admin">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold font-display">Audit log</h1>
        <p className="text-sm text-muted-foreground mt-1">Latest 200 admin actions across the platform.</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !logs?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No admin actions recorded yet.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {logs.map((l) => {
              const Icon = iconFor(l.action);
              return (
                <div key={l.id} className="flex items-start gap-3 p-4">
                  <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{l.action}</span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{l.target_type}</span>
                    </div>
                    {l.details && Object.keys(l.details as object).length > 0 && (
                      <pre className="mt-1 text-xs text-muted-foreground bg-surface-elevated/40 rounded p-2 overflow-x-auto">
                        {JSON.stringify(l.details, null, 2)}
                      </pre>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-1">
                      admin {String(l.admin_id).slice(0, 8)} • target {String(l.target_id).slice(0, 8)} • {new Date(l.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
