import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, ArrowDownToLine, Loader2, Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Wasit.pay" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["wallet-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("wallet_balance").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("withdrawal_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: ledger } = useQuery({
    queryKey: ["wallet-ledger", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_ledger")
        .select("id, amount, balance_after, kind, notes, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: `wallet-${user?.id ?? "anon"}`,
    enabled: !!user,
    tables: user ? [
      { table: "profiles", filter: `id=eq.${user.id}` },
      { table: "withdrawal_requests", filter: `user_id=eq.${user.id}` },
      { table: "wallet_ledger", filter: `user_id=eq.${user.id}` },
    ] : [],
    queryKeys: [["wallet-profile", user?.id], ["my-withdrawals", user?.id], ["wallet-ledger", user?.id]],
  });

  const submit = async () => {
    const amt = Number(amount);
    const balance = Number(profile?.wallet_balance ?? 0);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount");
    if (amt < 50) return toast.error("Minimum withdrawal is 50 MAD");
    if (amt > balance) return toast.error(`Insufficient balance (${balance} MAD available)`);
    if (!accountName.trim() || accountName.trim().length < 3) return toast.error("Account name required");
    if (!accountNumber.trim() || accountNumber.trim().length < 4) return toast.error("Valid account number required");
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_withdrawal", {
        _amount: amt,
        _payment_method: method,
        _account_details: { name: accountName.trim().slice(0, 200), number: accountNumber.trim().slice(0, 100) },
      });
      if (error) throw error;
      toast.success("Withdrawal requested");
      setOpen(false);
      setAmount(""); setAccountName(""); setAccountNumber("");
      qc.invalidateQueries({ queryKey: ["wallet-profile"] });
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["wallet-ledger"] });
    } catch (e: any) {
      toast.error(e.message ?? "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = (s: string) =>
    s === "completed" ? <CheckCircle2 className="h-4 w-4 text-success" /> :
    s === "rejected" ? <XCircle className="h-4 w-4 text-destructive" /> :
    <Clock className="h-4 w-4 text-warning" />;

  if (!user) return null;

  return (
    <DashboardShell variant="seller">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold font-display">Wallet</h1>
          <p className="text-sm text-muted-foreground">Manage your earnings and withdrawals.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-glow font-semibold">
              <ArrowDownToLine className="h-4 w-4 mr-2" /> Request withdrawal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request a withdrawal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount (MAD)</Label>
                <Input type="number" min="1" max={profile?.wallet_balance ?? 0} value={amount} onChange={(e) => setAmount(e.target.value)} />
                <div className="text-xs text-muted-foreground mt-1">Available: {(profile?.wallet_balance ?? 0).toLocaleString()} MAD</div>
              </div>
              <div>
                <Label>Payment method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="wafacash">Wafacash</SelectItem>
                    <SelectItem value="cashplus">Cashplus</SelectItem>
                    <SelectItem value="cih_mobile">CIH Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account holder name</Label>
                <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} maxLength={200} />
              </div>
              <div>
                <Label>Account / phone number</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} maxLength={100} />
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground font-semibold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Available balance" value={`${(profile?.wallet_balance ?? 0).toLocaleString()} MAD`} icon={Wallet} accent="gold" />
        <StatCard label="Pending withdrawals" value={withdrawals?.filter(w => w.status === "pending" || w.status === "processing").length ?? 0} icon={Clock} accent="warning" />
        <StatCard label="Completed" value={withdrawals?.filter(w => w.status === "completed").length ?? 0} icon={CheckCircle2} accent="success" />
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-display font-bold text-lg mb-4">Withdrawal history</h2>
        {!withdrawals?.length ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No withdrawal requests yet.</div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40">
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(w.status)}
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{Number(w.amount).toLocaleString()} MAD</div>
                    <div className="text-xs text-muted-foreground capitalize">{w.payment_method.replace(/_/g, " ")} • {new Date(w.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{w.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5 mt-6">
        <h2 className="font-display font-bold text-lg mb-1">Transaction history</h2>
        <p className="text-xs text-muted-foreground mb-4">Immutable ledger of every wallet movement.</p>
        {!ledger?.length ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <div className="space-y-2">
            {ledger.map((e) => {
              const credit = Number(e.amount) > 0;
              return (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40">
                  <div className="flex items-center gap-3 min-w-0">
                    {credit ? <ArrowDownLeft className="h-4 w-4 text-success" /> : <ArrowUpRight className="h-4 w-4 text-destructive" />}
                    <div className="min-w-0">
                      <div className="font-medium text-sm capitalize">{e.kind.replace(/_/g, " ")}</div>
                      <div className="text-xs text-muted-foreground truncate">{e.notes ?? "—"} • {new Date(e.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${credit ? "text-success" : "text-destructive"}`}>
                      {credit ? "+" : ""}{Number(e.amount).toLocaleString()} MAD
                    </div>
                    <div className="text-[10px] text-muted-foreground">Balance: {Number(e.balance_after).toLocaleString()}</div>
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
