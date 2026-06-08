import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, Truck, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/seller/orders")({
  head: () => ({ meta: [{ title: "Seller Orders — Wasit.pay" }] }),
  component: SellerOrders,
});

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-warning/15 text-warning",
  payment_review: "bg-accent/15 text-accent",
  paid: "bg-success/15 text-success",
  shipped: "bg-accent/15 text-accent",
  delivered: "bg-success/15 text-success",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
  disputed: "bg-destructive/15 text-destructive",
};

function SellerOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["seller-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, products(title, images)").eq("seller_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: `seller-orders-${user?.id ?? "anon"}`,
    enabled: !!user,
    tables: user ? [{ table: "orders", filter: `seller_id=eq.${user.id}` }, { table: "payment_proofs" }] : [],
    queryKeys: [["seller-orders", user?.id]],
  });

  const markShipped = async (o: any) => {
    const tracking = prompt("Tracking number (optional)") ?? "";
    const { error } = await supabase.from("orders").update({ order_status: "shipped", shipping_status: "shipped", tracking_number: tracking }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as shipped");
    qc.invalidateQueries({ queryKey: ["seller-orders"] });
  };

  return (
    <DashboardShell variant="seller">
      <h1 className="text-2xl md:text-3xl font-bold font-display mb-6">Orders received</h1>

      {!orders?.length ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <Package className="h-12 w-12 mx-auto opacity-30 mb-3" />
          <p className="text-muted-foreground">No orders yet.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_140px_140px_160px] gap-4 px-5 py-3 border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <div>Product</div><div>Amount</div><div>Status</div><div>Date</div><div>Actions</div>
          </div>
          {orders.map((o: any) => (
            <div key={o.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_140px_160px] gap-2 md:gap-4 px-4 md:px-5 py-4 border-b border-border/40 last:border-0 items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-surface-elevated overflow-hidden flex-shrink-0">
                  {o.products?.images?.[0] ? <img src={o.products.images[0]} className="h-full w-full object-cover" /> : <div className="text-lg flex items-center justify-center h-full">📦</div>}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{o.products?.title}</div>
                  <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                </div>
              </div>
              <div className="font-bold text-gradient-gold">{Number(o.amount).toLocaleString()} MAD</div>
              <div><span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLOR[o.order_status]}`}>{o.order_status.replace(/_/g, " ")}</span></div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
              <div>
                {o.order_status === "paid" && (
                  <Button size="sm" onClick={() => markShipped(o)} className="bg-gradient-gold text-primary-foreground shadow-glow"><Truck className="h-3 w-3 mr-1" /> Ship</Button>
                )}
                {o.order_status === "shipped" && <span className="text-xs text-accent flex items-center gap-1"><Truck className="h-3 w-3" /> In transit</span>}
                {o.order_status === "completed" && <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Paid out</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
