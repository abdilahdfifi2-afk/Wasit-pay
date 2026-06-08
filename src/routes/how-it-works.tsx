import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, ShieldCheck, Truck, CheckCircle2, Lock, MessageSquareWarning, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";

// Kept for backward-compat with /sellers route until it's also rewritten
export function ComingSoon({ title, desc, cta }: { title: string; desc: string; cta?: { to: string; label: string } }) {
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />
      <div className="container mx-auto px-4 py-20 text-center max-w-xl">
        <h1 className="text-3xl font-bold mt-6">{title}</h1>
        <p className="text-muted-foreground mt-3">{desc}</p>
        {cta && <Link to={cta.to}><Button className="mt-6 bg-gradient-gold text-primary-foreground font-semibold shadow-glow">{cta.label}</Button></Link>}
      </div>
      <MobileNav />
    </div>
  );
}

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Wasit.pay Works — Safe Escrow Transactions" },
      { name: "description", content: "Learn how Wasit.pay's escrow protects buyers and sellers in 4 simple steps. No scams, no risks." },
      { property: "og:title", content: "How Wasit.pay Works" },
      { property: "og:description", content: "Escrow-protected buying & selling in Morocco. Step-by-step guide." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { n: 1, title: "Buyer places order", desc: "Browse the marketplace and order any verified product. An order is created in pending state.", icon: Banknote },
  { n: 2, title: "Buyer pays Wasit.pay", desc: "Funds are sent to Wasit.pay (not the seller). We hold them in escrow — fully protected.", icon: Lock },
  { n: 3, title: "Seller ships the item", desc: "Once our team verifies the payment, the seller is notified and ships with confidence.", icon: Truck },
  { n: 4, title: "Buyer confirms delivery", desc: "Buyer inspects the item and confirms receipt. Wasit.pay releases funds to the seller's wallet.", icon: CheckCircle2 },
];

const protections = [
  { icon: ShieldCheck, title: "Manual verification", desc: "Real humans verify every payment proof before the seller ships. No automated mistakes." },
  { icon: MessageSquareWarning, title: "Open a dispute anytime", desc: "If the item never arrives or doesn't match, open a dispute. An admin reviews evidence and decides." },
  { icon: Lock, title: "Funds never sent directly", desc: "Buyers never pay sellers directly. Wasit.pay always sits between you — that's the whole point of escrow." },
];

function HowItWorks() {
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass text-xs font-medium text-primary">
            <Lock className="h-3.5 w-3.5" /> Safer than direct payments
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            How <span className="text-gradient-gold">Wasit.pay</span> protects every deal
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Wasit.pay is an escrow intermediary. We hold the buyer's money until the buyer confirms they received exactly what they paid for.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="glass-card rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute top-3 right-4 text-6xl font-bold text-primary/5 group-hover:text-primary/10 transition-colors">{s.n}</div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow mb-4">
                <s.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="glass-card rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center mb-10">Your protections</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {protections.map((p) => (
              <div key={p.title} className="text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <p.icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="rounded-3xl bg-gradient-gold p-10 md:p-14 text-center shadow-elevated">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">Ready to trade safely?</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">Browse verified listings or sign up to start selling under escrow protection.</p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/marketplace"><Button size="lg" className="bg-background text-foreground hover:bg-background/90 font-semibold h-12 px-8">Browse marketplace <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/sellers"><Button size="lg" variant="outline" className="h-12 px-8 border-background/40 text-primary-foreground hover:bg-background/10">Start selling</Button></Link>
          </div>
        </div>
      </section>

      <MobileNav />
    </div>
  );
}
