import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Upload, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/seller/verify")({
  head: () => ({ meta: [{ title: "Seller Verification — Wasit.pay" }] }),
  component: SellerVerify,
});

type FileKey = "id_card_front_url" | "id_card_back_url" | "selfie_url";

function SellerVerify() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [files, setFiles] = useState<Record<FileKey, File | null>>({ id_card_front_url: null, id_card_back_url: null, selfie_url: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: existing } = useQuery({
    queryKey: ["my-kyc", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("seller_verifications").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  useRealtimeInvalidation({
    channelName: `my-kyc-${user?.id ?? "anon"}`,
    enabled: !!user,
    tables: user ? [{ table: "seller_verifications", filter: `user_id=eq.${user.id}` }] : [],
    queryKeys: [["my-kyc", user?.id]],
  });

  const MAX_FILE = 8 * 1024 * 1024; // 8 MB

  const upload = async (key: FileKey, file: File): Promise<string> => {
    if (file.size > MAX_FILE) throw new Error(`${file.name} is larger than 8MB`);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user!.id}/${key}-${Date.now()}.${ext || "jpg"}`;
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg", cacheControl: "3600" });
    if (error) throw new Error(`Upload failed (${key}): ${error.message}`);
    return path;
  };

  const submit = async () => {
    if (!user || submitting) return;
    if (!fullName.trim() || !idNumber.trim()) return toast.error("Full name and ID number are required");
    if (!files.id_card_front_url || !files.id_card_back_url || !files.selfie_url)
      return toast.error("All 3 photos are required");

    setSubmitting(true);
    const loadingId = toast.loading("Uploading documents…");
    try {
      const front = await upload("id_card_front_url", files.id_card_front_url);
      const back = await upload("id_card_back_url", files.id_card_back_url);
      const selfie = await upload("selfie_url", files.selfie_url);

      toast.loading("Saving submission…", { id: loadingId });

      const payload = {
        user_id: user.id,
        full_name: fullName.trim().slice(0, 200),
        id_card_number: idNumber.trim().slice(0, 50),
        id_card_front_url: front,
        id_card_back_url: back,
        selfie_url: selfie,
        status: "pending" as const,
        admin_notes: null,
        reviewed_by: null,
        reviewed_at: null,
      };

      const { error } = existing
        ? await supabase.from("seller_verifications").update(payload).eq("user_id", user.id)
        : await supabase.from("seller_verifications").insert(payload);
      if (error) throw new Error(error.message);

      toast.success("Verification submitted — admin will review shortly", { id: loadingId });
      setFiles({ id_card_front_url: null, id_card_back_url: null, selfie_url: null });
      await qc.invalidateQueries({ queryKey: ["my-kyc"] });
    } catch (e: any) {
      console.error("KYC submit error:", e);
      toast.error(e?.message ?? "Submission failed. Please try again.", { id: loadingId });
    } finally {
      setSubmitting(false);
    }
  };


  if (!user) return null;

  return (
    <DashboardShell variant="seller">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Seller Verification</h1>
            <p className="text-sm text-muted-foreground">Verify your identity to start selling on Wasit.pay.</p>
          </div>
        </div>

        {existing && (
          <div className={`glass-card rounded-2xl p-4 mb-6 flex items-center gap-3 ${
            existing.status === "approved" ? "border-success/40" : existing.status === "rejected" ? "border-destructive/40" : "border-warning/40"
          }`}>
            {existing.status === "approved" && <CheckCircle2 className="h-5 w-5 text-success" />}
            {existing.status === "rejected" && <XCircle className="h-5 w-5 text-destructive" />}
            {existing.status === "pending" && <Clock className="h-5 w-5 text-warning" />}
            <div className="flex-1">
              <div className="font-medium capitalize">{existing.status}</div>
              {existing.admin_notes && <div className="text-xs text-muted-foreground">{existing.admin_notes}</div>}
            </div>
          </div>
        )}

        {existing?.status !== "approved" && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div>
              <Label>Full legal name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As shown on your ID" maxLength={200} />
            </div>
            <div>
              <Label>National ID number</Label>
              <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="CIN / Passport number" maxLength={50} />
            </div>

            {([
              ["id_card_front_url", "ID card — front"],
              ["id_card_back_url", "ID card — back"],
              ["selfie_url", "Selfie holding ID"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <label className="mt-1.5 flex items-center gap-3 p-3 rounded-xl border border-dashed border-border bg-surface-elevated/40 hover:bg-surface-elevated cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{files[key]?.name ?? "Choose file (JPG/PNG)"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFiles((p) => ({ ...p, [key]: e.target.files?.[0] ?? null }))} />
                </label>
              </div>
            ))}

            <Button onClick={submit} disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground shadow-glow font-semibold">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? "Resubmit verification" : "Submit verification"}
            </Button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
