import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { LayoutDashboard, Package, ShoppingBag, Wallet, MessageCircle, LogOut, Users, ShieldAlert, BarChart3, FileCheck, ShieldCheck, ArrowDownToLine, ScrollText } from "lucide-react";
import logoImg from "../../public/logo.png";
import { useAuth } from "@/lib/auth-context";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

type Item = { to: string; label: string; icon: typeof LayoutDashboard };

const SELLER_ITEMS: Item[] = [
  { to: "/seller", label: "Overview", icon: LayoutDashboard },
  { to: "/seller/products", label: "Products", icon: Package },
  { to: "/seller/orders", label: "Orders", icon: ShoppingBag },
  { to: "/seller/earnings", label: "Earnings", icon: Wallet },
  { to: "/wallet", label: "Wallet", icon: ArrowDownToLine },
  { to: "/seller/verify", label: "Verification", icon: ShieldCheck },
  { to: "/chat", label: "Messages", icon: MessageCircle },
];

const ADMIN_ITEMS: Item[] = [
  { to: "/admin", label: "Overview", icon: BarChart3 },
  { to: "/admin/payments", label: "Payment Reviews", icon: FileCheck },
  { to: "/admin/verifications", label: "KYC Reviews", icon: ShieldCheck },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { to: "/admin/orders", label: "All Orders", icon: ShoppingBag },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/disputes", label: "Disputes", icon: ShieldAlert },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function DashboardShell({ children, variant }: { children: ReactNode; variant: "seller" | "admin" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, user } = useAuth();
  const items = variant === "seller" ? SELLER_ITEMS : ADMIN_ITEMS;
  const title = variant === "seller" ? "Seller Studio" : "Admin Console";

  return (
    <div className="min-h-screen flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-40 glass border-r border-border/40">
        <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-border/40">
          <img src={logoImg} alt="Wasit.pay" className="h-9 w-9 rounded-xl shadow-glow" />
          <div>
            <div className="font-display font-bold leading-tight">Wasit<span className="text-gradient-gold">.pay</span></div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
          </div>
        </Link>

        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-gold text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/40">
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/40 transition-colors text-sm">
            <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 truncate">
              <div className="font-medium truncate">{user?.email}</div>
            </div>
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => signOut()} className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 min-w-0">
        {/* Mobile sub-nav */}
        <div className="md:hidden glass border-b border-border/40 px-4 h-14 flex items-center gap-3 sticky top-0 z-30 overflow-x-auto scrollbar-none">
          {items.map((it) => {
            const active = pathname === it.to;
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap px-3 py-1.5 rounded-full transition-all ${active ? "bg-gradient-gold text-primary-foreground" : "text-muted-foreground"}`}>
                <it.icon className="h-3.5 w-3.5" /> {it.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 md:p-8">{children}</div>
      </main>

      <MobileNav />
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string | number; sub?: string; icon: typeof LayoutDashboard; accent?: "gold" | "success" | "accent" | "warning" }) {
  const accents: Record<string, string> = {
    gold: "bg-gradient-gold text-primary-foreground",
    success: "bg-success/15 text-success",
    accent: "bg-accent/15 text-accent",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <div className="glass-card rounded-2xl p-5 hover:shadow-glow transition-all">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl md:text-3xl font-bold mt-1.5 font-display">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accents[accent ?? "gold"]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
