import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Clock, CheckCircle2, AlertCircle, Truck, ShieldCheck, Loader2, MessageSquareWarning, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";
import { LeaveReviewDialog } from "@/components/leave-review-dialog";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — Wasit.pay" }] }),
  component: OrdersPage,
});

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  pending_payment: { bg: "bg-warning/10", text: "text-warning", icon: Clock },
  payment_review: { bg: "bg-accent/10", text: "text-accent", icon: Clock },
  paid: { bg: "bg-success/10", text: "text-success", icon: CheckCircle2 },
  shipped: { bg: "bg-accent/10", text: "text-accent", icon: Truck },
  delivered: { bg: "bg-success/10", text: "text-success", icon: Package },
  completed: { bg: "bg-success/10", text: "text-success", icon: CheckCircle2 },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertCircle },
  disputed: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertCircle },
};

function OrdersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);

  // Reviews this user has already left (to hide "Leave review" once submitted)
  const { data: myReviews } = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("order_id").eq("reviewer_id", user!.id);
      return new Set((data ?? []).map((r) => r.order_id as string));
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(title, images)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: `my-orders-${user?.id ?? "anon"}`,
    enabled: !!user,
    tables: user ? [
      { table: "orders", filter: `buyer_id=eq.${user.id}` },
      { table: "disputes" },
      { table: "payment_proofs" },
    ] : [],
    queryKeys: [["my-orders", user?.id]],
  });

  const confirmDelivery = async (orderId: string) => {
    setConfirming(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: "completed" })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Delivery confirmed — funds released to seller ✓");
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not confirm delivery");
    } finally {
      setConfirming(null);
    }
  };

  const openDispute = async () => {
    if (!disputeOrder || !disputeReason.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("disputes").insert({
      order_id: disputeOrder.id,
      opened_by: user.id,
      reason: disputeReason.trim().slice(0, 1000),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Dispute opened — admin will review");
    setDisputeOrder(null);
    setDisputeReason("");
    qc.invalidateQueries({ queryKey: ["my-orders"] });
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Orders</h1>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass-card rounded-2xl h-24 animate-shimmer" />)}</div>
        ) : !orders?.length ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold">No orders yet</h3>
            <Link to="/marketplace" className="text-primary text-sm mt-2 inline-block">Browse marketplace →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o: any) => {
              const s = STATUS_STYLES[o.order_status] ?? STATUS_STYLES.pending_payment;
              const Icon = s.icon;
              const isBuyer = o.buyer_id === user?.id;
              const canPay = isBuyer && (o.order_status === "pending_payment" || o.order_status === "payment_review");
              const canConfirm = isBuyer && (o.order_status === "shipped" || o.order_status === "delivered");
              const canDispute = isBuyer && ["paid","shipped","delivered"].includes(o.order_status);
              const canReview = o.order_status === "completed" && !myReviews?.has(o.id);
              const otherPartyId = isBuyer ? o.seller_id : o.buyer_id;
              return (
                <div key={o.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-surface-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                      {o.products?.images?.[0] ? <img src={o.products.images[0]} className="h-full w-full object-cover" alt="" /> : <span className="text-2xl">📦</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{o.products?.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleDateString()}</div>
                      <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                        <Icon className="h-3 w-3" /> {o.order_status.replace(/_/g, " ")}
                      </div>
                      {o.tracking_number && (
                        <div className="text-[11px] text-muted-foreground mt-1">Tracking: <span className="font-mono">{o.tracking_number}</span></div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gradient-gold">{Number(o.amount).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">MAD</div>
                    </div>
                  </div>

                  {(canPay || canConfirm || canDispute || canReview) && (
                    <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2">
                      {canReview && (
                        <Button size="sm" onClick={() => setReviewOrder({ ...o, otherPartyId })} className="bg-gradient-gold text-primary-foreground font-semibold shadow-glow">
                          <Star className="h-3 w-3 mr-1" /> Leave review
                        </Button>
                      )}
                      {canPay && (
                        <Link to="/checkout/$orderId" params={{ orderId: o.id }}>
                          <Button size="sm" className="bg-gradient-gold text-primary-foreground shadow-glow font-semibold">
                            Complete payment →
                          </Button>
                        </Link>
                      )}
                      {canConfirm && (
                        <Button
                          size="sm"
                          onClick={() => confirmDelivery(o.id)}
                          disabled={confirming === o.id}
                          className="bg-success text-success-foreground font-semibold"
                        >
                          {confirming === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><ShieldCheck className="h-3 w-3 mr-1" /> Confirm delivery & release</>}
                        </Button>
                      )}
                      {canDispute && (
                        <Button size="sm" variant="outline" onClick={() => { setDisputeOrder(o); setDisputeReason(""); }} className="hover:bg-destructive/10 hover:text-destructive">
                          <MessageSquareWarning className="h-3 w-3 mr-1" /> Open dispute
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!disputeOrder} onOpenChange={(o) => !o && setDisputeOrder(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Open a dispute</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Describe what went wrong with order #{disputeOrder?.id.slice(0, 8)}. An admin will review and decide
              whether to refund you or release funds to the seller.
            </p>
            <Textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Item didn't arrive, condition different from listing, etc."
            />
            <Button onClick={openDispute} disabled={submitting || !disputeReason.trim()} className="bg-gradient-gold text-primary-foreground font-semibold">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit dispute"}
            </Button>
          </DialogContent>
        </Dialog>

        {reviewOrder && user && (
          <LeaveReviewDialog
            open={!!reviewOrder}
            onOpenChange={(o) => !o && setReviewOrder(null)}
            orderId={reviewOrder.id}
            reviewerId={user.id}
            reviewedUserId={reviewOrder.otherPartyId}
            reviewedUserName={reviewOrder.products?.title ? "the seller" : undefined}
          />
        )}
      </div>
      <MobileNav />
    </div>
  );
}
