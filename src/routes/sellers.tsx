import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Wallet, ShieldCheck, TrendingUp, Users, CheckCircle2, ArrowRight, Megaphone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sellers")({
  head: () => ({
    meta: [
      { title: "Sell on Wasit.pay — Reach Verified Buyers Safely" },
      { name: "description", content: "Open your shop on Wasit.pay and reach buyers who trust escrow. 5% flat commission, fast payouts, full protection." },
      { property: "og:title", content: "Sell on Wasit.pay" },
      { property: "og:description", content: "Reach thousands of escrow-protected buyers across Morocco. 5% commission, no hidden fees." },
    ],
  }),
  component: SellersLanding,
});

const benefits = [
  { icon: ShieldCheck, title: "Get paid guaranteed", desc: "The buyer's funds are locked in escrow before you ship. No more 'fake transfer' scams." },
  { icon: Wallet, title: "Fast payouts", desc: "Once the buyer confirms delivery, funds land in your wallet instantly. Withdraw anytime to your bank or mobile money." },
  { icon: Users, title: "Verified buyers only", desc: "Every buyer goes through KYC. You always know who's on the other side of the deal." },
  { icon: TrendingUp, title: "Low 5% commission", desc: "Transparent flat fee. No listing fees, no monthly subscription, no hidden charges." },
];

const steps = [
  { n: 1, title: "Create your account", desc: "Sign up free in under a minute." },
  { n: 2, title: "Verify your identity", desc: "Upload your CIN — our team reviews within 24h." },
  { n: 3, title: "List your products", desc: "Add photos, set your price, publish." },
  { n: 4, title: "Ship & get paid", desc: "Once buyer confirms, your wallet is credited." },
];

function SellersLanding() {
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass text-xs font-medium text-primary">
            <Store className="h-3.5 w-3.5" /> Built for Moroccan sellers
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Sell safer.<br /><span className="text-gradient-gold">Get paid every time.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Stop losing deals to "I'll transfer when I receive it" scams. With Wasit.pay, the buyer's money is locked in escrow before you ship a single package.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"><Button size="lg" className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold h-12 px-8">Open your shop <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/how-it-works"><Button size="lg" variant="outline" className="h-12 px-8 glass border-border/60">How it works</Button></Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((b) => (
            <div key={b.title} className="glass-card rounded-3xl p-6 group hover:shadow-glow transition-all">
              <div className="h-12 w-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow mb-4">
                <b.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="glass-card rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center mb-10">From signup to first sale</h2>
          <div className="grid md:grid-cols-4 gap-5">
            {steps.map((s) => (
              <div key={s.n} className="text-center relative">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-4 shadow-glow">{s.n}</div>
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="glass-card rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Megaphone className="h-3 w-3" /> Earn extra
            </div>
            <h2 className="text-3xl font-bold">Refer & earn 5%</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Every seller you bring to Wasit.pay earns you 5% of our commission on every order they make. Stackable, automatic, paid to your wallet.
            </p>
            <Link to="/affiliate"><Button className="mt-5 bg-gradient-gold text-primary-foreground font-semibold shadow-glow">Open affiliate dashboard</Button></Link>
          </div>
          <div className="space-y-3">
            {["Refer sellers and buyers", "5% on every commission, forever", "Tracked clicks + transparent dashboard", "Withdraw from 50 MAD"].map((t) => (
              <div key={t} className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated/50 border border-border/40">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="rounded-3xl bg-gradient-gold p-10 md:p-14 text-center shadow-elevated">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">Open your shop in minutes</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">Join hundreds of Moroccan sellers who finally trade without fear.</p>
          <Link to="/register"><Button size="lg" className="mt-7 h-12 px-8 bg-background text-foreground hover:bg-background/90 font-semibold">Create my shop <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
      </section>

      <MobileNav />
    </div>
  );
}
