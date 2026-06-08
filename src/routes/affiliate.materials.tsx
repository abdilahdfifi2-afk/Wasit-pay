import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Download, Share2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/affiliate/materials")({
  head: () => ({ meta: [{ title: "Marketing Materials — Wasit.pay" }] }),
  component: MaterialsPage,
});

const AD_COPY = [
  {
    title: "📢 إعلان قصير (واتساب / إنستا)",
    text: `🔒 سير من النصب فالأنترنت!
Wasit.pay كتحفظ ليك فلوسك حتى توصلك السلعة 💰
- بيع وشراء آمن 100%
- escrow معتمد
- support بالدارجة
سجل من هنا واخد مكافأة الترحيب 👇
{LINK}`,
  },
  {
    title: "🎯 إعلان للبائعين",
    text: `بائع أونلاين؟ خلي زبناءك يثقو فيك!
Wasit.pay = ضمان الفلوس قبل ما تسيفط الطلبية.
- 0 رسوم على التسجيل
- محفظة + سحب لحسابك البنكي
ابدا دابا 👉 {LINK}`,
  },
  {
    title: "💬 إعلان للمشترين",
    text: `كتخاف من الشراء أونلاين؟ Wasit.pay الحل ✅
الفلوس كتبقى عندنا حتى توصلك السلعة وتأكد منها.
- بلا نصب
- بلا قلق
جربها 👉 {LINK}`,
  },
  {
    title: "🚀 Story / Reel caption",
    text: `أول escrow مغربي 🇲🇦
بيع. شري. بثقة.
الرابط فالبيو 👇 {LINK}
#Wasit.pay #ضد_النصب`,
  },
];

const BANNERS = [
  { gradient: "from-primary via-primary-glow to-accent", title: "بيع وشراء بأمان", sub: "Wasit.pay يحفظ فلوسك" },
  { gradient: "from-accent via-warning to-primary", title: "ضد النصب فالنت", sub: "Escrow معتمد 🇲🇦" },
  { gradient: "from-success via-primary to-accent", title: "اربح من شاركتك", sub: "5% من كل صفقة" },
];

function MaterialsPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_or_create_affiliate_code").then(({ data }) => setCode((data as string) || ""));
  }, [user]);

  const refLink = typeof window !== "undefined" && code ? `${window.location.origin}/register?ref=${code}` : "";
  const sub = (t: string) => t.replaceAll("{LINK}", refLink || "[رابط الإحالة]");
  const copy = (t: string) => { navigator.clipboard.writeText(sub(t)); toast.success("تم النسخ ✓"); };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/affiliate"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold font-display">مواد التسويق</h1>
            <p className="text-sm text-muted-foreground">نسخ + شارك. الرابط ديالك مدمج تلقائياً.</p>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader><CardTitle>نصوص إعلانية جاهزة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {AD_COPY.map((ad, i) => (
              <div key={i} className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/40">
                <div className="flex justify-between items-start mb-2 gap-3">
                  <h3 className="font-semibold">{ad.title}</h3>
                  <Button size="sm" variant="outline" onClick={() => copy(ad.text)}><Copy className="h-3 w-3 mr-1" /> نسخ</Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground">{sub(ad.text)}</pre>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>بانرات (Banners)</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4">
            {BANNERS.map((b, i) => (
              <div key={i} className="space-y-2">
                <div className={`aspect-video rounded-2xl bg-gradient-to-br ${b.gradient} p-5 flex flex-col justify-end text-white shadow-elevated`}>
                  <div className="text-lg font-bold font-display">{b.title}</div>
                  <div className="text-xs opacity-90">{b.sub}</div>
                  <div className="text-[10px] opacity-70 mt-1">amanpay.ma</div>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => toast.info("Right-click → Save image")}>
                  <Download className="h-3 w-3 mr-1" /> حفظ
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>روابط ترويج</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <LinkRow label="رابط التسجيل" value={refLink} />
            <LinkRow label="رابط الصفحة الرئيسية" value={refLink ? `${window.location.origin}/?ref=${code}` : ""} />
            <LinkRow label="رابط المتجر" value={refLink ? `${window.location.origin}/marketplace?ref=${code}` : ""} />
            {refLink && (
              <Button
                className="w-full bg-gradient-gold text-primary-foreground"
                onClick={() => {
                  if (navigator.share) navigator.share({ title: "Wasit.pay", text: "بيع وشراء بأمان 🔒", url: refLink });
                  else { navigator.clipboard.writeText(refLink); toast.success("تم نسخ الرابط"); }
                }}
              >
                <Share2 className="h-4 w-4 mr-2" /> مشاركة
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <MobileNav />
    </div>
  );
}

function LinkRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 p-3 rounded-xl bg-surface-elevated/40 text-xs font-mono break-all">{value || "—"}</div>
      <Button size="sm" variant="outline" disabled={!value} onClick={() => { navigator.clipboard.writeText(value); toast.success("تم النسخ"); }}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
