import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: favorites } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("product_id").eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((d) => d.product_id));
    },
  });

  const toggle = async (productId: string) => {
    if (!user) { toast.error("Sign in to save favorites"); return; }
    const isFav = favorites?.has(productId);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, product_id: productId });
    }
    qc.invalidateQueries({ queryKey: ["favorites", user.id] });
  };

  return { favorites: favorites ?? new Set<string>(), toggle, isFavorite: (id: string) => favorites?.has(id) ?? false };
}
