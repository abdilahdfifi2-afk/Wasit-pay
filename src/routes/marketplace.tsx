import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, Heart, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/use-favorites";

const CATEGORIES = ["All", "Electronics", "Fashion", "Cars", "Home", "Beauty", "Sports", "Gaming", "Services"];

export const Route = createFileRoute("/marketplace")({
  validateSearch: (s: Record<string, unknown>) => ({
    category: (s.category as string) || "All",
    q: (s.q as string) || "",
    min: s.min ? Number(s.min) : undefined,
    max: s.max ? Number(s.max) : undefined,
  }),
  head: () => ({ meta: [{ title: "Marketplace — Wasit.pay" }] }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const { category, q, min, max } = Route.useSearch();
  const navigate = useNavigate({ from: "/marketplace" });
  const [search, setSearch] = useState(q);
  const { t } = useLanguage();
  const { isFavorite, toggle } = useFavorites();
  const [filterOpen, setFilterOpen] = useState(false);
  const [minDraft, setMinDraft] = useState(min?.toString() ?? "");
  const [maxDraft, setMaxDraft] = useState(max?.toString() ?? "");

  // Debounced search → URL
  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== q) {
        navigate({ search: (prev: any) => ({ ...prev, q: search || undefined }) as any, replace: true });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [search, q, navigate]);

  const setCat = (c: string) => {
    navigate({ search: (prev: any) => ({ ...prev, category: c === "All" ? undefined : c }) as any, replace: true });
  };

  const applyFilters = () => {
    const minN = minDraft ? Number(minDraft) : undefined;
    const maxN = maxDraft ? Number(maxDraft) : undefined;
    navigate({ search: (prev: any) => ({ ...prev, min: minN, max: maxN }) as any });
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setMinDraft(""); setMaxDraft("");
    navigate({ search: (prev: any) => ({ ...prev, min: undefined, max: undefined }) as any });
    setFilterOpen(false);
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", category, q, min, max],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(60);
      if (category !== "All") query = query.eq("category", category);
      if (q) query = query.ilike("title", `%${q}%`);
      if (min !== undefined) query = query.gte("price", min);
      if (max !== undefined) query = query.lte("price", max);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const hasActiveFilters = min !== undefined || max !== undefined;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />

      <section className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("market.search")}
              className="pl-10 h-12 glass border-border/60"
            />
          </div>
          <Button variant="outline" onClick={() => setFilterOpen(true)} className="glass border-border/60 h-12 relative">
            <SlidersHorizontal className="h-4 w-4 mr-2" /> {t("market.filters")}
            {hasActiveFilters && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />}
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === c
                  ? "bg-gradient-gold text-primary-foreground shadow-glow"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl aspect-[3/4] animate-shimmer" />
            ))}
          </div>
        ) : !products?.length ? (
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 rounded-full glass flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">{t("market.empty")}</h3>
            <p className="text-sm text-muted-foreground mt-2">{t("market.emptyDesc")}</p>
            <Link to="/sellers">
              <Button className="mt-6 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold">
                {t("market.startSelling")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="glass-card rounded-2xl overflow-hidden group hover:shadow-glow hover:-translate-y-1 transition-all"
              >
                <div className="aspect-square bg-surface-elevated relative overflow-hidden">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">📦</div>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(p.id); }}
                    aria-label="Toggle favorite"
                    className={`absolute top-2 right-2 z-10 h-8 w-8 rounded-full glass flex items-center justify-center transition-colors ${isFavorite(p.id) ? "text-destructive bg-destructive/10" : "hover:bg-primary/20"}`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite(p.id) ? "fill-current" : ""}`} />
                  </button>
                  <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full glass text-[10px] font-medium flex items-center gap-1 max-w-[calc(100%-2.75rem)]">
                    <ShieldCheck className="h-3 w-3 text-success shrink-0" /> <span className="truncate">{t("market.protected")}</span>
                  </div>
                </div>

                <div className="p-3">
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                  <div className="font-semibold text-sm mt-0.5 line-clamp-1">{p.title}</div>
                  <div className="text-lg font-bold text-gradient-gold mt-1">{Number(p.price).toLocaleString()} MAD</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("market.filters")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min price (MAD)</Label>
                <Input type="number" min="0" value={minDraft} onChange={(e) => setMinDraft(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Max price (MAD)</Label>
                <Input type="number" min="0" value={maxDraft} onChange={(e) => setMaxDraft(e.target.value)} placeholder="∞" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={clearFilters}>Clear</Button>
            <Button onClick={applyFilters} className="bg-gradient-gold text-primary-foreground font-semibold">Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
