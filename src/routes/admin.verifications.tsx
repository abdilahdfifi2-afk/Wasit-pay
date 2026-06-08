import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({ meta: [{ title: "KYC Reviews — Wasit.pay" }] }),
  component: AdminVerifications,
});

function SignedImage({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["kyc-img", path],
    queryFn: async () => {
      const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
      return data?.signedUrl;
    },
  });
  return data ? <img src={data} alt="" className="rounded-lg w-full h-32 object-cover" /> : <div className="h-32 rounded-lg bg-muted animate-pulse" />;
}

function AdminVerifications() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [loading, user, isAdmin, navigate]);

  const { data: items } = useQuery({
    queryKey: ["admin-kyc"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("seller_verifications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-kyc-reviews",
    enabled: isAdmin,
    tables: [{ table: "seller_verifications" }],
    queryKeys: [["admin-kyc"], ["admin-stats"]],
  });

  const review = async (id: string, status: "approved" | "rejected") => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from("seller_verifications")
        .update({ status, admin_notes: notes[id] ?? null, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Verification ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e: any) {
      toast.error(e.message ?? "Review failed");
    } finally {
      setProcessing(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <DashboardShell variant="admin">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold font-display">Seller Verifications</h1>
      </div>

      {!items?.length ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">No verification requests yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((v) => (
            <div key={v.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <div className="font-bold text-lg">{v.full_name}</div>
                  <div className="text-xs text-muted-foreground">ID: {v.id_card_number} • {new Date(v.created_at).toLocaleString()}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${
                  v.status === "approved" ? "bg-success/20 text-success" :
                  v.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                }`}>{v.status}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <SignedImage path={v.id_card_front_url} />
                <SignedImage path={v.id_card_back_url} />
                <SignedImage path={v.selfie_url} />
              </div>

              {v.status === "pending" && (
                <div className="space-y-3">
                  <Textarea placeholder="Admin notes (optional)" value={notes[v.id] ?? ""} onChange={(e) => setNotes((p) => ({ ...p, [v.id]: e.target.value }))} maxLength={500} />
                  <div className="flex gap-2">
                    <Button onClick={() => review(v.id, "approved")} disabled={processing === v.id} className="flex-1 bg-success text-success-foreground">
                      {processing === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                    </Button>
                    <Button onClick={() => review(v.id, "rejected")} disabled={processing === v.id} variant="destructive" className="flex-1">Reject</Button>
                  </div>
                </div>
              )}
              {v.admin_notes && v.status !== "pending" && (
                <div className="text-sm text-muted-foreground bg-surface-elevated/40 p-3 rounded-lg">Notes: {v.admin_notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
