import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Wasit.pay" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data: items } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("notifs-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (!user) return null;

  const unread = items?.filter((i) => !i.is_read).length ?? 0;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold font-display">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
          </div>
          {unread > 0 && <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4 mr-1" /> Mark all read</Button>}
        </div>

        {!items?.length ? (
          <div className="glass-card rounded-2xl py-16 text-center">
            <BellOff className="h-12 w-12 mx-auto opacity-30 mb-3" />
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Link key={n.id} to={n.link || "/"} className={`block glass-card rounded-2xl p-4 transition-all hover:shadow-glow ${!n.is_read ? "border-primary/40" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.is_read ? "bg-gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm flex items-center gap-2">{n.title}{!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{n.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
