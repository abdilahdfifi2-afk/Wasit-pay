import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Clock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";

export const Route = createFileRoute("/seller/earnings")({
  head: () => ({ meta: [{ title: "Earnings — Wasit.pay" }] }),
  component: Earnings,
});

function Earnings() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: orders } = await supabase.from("orders").select("amount, commission, order_status, created_at, products(title)").eq("seller_id", user!.id).order("created_at", { ascending: false });
      const list = orders ?? [];
      const completed = list.filter((o) => o.order_status === "completed");
      const pending = list.filter((o) => ["paid", "shipped", "delivered"].includes(o.order_status));
      return {
        completed: completed.reduce((s, o) => s + (Number(o.amount) - Number(o.commission)), 0),
        pending: pending.reduce((s, o) => s + (Number(o.amount) - Number(o.commission)), 0),
        commission: list.reduce((s, o) => s + Number(o.commission), 0),
        list,
      };
    },
  });

  return (
    <DashboardShell variant="seller">
      <h1 className="text-2xl md:text-3xl font-bold font-display mb-6">Earnings & payouts</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Available" value={`${(data?.completed ?? 0).toLocaleString()} MAD`} sub="Withdrawable" icon={Wallet} accent="gold" />
        <StatCard label="Pending escrow" value={`${(data?.pending ?? 0).toLocaleString()} MAD`} sub="Released after delivery" icon={Clock} accent="warning" />
        <StatCard label="Commission paid" value={`${(data?.commission ?? 0).toLocaleString()} MAD`} sub="To Wasit.pay" icon={DollarSign} accent="accent" />
        <StatCard label="Lifetime sales" value={data?.list.length ?? 0} sub="All time" icon={TrendingUp} accent="success" />
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-display font-bold text-lg mb-4">Transaction history</h2>
        {!data?.list.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {data.list.map((o: any, i) => (
              <div key={i} className="flex justify-between p-3 rounded-xl bg-surface-elevated/40">
                <div>
                  <div className="font-medium text-sm">{o.products?.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} • {o.order_status}</div>
                </div>
                <div className={`font-bold ${o.order_status === "completed" ? "text-success" : "text-muted-foreground"}`}>
                  +{(Number(o.amount) - Number(o.commission)).toLocaleString()} MAD
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
