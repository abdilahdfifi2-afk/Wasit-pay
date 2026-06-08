import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DollarSign, Package, ShoppingBag, Plus, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/seller")({
  head: () => ({ meta: [{ title: "Seller Dashboard — Wasit.pay" }] }),
  component: SellerRoute,
});

function SellerRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/seller") return <Outlet />;
  return <SellerOverview />;
}

function SellerOverview() {
  const { user, loading, isSeller } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/seller" } as any });
  }, [loading, user, navigate]);

  const { data: stats } = useQuery({
    queryKey: ["seller-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: products }, { data: orders }] = await Promise.all([
        supabase.from("products").select("id, status").eq("seller_id", user!.id),
        supabase.from("orders").select("id, amount, commission, order_status, created_at, products(title)").eq("seller_id", user!.id).order("created_at", { ascending: false }),
      ]);
      const completed = (orders ?? []).filter((o) => o.order_status === "completed");
      const pending = (orders ?? []).filter((o) => ["paid", "shipped"].includes(o.order_status));
      const earnings = completed.reduce((s, o) => s + (Number(o.amount) - Number(o.commission)), 0);
      return {
        products: products ?? [],
        orders: orders ?? [],
        completed: completed.length,
        pending: pending.length,
        earnings,
      };
    },
  });

  if (!user) return null;

  return (
    <DashboardShell variant="seller">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Welcome back 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">Here's what's happening with your shop today.</p>
        </div>
        {isSeller && (
          <Link to="/seller/products"><Button className="bg-gradient-gold text-primary-foreground shadow-glow font-semibold"><Plus className="h-4 w-4 mr-1" /> New product</Button></Link>
        )}
      </div>

      {!isSeller && (
        <div className="glass-card rounded-3xl p-6 md:p-8 mb-8 border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow flex-shrink-0">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Get verified to start selling</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Upload your CIN and a selfie. Our team reviews in under 24h — then you can list products and receive escrow-protected payments.
              </p>
              <Link to="/seller/verify">
                <Button className="mt-4 bg-gradient-gold text-primary-foreground shadow-glow font-semibold">
                  Verify my identity
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total earnings" value={`${(stats?.earnings ?? 0).toLocaleString()} MAD`} sub="After commission" icon={DollarSign} accent="gold" />
        <StatCard label="Active products" value={stats?.products.filter(p => p.status === "active").length ?? 0} sub={`${stats?.products.length ?? 0} total`} icon={Package} accent="accent" />
        <StatCard label="Pending orders" value={stats?.pending ?? 0} sub="Awaiting shipping" icon={Clock} accent="warning" />
        <StatCard label="Completed sales" value={stats?.completed ?? 0} sub="Lifetime" icon={CheckCircle2} accent="success" />
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Recent orders</h2>
          <Link to="/seller/orders" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {!stats?.orders.length ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No orders yet — list your first product to start earning.
          </div>
        ) : (
          <div className="space-y-2">
            {stats.orders.slice(0, 5).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40 hover:bg-surface-elevated/70 transition-colors">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{o.products?.title ?? "Product"}</div>
                  <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gradient-gold">{Number(o.amount).toLocaleString()} MAD</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.order_status.replace(/_/g, " ")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
