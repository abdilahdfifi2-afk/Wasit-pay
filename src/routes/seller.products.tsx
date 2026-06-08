import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, Upload, X, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/products")({
  head: () => ({ meta: [{ title: "My Products — Wasit.pay" }] }),
  component: SellerProducts,
});

const CATEGORIES = ["Electronics", "Fashion", "Cars", "Home", "Beauty", "Sports", "Gaming", "Services"];

type Form = {
  id?: string;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  status: string;
  images: string[];
};

const EMPTY: Form = { title: "", description: "", price: "", category: "Electronics", condition: "new", status: "active", images: [] };

function SellerProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["seller-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const uploadImages = async (files: FileList) => {
    if (!user) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
  };

  const save = async () => {
    if (!user) return;
    if (!form.title || !form.price) { toast.error("Title and price required"); return; }
    setSaving(true);
    const payload = {
      seller_id: user.id,
      title: form.title,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      condition: form.condition,
      status: form.status as "active" | "sold" | "draft",
      images: form.images,
    };
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? "Product updated" : "Product listed!");
    setOpen(false);
    setForm(EMPTY);
    qc.invalidateQueries({ queryKey: ["seller-products"] });
  };

  const edit = (p: any) => {
    setForm({ id: p.id, title: p.title, description: p.description ?? "", price: String(p.price), category: p.category, condition: p.condition, status: p.status, images: p.images ?? [] });
    setOpen(true);
  };

  const toggleStatus = async (p: any) => {
    const next = p.status === "active" ? "draft" : "active";
    await supabase.from("products").update({ status: next }).eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["seller-products"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["seller-products"] });
    toast.success("Deleted");
  };

  return (
    <DashboardShell variant="seller">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">My Products</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your inventory and listings.</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }} className="bg-gradient-gold text-primary-foreground shadow-glow font-semibold">
          <Plus className="h-4 w-4 mr-1" /> New product
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="glass-card rounded-2xl aspect-[3/4] animate-shimmer" />)}</div>
      ) : !products?.length ? (
        <div className="glass-card rounded-2xl py-16 text-center">
          <Package className="h-12 w-12 mx-auto opacity-30 mb-3" />
          <h3 className="font-semibold">No products yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Click "New product" to list your first item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="glass-card rounded-2xl overflow-hidden group">
              <div className="aspect-square bg-surface-elevated relative">
                {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-4xl opacity-30">📦</div>}
                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.status === "active" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                  {p.status}
                </div>
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm line-clamp-1">{p.title}</div>
                <div className="text-base font-bold text-gradient-gold mt-1">{Number(p.price).toLocaleString()} MAD</div>
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => edit(p)}><Edit2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => toggleStatus(p)}>{p.status === "active" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>
                  <Button size="sm" variant="outline" className="h-8 hover:bg-destructive/20 hover:text-destructive" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border/40 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{form.id ? "Edit product" : "List a new product"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" maxLength={120} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={3} maxLength={2000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (MAD)</Label>
                <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="like_new">Like new</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (visible)</SelectItem>
                    <SelectItem value="draft">Draft (hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Images</Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {form.images.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-surface-elevated relative overflow-hidden group">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-border/60 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadImages(e.target.files)} />
                </label>
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="w-full h-11 bg-gradient-gold text-primary-foreground shadow-glow font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? "Save changes" : "Publish product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
