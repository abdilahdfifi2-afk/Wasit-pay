import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, X, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payment Reviews — Admin" }] }),
  component: PaymentReviews,
});

function PaymentReviews() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState<any>(null);
  const [signed, setSigned] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: proofs, isLoading } = useQuery({
    queryKey: ["admin-proofs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_proofs")
        .select("*, orders(id, amount, commission, buyer_id, seller_id, order_status, products(title))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-payment-reviews",
    enabled: isAdmin,
    tables: [{ table: "payment_proofs" }, { table: "orders" }],
    queryKeys: [["admin-proofs"], ["admin-stats"]],
  });

  useEffect(() => {
    if (!open) { setSigned(""); return; }
    supabase.storage.from("payment-proofs").createSignedUrl(open.image_url, 600).then(({ data, error }) => {
      if (error) toast.error(error.message);
      setSigned(data?.signedUrl ?? "");
    });
    setNotes(open.admin_notes ?? "");
  }, [open]);

  const decide = async (status: "approved" | "rejected") => {
    if (!open) return;
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("review_payment_proof", {
        _proof_id: open.id,
        _decision: status,
        _notes: notes || undefined,
      });
      if (error) throw error;
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["admin-proofs"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(status === "approved" ? "Payment confirmed — seller can ship" : "Payment rejected");
    } catch (e: any) {
      toast.error(e.message ?? "Review failed");
    } finally {
      setProcessing(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <DashboardShell variant="admin">
      <h1 className="text-2xl md:text-3xl font-bold font-display mb-6">Payment proof reviews</h1>

      {isLoading ? <div className="glass-card rounded-2xl h-64 animate-shimmer" /> : !proofs?.length ? (
        <div className="glass-card rounded-2xl py-16 text-center text-muted-foreground">No payment proofs submitted yet.</div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          {proofs.map((p: any) => (
            <div key={p.id} className="flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
              <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.verification_status === "pending" ? "bg-warning/15 text-warning" : p.verification_status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{p.verification_status}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{p.orders?.products?.title ?? "Order"}</div>
                <div className="text-xs text-muted-foreground">{Number(p.orders?.amount ?? 0).toLocaleString()} MAD • Ref: {p.transaction_reference || "—"} • {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setOpen(p)}><Eye className="h-3 w-3 mr-1" /> Review</Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="glass-card border-border/40 max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">Verify payment proof</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-surface-elevated max-h-[400px]">
                {signed ? <img src={signed} alt="Proof" className="w-full max-h-[400px] object-contain" /> : <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Amount:</span> <strong className="text-gradient-gold">{Number(open.orders?.amount ?? 0).toLocaleString()} MAD</strong></div>
                <div><span className="text-muted-foreground">Reference:</span> <strong>{open.transaction_reference || "—"}</strong></div>
              </div>
              <div>
                <label className="text-sm font-medium">Admin notes (optional)</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" maxLength={500} />
              </div>
              {open.verification_status === "pending" && (
                <div className="flex gap-2">
                  <Button onClick={() => decide("rejected")} disabled={processing} variant="outline" className="flex-1 hover:bg-destructive/20 hover:text-destructive">
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button onClick={() => decide("approved")} disabled={processing} className="flex-1 bg-gradient-gold text-primary-foreground shadow-glow font-semibold">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Confirm payment</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
