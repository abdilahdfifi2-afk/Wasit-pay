import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, DollarSign, ShoppingBag, AlertTriangle, FileCheck, ShieldCheck, ArrowDownToLine, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — Wasit.pay" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const { isAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const [usersRes, productsRes, ordersRes, proofsRes, disputesRes, kycRes, wdRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("amount, commission, order_status"),
        supabase.from("payment_proofs").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("disputes").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("seller_verifications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const error = usersRes.error || productsRes.error || ordersRes.error || proofsRes.error || disputesRes.error || kycRes.error || wdRes.error;
      if (error) throw error;
      const orders = ordersRes.data ?? [];
      const gmv = orders.reduce((s, o) => s + Number(o.amount), 0);
      const commissionTotal = orders.filter((o) => o.order_status === "completed").reduce((s, o) => s + Number(o.commission), 0);
      return {
        usersCount: usersRes.count ?? 0,
        productsCount: productsRes.count ?? 0,
        ordersCount: orders.length,
        gmv,
        commission: commissionTotal,
        pendingProofs: proofsRes.count ?? 0,
        disputes: disputesRes.count ?? 0,
        pendingKyc: kycRes.count ?? 0,
        pendingWithdrawals: wdRes.count ?? 0,
      };
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-overview-live",
    enabled: isAdmin,
    tables: [{ table: "profiles" }, { table: "products" }, { table: "orders" }, { table: "payment_proofs" }, { table: "disputes" }, { table: "seller_verifications" }, { table: "withdrawal_requests" }],
    queryKeys: [["admin-stats"]],
  });

  return (
    <DashboardShell variant="admin">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-display">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time stats across Wasit.pay.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Commission earned" value={`${(stats?.commission ?? 0).toLocaleString()} MAD`} sub="Completed orders" icon={DollarSign} accent="gold" />
        <StatCard label="GMV" value={`${(stats?.gmv ?? 0).toLocaleString()} MAD`} sub="Total volume" icon={DollarSign} accent="success" />
        <StatCard label="Users" value={stats?.usersCount ?? 0} icon={Users} accent="accent" />
        <StatCard label="Products" value={stats?.productsCount ?? 0} icon={Package} accent="accent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <AdminTile to="/admin/payments" icon={FileCheck} label="Payment proofs" count={stats?.pendingProofs ?? 0} hint="awaiting review" tone="warning" />
        <AdminTile to="/admin/verifications" icon={ShieldCheck} label="KYC submissions" count={stats?.pendingKyc ?? 0} hint="awaiting review" tone="accent" />
        <AdminTile to="/admin/withdrawals" icon={ArrowDownToLine} label="Withdrawals" count={stats?.pendingWithdrawals ?? 0} hint="to process" tone="warning" />
        <AdminTile to="/admin/disputes" icon={AlertTriangle} label="Open disputes" count={stats?.disputes ?? 0} hint="to resolve" tone="destructive" />
        <AdminTile to="/admin/orders" icon={ShoppingBag} label="All orders" count={stats?.ordersCount ?? 0} hint="lifetime" tone="accent" />
        <AdminTile to="/admin/users" icon={Users} label="Users" count={stats?.usersCount ?? 0} hint="registered" tone="accent" />
        <AdminTile to="/admin/products" icon={Package} label="Products" count={stats?.productsCount ?? 0} hint="listed" tone="accent" />
        <AdminTile to="/admin/audit" icon={ScrollText} label="Audit log" count={"›"} hint="admin actions" tone="accent" />
      </div>
    </DashboardShell>
  );
}

function AdminTile({ to, icon: Icon, label, count, hint, tone }: { to: string; icon: any; label: string; count: number | string; hint: string; tone: "warning" | "destructive" | "accent" }) {
  const toneCls = tone === "warning" ? "bg-warning/15 text-warning" : tone === "destructive" ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent";
  return (
    <Link to={to} className="glass-card rounded-2xl p-5 hover:shadow-glow transition-all">
      <div className="flex items-center gap-3 mb-2">
        <div className={`h-10 w-10 rounded-xl ${toneCls} flex items-center justify-center`}><Icon className="h-5 w-5" /></div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm text-muted-foreground">{hint}</div>
    </Link>
  );
}
