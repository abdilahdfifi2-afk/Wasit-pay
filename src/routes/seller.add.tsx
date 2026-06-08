import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Loader2, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/add")({
  head: () => ({ meta: [{ title: "Create a Listing — Wasit.pay" }] }),
  component: AddListing,
});

const CATEGORIES = ["Electronics", "Fashion", "Cars", "Home", "Beauty", "Sports", "Gaming", "Services"];
const MAX_IMAGES = 8;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function AddListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "Electronics",
    condition: "new",
    images: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadImages = async (files: FileList) => {
    if (!user) return;
    const remaining = MAX_IMAGES - form.images.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_IMAGES} images`); return; }
    const accepted = Array.from(files).slice(0, remaining);
    setUploading(true);
    const urls: string[] = [];
    for (const file of accepted) {
      if (!ALLOWED_TYPES.includes(file.type)) { toast.error(`${file.name}: only JPG/PNG/WebP/GIF`); continue; }
      if (file.size > MAX_FILE_BYTES) { toast.error(`${file.name}: exceeds 5MB`); continue; }
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) { toast.error(error.message); continue; }
      const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
    if (urls.length) toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in"); return; }
    const title = form.title.trim();
    if (title.length < 3) { toast.error("Title must be at least 3 characters"); return; }
    if (title.length > 120) { toast.error("Title too long"); return; }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) { toast.error("Price must be a positive number"); return; }
    if (price > 1_000_000) { toast.error("Price too high"); return; }
    if (form.description.length > 2000) { toast.error("Description too long"); return; }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      seller_id: user.id,
      title,
      description: form.description.trim(),
      price,
      category: form.category,
      condition: form.condition,
      status: "active",
      images: form.images,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Listing created!");
    navigate({ to: "/seller/products" });
  };

  return (
    <DashboardShell variant="seller">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Sparkles className="h-3 w-3" /> New listing
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display">Create a Listing</h1>
          <p className="text-muted-foreground text-sm mt-2">Share your product with thousands of buyers across Morocco.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <Label htmlFor="title">Product Title</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 h-11" maxLength={120} placeholder="e.g. iPhone 15 Pro Max 256GB" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="like_new">Like new</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="price">Price (MAD)</Label>
            <Input id="price" type="number" min="1" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5 h-11" placeholder="0" required />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={5} maxLength={2000} placeholder="Describe your product, its features, and condition…" />
          </div>

          <div>
            <Label>Product Images</Label>
            <div className="mt-2 grid grid-cols-3 md:grid-cols-4 gap-3">
              {form.images.map((url, i) => (
                <div key={i} className="aspect-square rounded-xl bg-surface-elevated relative overflow-hidden group">
                  <img src={url} alt={`upload-${i}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /><span className="text-[10px] font-medium">Add image</span></>}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadImages(e.target.files)} />
              </label>
            </div>
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <h3 className="font-semibold text-sm mb-2">Listing Tips</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Use clear, descriptive titles</li>
              <li>• Add high-quality images from multiple angles</li>
              <li>• Be honest about product condition</li>
              <li>• Set competitive prices in MAD</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => navigate({ to: "/seller/products" })}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 h-11 bg-gradient-gold text-primary-foreground shadow-glow font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Listing"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
