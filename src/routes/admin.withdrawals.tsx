import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/admin/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — Wasit.pay" }] }),
  component: AdminWithdrawals,
});

function AdminWithdrawals() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [loading, user, isAdmin, navigate]);

  const { data: items } = useQuery({
    queryKey: ["admin-withdrawals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: rows, error } = await supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      return (rows ?? []).map((r) => ({ ...r, full_name: map.get(r.user_id) ?? "User" }));
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-withdrawals-live",
    enabled: isAdmin,
    tables: [{ table: "withdrawal_requests" }, { table: "profiles" }],
    queryKeys: [["admin-withdrawals"], ["admin-stats"]],
  });

  const update = async (id: string, status: "processing" | "completed" | "rejected") => {
    const payload: any = { status, admin_notes: notes[id] ?? null, processed_by: user!.id, processed_at: new Date().toISOString() };
    if (status === "completed") payload.transaction_reference = refs[id] ?? null;
    const { error } = await supabase.from("withdrawal_requests").update(payload).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Withdrawal ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  if (!isAdmin) return null;

  return (
    <DashboardShell variant="admin">
      <div className="mb-6 flex items-center gap-3">
        <ArrowDownToLine className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold font-display">Withdrawal Requests</h1>
      </div>

      {!items?.length ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">No withdrawal requests yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map((w: any) => (
            <div key={w.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="font-bold text-xl text-gradient-gold">{Number(w.amount).toLocaleString()} MAD</div>
                  <div className="text-sm">{w.full_name} • <span className="capitalize">{w.payment_method.replace(/_/g, " ")}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider h-fit ${
                  w.status === "completed" ? "bg-success/20 text-success" :
                  w.status === "rejected" ? "bg-destructive/20 text-destructive" :
                  w.status === "processing" ? "bg-accent/20 text-accent" : "bg-warning/20 text-warning"
                }`}>{w.status}</span>
              </div>

              <div className="text-xs bg-surface-elevated/40 p-3 rounded-lg mb-3 font-mono">
                {JSON.stringify(w.account_details, null, 2)}
              </div>

              {(w.status === "pending" || w.status === "processing") && (
                <div className="space-y-2">
                  <Textarea placeholder="Admin notes (optional)" value={notes[w.id] ?? ""} onChange={(e) => setNotes((p) => ({ ...p, [w.id]: e.target.value }))} maxLength={500} />
                  <Input placeholder="Transaction reference (for completion)" value={refs[w.id] ?? ""} onChange={(e) => setRefs((p) => ({ ...p, [w.id]: e.target.value }))} maxLength={200} />
                  <div className="flex gap-2 flex-wrap">
                    {w.status === "pending" && <Button onClick={() => update(w.id, "processing")} className="bg-accent text-accent-foreground">Mark processing</Button>}
                    <Button onClick={() => update(w.id, "completed")} className="bg-success text-success-foreground">Complete</Button>
                    <Button onClick={() => update(w.id, "rejected")} variant="destructive">Reject (refund)</Button>
                  </div>
                </div>
              )}

              {w.transaction_reference && <div className="text-xs text-muted-foreground mt-2">Ref: {w.transaction_reference}</div>}
              {w.admin_notes && <div className="text-xs text-muted-foreground mt-1">Notes: {w.admin_notes}</div>}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
