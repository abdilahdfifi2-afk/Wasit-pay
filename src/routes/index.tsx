import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Banknote, CheckCircle2, ArrowRight, Star, Smartphone, TrendingUp, Users, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wasit.pay — Trusted Escrow Marketplace in Morocco" },
      { name: "description", content: "Buy and sell safely with manual escrow protection. Wasit.pay holds funds until delivery is confirmed." },
    ],
  }),
  component: LandingPage,
});

const categories = [
  { name: "Electronics", emoji: "📱", count: "2.4k" },
  { name: "Fashion", emoji: "👜", count: "1.8k" },
  { name: "Cars", emoji: "🚗", count: "640" },
  { name: "Home", emoji: "🏠", count: "1.2k" },
  { name: "Beauty", emoji: "💄", count: "920" },
  { name: "Sports", emoji: "⚽", count: "480" },
  { name: "Gaming", emoji: "🎮", count: "1.1k" },
  { name: "Services", emoji: "💼", count: "320" },
];

const steps = [
  { n: 1, title: "Buyer pays Wasit.pay", desc: "Funds are held safely in escrow, never sent directly to the seller.", icon: Banknote },
  { n: 2, title: "Seller ships the order", desc: "Once we verify payment, the seller ships with confidence.", icon: Shield },
  { n: 3, title: "Buyer confirms delivery", desc: "Wasit.pay releases funds to the seller. Everyone wins.", icon: CheckCircle2 },
];

const trustPoints = [
  { icon: Lock, title: "Bank-grade security", desc: "Encrypted transactions, verified accounts, dispute resolution." },
  { icon: Shield, title: "Manual escrow", desc: "Real humans verify every payment before release." },
  { icon: TrendingUp, title: "Low commission", desc: "Transparent fees. No hidden charges, ever." },
  { icon: Smartphone, title: "Mobile-first", desc: "Built like a real banking app. Fast, smooth, installable." },
];

function LandingPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative container mx-auto px-4 pt-16 md:pt-24 pb-20 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass text-xs font-medium text-primary border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              Morocco's #1 Trusted Escrow Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Trade safely.<br />
              <span className="text-gradient-gold">Pay with confidence.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Wasit.pay holds your money in escrow until you confirm delivery.
              Real protection for buyers and sellers across Morocco.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/marketplace">
                <Button size="lg" className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold h-12 px-8 text-base">
                  Browse marketplace <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/seller">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base glass border-border/60">
                  Start selling
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { v: "50K+", l: "Active users" },
                { v: "MAD 12M+", l: "Protected" },
                { v: "99.8%", l: "Safe deals" },
              ].map((s) => (
                <div key={s.l} className="glass-card rounded-2xl p-4">
                  <div className="text-2xl md:text-3xl font-bold text-gradient-gold">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Shop by category</h2>
            <p className="text-muted-foreground mt-2">Discover thousands of verified listings</p>
          </div>
          <Link to="/marketplace" className="text-sm text-primary font-medium hidden md:inline-flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map((c) => (
            <Link
              key={c.name}
              to="/marketplace"
              search={{ category: c.name }}
              className="glass-card rounded-2xl p-4 text-center hover:scale-105 hover:shadow-glow transition-all group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{c.emoji}</div>
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.count} items</div>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-xs font-medium text-primary">
            <Lock className="h-3 w-3" /> How escrow works
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">Safe trades in 3 steps</h2>
          <p className="text-muted-foreground mt-3">Manual verification by real humans. Zero scams.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="glass-card rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-4 right-4 text-7xl font-bold text-primary/5 group-hover:text-primary/10 transition-colors">
                {s.n}
              </div>
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow mb-5">
                  <s.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="container mx-auto px-4 py-16">
        <div className="glass-card rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Built for trust.<br />Designed for Morocco.</h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                Every order goes through manual verification. We check payment proofs,
                hold funds securely, and only release after you confirm delivery.
              </p>
              <div className="flex items-center gap-1 mt-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-primary text-primary" />)}
                <span className="ml-2 text-sm text-muted-foreground">4.9/5 from 8,000+ users</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {trustPoints.map((t) => (
                <div key={t.title} className="p-5 rounded-2xl bg-surface-elevated/50 border border-border/40">
                  <t.icon className="h-6 w-6 text-primary mb-3" />
                  <div className="font-semibold text-sm">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-gold p-12 md:p-16 text-center shadow-elevated">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground">Ready to trade safely?</h2>
            <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
              Join 50,000+ Moroccans buying and selling with peace of mind.
            </p>
            <Link to="/register">
              <Button size="lg" className="mt-8 h-12 px-8 bg-background text-foreground hover:bg-background/90 font-semibold">
                Create free account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4 mb-3">
            <Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
            <span className="text-border">·</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
          </div>
          <p>© {new Date().getFullYear()} Wasit.pay. {t("footer.rights")} 🇲🇦</p>
        </div>
      </footer>

      <MobileNav />
    </div>
  );
}
