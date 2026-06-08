import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "All Products — Admin" }] }),
  component: AdminProducts,
});

function AdminProducts() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeInvalidation({
    channelName: "admin-products-live",
    enabled: isAdmin,
    tables: [{ table: "products" }],
    queryKeys: [["admin-products"], ["admin-stats"]],
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    setDeleting(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    setDeleting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  if (!isAdmin) return null;

  return (
    <DashboardShell variant="admin">
      <h1 className="text-2xl md:text-3xl font-bold font-display mb-6">All products</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products?.map((p) => (
          <div key={p.id} className="glass-card rounded-2xl overflow-hidden">
            <div className="aspect-square bg-surface-elevated">
              {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-4xl opacity-30">📦</div>}
            </div>
            <div className="p-3">
              <div className="font-semibold text-sm line-clamp-1">{p.title}</div>
              <div className="text-base font-bold text-gradient-gold mt-1">{Number(p.price).toLocaleString()} MAD</div>
              <div className="text-[10px] text-muted-foreground mt-1 uppercase">{p.status} • {p.category}</div>
              <Button size="sm" variant="outline" disabled={deleting === p.id} onClick={() => remove(p.id)} className="w-full mt-2 hover:bg-destructive/20 hover:text-destructive">
                {deleting === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" /> Remove</>}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!products?.length && <div className="glass-card rounded-2xl py-12 text-center text-muted-foreground text-sm">No products.</div>}
    </DashboardShell>
  );
}
