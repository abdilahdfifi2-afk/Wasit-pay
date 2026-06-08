import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Store, ShieldCheck, LogOut, ChevronRight, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/avatar-upload";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Wasit.pay" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isSeller, isAdmin, signOut, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: kyc } = useQuery({
    queryKey: ["my-kyc-status", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("seller_verifications").select("status").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const kycStatus = kyc?.status ?? null;
  const statusLabel = kycStatus === "approved" ? "Verified"
    : kycStatus === "pending" ? "In review"
    : kycStatus === "rejected" ? "Rejected"
    : "Not verified";
  const statusClass = kycStatus === "approved" ? "text-success"
    : kycStatus === "pending" ? "text-warning"
    : kycStatus === "rejected" ? "text-destructive"
    : "text-muted-foreground";

  const becomeSeller = () => {
    navigate({ to: "/seller/verify" });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Sign in to view your profile</h2>
          <Link to="/login"><Button className="bg-gradient-gold text-primary-foreground">Sign in</Button></Link>
        </div>
      </div>
    );
  }

  const menuItems = [
    { to: "/orders", label: "My orders", icon: ShieldCheck },
    { to: "/wallet", label: "Wallet & earnings", icon: Wallet },
    { to: "/affiliate", label: "Affiliate · اربح 5%", icon: Megaphone },
    ...(isSeller ? [{ to: "/seller", label: "Seller dashboard", icon: Store }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin panel", icon: ShieldCheck }] : []),
  ] as const;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="glass-card rounded-3xl p-6 mb-6 text-center">
          <div className="flex justify-center">
            <AvatarUpload
              userId={user.id}
              avatarPath={profile?.avatar_url}
              size="lg"
              onUploaded={() => qc.invalidateQueries({ queryKey: ["profile", user.id] })}
            />
          </div>
          <h1 className="text-2xl font-bold mt-4">{profile?.full_name || user.email}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-surface-elevated/60">
              <div className="text-xs text-muted-foreground">Wallet</div>
              <div className="text-lg font-bold text-gradient-gold">{Number(profile?.wallet_balance ?? 0).toFixed(2)} MAD</div>
            </div>
            <Link to="/seller/verify" className="p-3 rounded-2xl bg-surface-elevated/60 hover:bg-surface-elevated transition-colors text-left">
              <div className="text-xs text-muted-foreground">KYC</div>
              <div className={`text-lg font-bold ${statusClass}`}>{statusLabel}</div>
            </Link>
          </div>
        </div>

        <div className="glass-card rounded-2xl divide-y divide-border/40 mb-6">
          {menuItems.map((m) => (
            <Link key={m.to} to={m.to} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
              <m.icon className="h-5 w-5 text-primary" />
              <span className="flex-1 font-medium">{m.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        {!isSeller && (
          <Button onClick={becomeSeller} className="w-full h-12 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold mb-3">
            <Store className="h-4 w-4 mr-2" /> Become a seller
          </Button>
        )}

        <Button onClick={() => signOut()} variant="outline" className="w-full h-12">
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
      <MobileNav />
    </div>
  );
}
