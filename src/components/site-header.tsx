import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, User, ShoppingBag, Globe } from "lucide-react";
import logoImg from "../../public/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGS, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t, language, setLanguage } = useLanguage();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  useRealtimeInvalidation({
    channelName: `site-header-notifications-${user?.id ?? "anon"}`,
    enabled: !!user,
    tables: user ? [{ table: "notifications", filter: `user_id=eq.${user.id}` }] : [],
    queryKeys: [["notifications-unread", user?.id]],
  });

  const navItems = [
    { to: "/marketplace", label: t("nav.marketplace") },
    { to: "/how-it-works", label: t("nav.howItWorks") },
    { to: "/sellers", label: t("nav.sellers") },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logoImg} alt="Wasit.pay" className="h-9 w-9 rounded-xl shadow-glow" />
          <span className="font-display text-xl font-bold tracking-tight">
            Wasit<span className="text-gradient-gold">.pay</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === item.to ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Language">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGS.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code as Lang)} className={language === l.code ? "bg-primary/10" : ""}>
                  <span className="mr-2">{l.flag}</span> {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <>
              <Link to="/orders" className="hidden sm:inline-flex">
                <Button variant="ghost" size="icon"><ShoppingBag className="h-5 w-5" /></Button>
              </Link>
              <Link to="/notifications" className="hidden sm:inline-flex relative">
                <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut()} className="hidden md:inline-flex">{t("nav.signOut")}</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">{t("nav.signIn")}</Button></Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold">
                  {t("nav.getStarted")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
