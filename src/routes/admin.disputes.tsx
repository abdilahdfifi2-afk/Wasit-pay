import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/admin/disputes")({
  head: () => ({ meta: [{ title: "Disputes — Admin" }] }),
  component: AdminDisputes,
});

function AdminDisputes() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: disputes } = useQuery({
    queryKey: ["admin-disputes"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("disputes").select("*, orders(amount, products(title))").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-disputes-live",
    enabled: isAdmin,
    tables: [{ table: "disputes" }, { table: "orders" }],
    queryKeys: [["admin-disputes"], ["admin-stats"], ["admin-orders"]],
  });

  const resolve = async (id: string, side: "buyer" | "seller") => {
    const resolution = resolutions[id] || `Resolved in favor of ${side}.`;
    setProcessing(`${id}:${side}`);
    try {
      const { error } = await supabase.rpc("resolve_dispute", {
        _dispute_id: id,
        _winner: side,
        _resolution: resolution,
      });
      if (error) throw error;
      toast.success(side === "buyer" ? "Refunded — order cancelled" : "Released to seller wallet");
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not resolve dispute");
    } finally {
      setProcessing(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <DashboardShell variant="admin">
      <h1 className="text-2xl md:text-3xl font-bold font-display mb-6">Disputes</h1>
      <div className="space-y-3">
        {disputes?.map((d: any) => (
          <div key={d.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-semibold">{d.orders?.products?.title ?? "Order"}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${d.status === "open" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{d.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{d.reason}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
            </div>
            {d.status === "open" ? (
              <>
                <Textarea placeholder="Resolution notes..." value={resolutions[d.id] ?? ""} onChange={(e) => setResolutions({ ...resolutions, [d.id]: e.target.value })} rows={2} className="mb-3" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={!!processing} onClick={() => resolve(d.id, "buyer")}>Refund buyer</Button>
                  <Button size="sm" disabled={!!processing} className="bg-gradient-gold text-primary-foreground" onClick={() => resolve(d.id, "seller")}>Release to seller</Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-success border-t border-border/40 pt-2 mt-2">✓ {d.admin_resolution}</div>
            )}
          </div>
        ))}
        {!disputes?.length && <div className="glass-card rounded-2xl py-12 text-center text-muted-foreground text-sm">No disputes — your marketplace is healthy 🎉</div>}
      </div>
    </DashboardShell>
  );
}
