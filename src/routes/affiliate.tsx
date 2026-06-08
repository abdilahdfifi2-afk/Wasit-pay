import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, DollarSign, Users, MousePointerClick, TrendingUp, Wallet, Megaphone, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/affiliate")({
  head: () => ({ meta: [
    { title: "Affiliate — Wasit.pay" },
    { name: "description", content: "اربح عمولات من كل صفقة عبر برنامج شركاء Wasit.pay" },
  ]}),
  component: AffiliatePage,
});

function AffiliatePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_or_create_affiliate_code");
      if (!error && data) setCode(data as string);
    })();
  }, [user]);

  const { data: stats } = useQuery({
    queryKey: ["affiliate-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: refs }, { data: comms }, { count: clicks }] = await Promise.all([
        supabase.from("affiliate_referrals").select("id, first_order_id").eq("referrer_id", user!.id),
        supabase.from("affiliate_commissions").select("amount, status").eq("affiliate_id", user!.id),
        supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).eq("code", code || "___"),
      ]);
      const list = comms ?? [];
      const sum = (s: string) => list.filter((c) => c.status === s).reduce((a, c) => a + Number(c.amount), 0);
      return {
        signups: refs?.length ?? 0,
        conversions: refs?.filter((r) => r.first_order_id).length ?? 0,
        clicks: clicks ?? 0,
        pending: sum("pending"),
        confirmed: sum("confirmed"),
        paid: sum("paid"),
      };
    },
  });

  const { data: history } = useQuery({
    queryKey: ["affiliate-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_commissions")
        .select("amount, status, kind, created_at, confirm_after")
        .eq("affiliate_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const payout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("affiliate_payout");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (total) => {
      toast.success(`تم تحويل ${total} MAD إلى محفظتك`);
      qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
      qc.invalidateQueries({ queryKey: ["affiliate-history"] });
    },
    onError: (e: any) => toast.error(e.message || "Payout failed"),
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">سجّل دخول باش تبدأ تربح</h2>
          <Link to="/login"><Button className="bg-gradient-gold text-primary-foreground">Sign in</Button></Link>
        </div>
      </div>
    );
  }

  const refLink = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${code}` : `?ref=${code}`;
  const copy = (txt: string, msg = "تم النسخ") => { navigator.clipboard.writeText(txt); toast.success(msg); };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div className="glass-card rounded-3xl p-6 bg-gradient-hero">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display">برنامج الشركاء 🤝</h1>
              <p className="text-sm text-muted-foreground mt-1">شارك Wasit.pay واربح <b className="text-gradient-gold">5%</b> من عمولة كل صفقة ناجحة.</p>
            </div>
            <Link to="/affiliate/materials">
              <Button variant="outline"><Megaphone className="h-4 w-4 mr-2" /> مواد التسويق</Button>
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="glass-card rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">رابط الإحالة ديالك</div>
              <div className="font-mono text-sm break-all">{refLink}</div>
            </div>
            <div className="flex gap-2 items-center">
              <Button onClick={() => copy(refLink)} className="bg-gradient-gold text-primary-foreground"><Copy className="h-4 w-4 mr-2" /> نسخ الرابط</Button>
              <Button variant="outline" onClick={() => copy(code, `الكود: ${code}`)}>كود: <span className="font-mono ml-1">{code || "..."}</span></Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="نقرات" value={stats?.clicks ?? 0} icon={MousePointerClick} color="text-primary" />
          <Stat label="تسجيلات" value={stats?.signups ?? 0} icon={Users} color="text-accent" />
          <Stat label="صفقات أولى" value={stats?.conversions ?? 0} icon={TrendingUp} color="text-success" />
          <Stat label="إجمالي مدفوع" value={`${stats?.paid?.toFixed(2) ?? 0} MAD`} icon={CheckCircle2} color="text-success" />
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> الأرباح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              <Earn label="قيد التأكيد (7 أيام)" value={stats?.pending ?? 0} icon={Clock} accent="warning" />
              <Earn label="جاهز للسحب" value={stats?.confirmed ?? 0} icon={DollarSign} accent="success" />
              <Earn label="مدفوع" value={stats?.paid ?? 0} icon={CheckCircle2} accent="muted" />
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground">الحد الأدنى للسحب: <b>50 MAD</b>. التحويل ديريكت لمحفظتك ومن بعد كتقدر تطلب CashPlus / تحويل بنكي.</p>
              <Button
                disabled={payout.isPending || (stats?.confirmed ?? 0) < 50}
                onClick={() => payout.mutate()}
                className="bg-gradient-gold text-primary-foreground"
              >
                {payout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "سحب الأرباح للمحفظة"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>آخر العمولات</CardTitle></CardHeader>
          <CardContent>
            {!history?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">ما كاينش عمولات بعد. شارك الرابط ديالك! 🚀</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>التاريخ</TableHead><TableHead>النوع</TableHead><TableHead>الحالة</TableHead><TableHead className="text-right">المبلغ</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {history.map((c: any, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${c.kind === "first_order" ? "bg-accent/20 text-accent" : "bg-muted"}`}>{c.kind === "first_order" ? "أول صفقة" : c.kind === "bonus" ? "مكافأة" : "صفقة"}</span></TableCell>
                      <TableCell><span className={`text-xs ${c.status === "paid" ? "text-success" : c.status === "confirmed" ? "text-primary" : c.status === "cancelled" ? "text-destructive" : "text-warning"}`}>{c.status}</span></TableCell>
                      <TableCell className="text-right font-bold">+{Number(c.amount).toFixed(2)} MAD</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display font-bold mb-3">كيف تخدم؟</h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
            <li>نسخ الرابط ديالك أو الكود.</li>
            <li>شارك مع صحابك / فالسوشيال / فالواتساب.</li>
            <li>كي يسجل شي مستخدم بالكود، كيتربط بيك للأبد.</li>
            <li>كل صفقة ناجحة كتربح 5% من عمولة Wasit.pay (قيد التأكيد 7 أيام).</li>
            <li>عند 50 MAD مأكدة، تقدر تسحبها لمحفظتك.</li>
          </ol>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Earn({ label, value, icon: Icon, accent }: any) {
  const cls = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-muted-foreground";
  return (
    <div className="p-4 rounded-2xl bg-surface-elevated/40">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Icon className={`h-4 w-4 ${cls}`} /> {label}</div>
      <div className={`text-xl font-bold ${cls}`}>{Number(value).toFixed(2)} MAD</div>
    </div>
  );
}
