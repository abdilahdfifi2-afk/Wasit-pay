import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";
import { useState } from "react";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "All Orders — Admin" }] }),
  component: AdminOrders,
});

const STATUSES = ["pending_payment", "payment_review", "paid", "shipped", "delivered", "completed", "cancelled", "disputed"] as const;
type OrderStatus = typeof STATUSES[number];

function AdminOrders() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, products(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-orders-live",
    enabled: isAdmin,
    tables: [{ table: "orders" }, { table: "payment_proofs" }],
    queryKeys: [["admin-orders"], ["admin-stats"]],
  });

  const update = async (id: string, status: OrderStatus) => {
    setUpdating(id);
    const { error } = await supabase.from("orders").update({ order_status: status }).eq("id", id);
    setUpdating(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  if (!isAdmin) return null;

  return (
    <DashboardShell variant="admin">
      <h1 className="text-2xl md:text-3xl font-bold font-display mb-6">All orders</h1>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_120px_140px_140px_180px] gap-4 px-5 py-3 border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          <div>Product</div><div>Amount</div><div>Buyer / Seller</div><div>Date</div><div>Status / Actions</div>
        </div>
        {orders?.map((o: any) => (
          <div key={o.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_140px_180px] gap-2 md:gap-4 px-4 md:px-5 py-3 border-b border-border/40 last:border-0 items-center text-sm">
            <div>
              <div className="font-medium truncate">{o.products?.title}</div>
              <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
            </div>
            <div className="font-bold text-gradient-gold">{Number(o.amount).toLocaleString()} MAD</div>
            <div className="text-xs text-muted-foreground">
              <div>B: {o.buyer_id.slice(0, 8)}</div>
              <div>S: {o.seller_id.slice(0, 8)}</div>
            </div>
            <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
            <Select value={o.order_status} onValueChange={(v) => update(o.id, v as OrderStatus)} disabled={updating === o.id}>
              <SelectTrigger className="h-9">{updating === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}</SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
        {!orders?.length && <div className="py-12 text-center text-muted-foreground text-sm">No orders.</div>}
      </div>
    </DashboardShell>
  );
}
