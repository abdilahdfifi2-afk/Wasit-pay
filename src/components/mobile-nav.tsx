import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, ShoppingBag, MessageCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

const tabs = [
  { to: "/", label: "Home", icon: Home, badgeKey: null },
  { to: "/marketplace", label: "Shop", icon: Search, badgeKey: null },
  { to: "/orders", label: "Orders", icon: ShoppingBag, badgeKey: null },
  { to: "/chat", label: "Chat", icon: MessageCircle, badgeKey: "chat" },
  { to: "/profile", label: "Profile", icon: User, badgeKey: null },
] as const;

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  useRealtimeInvalidation({
    channelName: `mobile-nav-messages-${user?.id ?? "anon"}`,
    enabled: !!user,
    tables: user ? [{ table: "messages", filter: `receiver_id=eq.${user.id}` }] : [],
    queryKeys: [["unread-messages", user?.id]],
  });

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-border/40 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16">
        {tabs.map(({ to, label, icon: Icon, badgeKey }) => {
          const active = pathname === to;
          const badge = badgeKey === "chat" ? unreadMessages : 0;
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-1 text-xs transition-colors relative"
            >
              <div className="relative">
                <Icon className={`h-5 w-5 transition-all ${active ? "text-primary scale-110" : "text-muted-foreground"}`} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className={active ? "text-primary font-semibold" : "text-muted-foreground"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
