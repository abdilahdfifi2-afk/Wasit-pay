import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, ArrowLeft, Heart, Star, Loader2, MessageCircle, Package, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/use-favorites";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  head: () => ({ meta: [{ title: "Product — Wasit.pay" }] }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isFavorite, toggle } = useFavorites();
  const [creating, setCreating] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: seller } = useQuery({
    queryKey: ["seller-profile", product?.seller_id],
    enabled: !!product?.seller_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url, created_at").eq("id", product!.seller_id).maybeSingle();
      return data;
    },
  });

  const { data: sellerRating } = useQuery({
    queryKey: ["seller-rating", product?.seller_id],
    enabled: !!product?.seller_id,
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("rating").eq("reviewed_user_id", product!.seller_id);
      const ratings = (data ?? []).map((r) => r.rating);
      if (!ratings.length) return { avg: 0, count: 0 };
      return { avg: ratings.reduce((a, b) => a + b, 0) / ratings.length, count: ratings.length };
    },
  });

  const { data: productReviews } = useQuery({
    queryKey: ["product-reviews", product?.seller_id],
    enabled: !!product?.seller_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("reviewed_user_id", product!.seller_id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!data?.length) return [];
      const ids = Array.from(new Set(data.map((r) => r.reviewer_id)));
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return data.map((r) => ({ ...r, profile: pm.get(r.reviewer_id) }));
    },
  });

  const buyNow = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (!product) return;
    setCreating(true);
    const commission = Number(product.price) * 0.05;
    const { data, error } = await supabase.from("orders").insert({
      buyer_id: user.id,
      seller_id: product.seller_id,
      product_id: product.id,
      amount: product.price,
      commission,
    }).select().single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Order created");
    navigate({ to: "/checkout/$orderId", params: { orderId: data.id } });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-semibold">{t("product.notFound")}</h2>
          <Link to="/marketplace"><Button className="mt-4">{t("nav.marketplace")}</Button></Link>
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const conditionKey = (`product.condition.${product.condition}` as "product.condition.new" | "product.condition.like_new" | "product.condition.used");

  return (
    <div className="min-h-screen pb-32 md:pb-12">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6">
        <Link to="/marketplace" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("product.back")}
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="glass-card rounded-3xl overflow-hidden aspect-square">
              {images[activeImg] ? (
                <img src={images[activeImg]} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl opacity-30">📦</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? "border-primary shadow-glow" : "border-border/40 opacity-70 hover:opacity-100"}`}
                  >
                    <img src={url} alt={`${product.title} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> {t("product.escrow")}
              </span>
              <span className="px-2.5 py-1 rounded-full glass text-xs font-medium">{product.category}</span>
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{t(conditionKey)}</span>
            </div>
            <h1 className="text-3xl font-bold">{product.title}</h1>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} className={`h-4 w-4 ${(sellerRating?.avg ?? 0) >= n - 0.5 ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
              ))}
              <span className="text-muted-foreground ml-1">
                {sellerRating?.count ? `${sellerRating.avg.toFixed(1)} (${sellerRating.count} review${sellerRating.count > 1 ? "s" : ""})` : "No reviews yet"}
              </span>
            </div>

            <div className="mt-6 text-5xl font-bold text-gradient-gold">
              {Number(product.price).toLocaleString()} <span className="text-2xl">MAD</span>
            </div>

            <p className="mt-6 text-muted-foreground leading-relaxed">{product.description || "No description provided."}</p>

            {seller && product.seller_id !== user?.id && (
              <Link to="/chat" search={{ to: product.seller_id }} className="mt-6 flex items-center gap-3 p-3 rounded-2xl glass-card hover:bg-primary/5 transition-colors">
                <div className="h-11 w-11 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold">
                  {seller.full_name?.[0]?.toUpperCase() ?? "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">{t("product.seller")}</div>
                  <div className="font-semibold truncate">{seller.full_name || "Wasit.pay Seller"}</div>
                </div>
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </Link>
            )}

            <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
              <div className="glass-card rounded-xl p-3 text-center">
                <ShieldCheck className="h-4 w-4 mx-auto mb-1 text-success" />
                <div className="font-medium">Escrow</div>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <Truck className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="font-medium">Tracked</div>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <Package className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="font-medium">Refund</div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button onClick={buyNow} disabled={creating || user?.id === product.seller_id} className="flex-1 h-12 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : user?.id === product.seller_id ? t("product.yourListing") : t("product.buyNow")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggle(product.id)}
                className={`h-12 w-12 glass border-border/60 ${isFavorite(product.id) ? "text-destructive" : ""}`}
              >
                <Heart className={`h-5 w-5 ${isFavorite(product.id) ? "fill-current" : ""}`} />
              </Button>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-surface-elevated/50 border border-border/40 text-sm text-muted-foreground">
              <strong className="text-foreground">100% Safe.</strong> {t("product.safeNote")}
            </div>
          </div>
        </div>

        {productReviews && productReviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Seller reviews</h2>
            <div className="space-y-3">
              {productReviews.map((r: any) => (
                <div key={r.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
                      {r.profile?.avatar_url ? <img src={r.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (r.profile?.full_name?.[0]?.toUpperCase() ?? "U")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.profile?.full_name ?? "Buyer"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`h-3.5 w-3.5 ${r.rating >= n ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
