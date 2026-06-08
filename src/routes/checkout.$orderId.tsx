import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Upload, Loader2, CheckCircle2, ArrowLeft, ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout/$orderId")({
  head: () => ({ meta: [{ title: "Checkout — Wasit.pay" }] }),
  component: CheckoutPage,
});

type PaymentMethod = {
  id: string;
  name: string;
  type: "bank" | "wallet" | "cash" | "crypto";
  account: string;
  holder: string;
  iban?: string;
  swift?: string;
  instructions: string;
  gradient: string;
  ring: string;
  short: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cih",
    name: "CIH Bank",
    short: "CIH",
    type: "bank",
    account: "230 810 0123456789 12",
    iban: "MA64 2308 1001 2345 6789 0012",
    swift: "CIHMMAMC",
    holder: "Wasit.pay SARL",
    instructions: "Transfer via CIH Online, CIH Mobile, or any branch.",
    gradient: "from-[#0a3d2e] to-[#16a34a]",
    ring: "ring-emerald-500/40",
  },
  {
    id: "attijari",
    name: "Attijariwafa Bank",
    short: "AWB",
    type: "bank",
    account: "007 780 0001234567890 45",
    iban: "MA64 0077 8000 0123 4567 8900 045",
    swift: "BCMAMAMC",
    holder: "Wasit.pay SARL",
    instructions: "Transfer via Attijari Mobile or any Wafacash agency.",
    gradient: "from-[#7a1416] to-[#dc2626]",
    ring: "ring-red-500/40",
  },
  {
    id: "bmce",
    name: "BMCE Bank of Africa",
    short: "BOA",
    type: "bank",
    account: "011 780 0009876543210 88",
    iban: "MA64 0117 8000 0987 6543 2100 088",
    swift: "BMCEMAMC",
    holder: "Wasit.pay SARL",
    instructions: "Transfer via BMCE Direct or any BOA branch.",
    gradient: "from-[#0b1f4a] to-[#1e40af]",
    ring: "ring-blue-500/40",
  },
  {
    id: "banque-populaire",
    name: "Banque Populaire",
    short: "BP",
    type: "bank",
    account: "190 780 1112223334445 67",
    iban: "MA64 1907 8011 1222 3334 4456 7000",
    swift: "BCPOMAMC",
    holder: "Wasit.pay SARL",
    instructions: "Transfer via Chaabi Net or any Banque Populaire branch.",
    gradient: "from-[#3a1a5a] to-[#7c3aed]",
    ring: "ring-violet-500/40",
  },
  {
    id: "barid",
    name: "Barid Bank",
    short: "BAM",
    type: "bank",
    account: "350 810 5556667778889 21",
    iban: "MA64 3508 1055 5666 7778 8892 100",
    swift: "BMCIMAMC",
    holder: "Wasit.pay SARL",
    instructions: "Transfer via Barid Bank Mobile or any Al Barid post office.",
    gradient: "from-[#5a3a00] to-[#f59e0b]",
    ring: "ring-amber-500/40",
  },
  {
    id: "cashplus",
    name: "Cash Plus",
    short: "C+",
    type: "cash",
    account: "Wasit.pay SARL — Casablanca",
    holder: "ID required at counter",
    instructions: "Deposit at any Cash Plus agency. Bring your CIN.",
    gradient: "from-[#062e2a] to-[#0d9488]",
    ring: "ring-teal-500/40",
  },
  {
    id: "wepay",
    name: "WePay",
    short: "WE",
    type: "wallet",
    account: "0612 345 678",
    holder: "Wasit.pay Wallet",
    instructions: "Send via WePay app to this phone number.",
    gradient: "from-[#1a1f3a] to-[#6366f1]",
    ring: "ring-indigo-500/40",
  },
  {
    id: "binance",
    name: "Binance Pay",
    short: "BNB",
    type: "crypto",
    account: "BP-AMAN-2024",
    holder: "Binance Pay ID — USDT only",
    instructions: "Send USDT (BEP20/TRC20) via Binance Pay ID.",
    gradient: "from-[#2a1a00] to-[#f0b90b]",
    ring: "ring-yellow-500/40",
  },
];

function qrUrl(text: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(text)}`;
}

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(PAYMENT_METHODS[0].id);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, products(*)").eq("id", orderId).maybeSingle();
      return data;
    },
  });

  const { data: proof } = useQuery({
    queryKey: ["proof", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_proofs")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const copy = (txt: string, label = "Copied") => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} to clipboard`);
  };

  const submitProof = async () => {
    if (!file || !user || !order) {
      toast.error("Please upload a screenshot");
      return;
    }
    setUploading(true);
    const path = `${user.id}/${orderId}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { error } = await supabase.from("payment_proofs").insert({
      order_id: orderId,
      uploaded_by: user.id,
      image_url: path,
      transaction_reference: reference,
      payment_method: selected,
    });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    // order_status + payment_method are updated by the DB trigger on payment_proofs insert.
    setUploading(false);
    toast.success("Proof submitted! Admin will verify shortly.");
    navigate({ to: "/orders" });
  };

  if (!order)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  const method = PAYMENT_METHODS.find((m) => m.id === selected)!;
  const total = Number(order.amount) + Number(order.commission);
  const qrPayload = `amanpay:order=${orderId};method=${method.id};amount=${total};ref=${method.account}`;

  const verificationStatus = proof?.verification_status ?? null;
  const StatusBadge = () => {
    if (!verificationStatus) return null;
    if (verificationStatus === "approved")
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Verified
        </Badge>
      );
    if (verificationStatus === "rejected")
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1">
          <AlertCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
        <Clock className="h-3 w-3" /> Pending review
      </Badge>
    );
  };

  return (
    <div className="min-h-screen pb-12">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to orders
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Complete payment</h1>
            <p className="text-muted-foreground mt-1">Choose a method, transfer the amount, then upload proof.</p>
          </div>
          <StatusBadge />
        </div>

        {/* Order summary */}
        <div className="glass-card rounded-2xl p-5 mb-6 border border-border/40">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item</span>
            <span className="font-medium truncate max-w-[60%] text-right">{(order as any).products?.title}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{Number(order.amount).toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Escrow commission</span>
            <span>{Number(order.commission).toFixed(2)} MAD</span>
          </div>
          <div className="border-t border-border/40 mt-3 pt-3 flex justify-between items-center">
            <span className="font-semibold">Total to pay</span>
            <span className="text-2xl font-bold text-gradient-gold">{total.toLocaleString()} MAD</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Funds are held in Wasit.pay escrow until you confirm delivery.
          </div>
        </div>

        {/* Payment methods */}
        <h2 className="font-semibold mb-3 text-lg">Select payment method</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
          {PAYMENT_METHODS.map((m) => {
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`group relative p-4 rounded-2xl text-left transition-all border ${
                  active
                    ? `bg-gradient-to-br ${m.gradient} text-white border-white/20 shadow-glow ring-2 ${m.ring}`
                    : "glass-card border-border/40 hover:border-primary/40 hover:-translate-y-0.5"
                }`}
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm mb-2 ${
                  active ? "bg-white/15 text-white backdrop-blur" : `bg-gradient-to-br ${m.gradient} text-white`
                }`}>
                  {m.short}
                </div>
                <div className={`text-sm font-semibold leading-tight ${active ? "text-white" : ""}`}>{m.name}</div>
                <div className={`text-[10px] mt-0.5 uppercase tracking-wider ${active ? "text-white/70" : "text-muted-foreground"}`}>
                  {m.type}
                </div>
                {active && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Method detail — bank card style */}
        <div className="grid md:grid-cols-5 gap-6 mb-6">
          {/* Card */}
          <div className="md:col-span-3">
            <div className={`relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br ${method.gradient} text-white shadow-2xl min-h-[220px]`}>
              <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-black/20 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/70">Wasit.pay · Escrow</div>
                    <div className="text-2xl font-bold mt-1">{method.name}</div>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-bold">
                    {method.short}
                  </div>
                </div>

                <div className="mt-8">
                  <div className="text-[10px] uppercase tracking-widest text-white/60">
                    {method.type === "bank" ? "Account number" : method.type === "crypto" ? "Pay ID" : "Recipient"}
                  </div>
                  <div className="font-mono text-lg md:text-xl tracking-wider mt-1">{method.account}</div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/60">Holder</div>
                    <div className="text-sm font-medium mt-0.5">{method.holder}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-white/60">Amount</div>
                    <div className="text-base font-bold mt-0.5">{total.toLocaleString()} MAD</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details rows */}
            <div className="mt-4 glass-card rounded-2xl p-4 space-y-3 border border-border/40">
              <DetailRow label={method.type === "bank" ? "Account / RIB" : "Reference"} value={method.account} onCopy={copy} />
              {method.iban && <DetailRow label="IBAN" value={method.iban} onCopy={copy} />}
              {method.swift && <DetailRow label="SWIFT" value={method.swift} onCopy={copy} />}
              <DetailRow label="Amount" value={`${total.toLocaleString()} MAD`} onCopy={copy} />
              <DetailRow label="Reference" value={`AMAN-${orderId.slice(0, 8).toUpperCase()}`} onCopy={copy} />
              <div className="flex items-start gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                {method.instructions}
              </div>
            </div>
          </div>

          {/* QR */}
          <div className="md:col-span-2">
            <div className="glass-card rounded-2xl p-5 border border-border/40 h-full flex flex-col items-center justify-center text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Scan to pay</div>
              <div className="rounded-2xl bg-white p-3 shadow-glow">
                <img src={qrUrl(qrPayload)} alt="Payment QR code" width={180} height={180} className="block" />
              </div>
              <div className="text-xs text-muted-foreground mt-3">Scan with your banking or wallet app</div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-9"
                onClick={() => copy(qrPayload, "Payment payload copied")}
              >
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy payload
              </Button>
            </div>
          </div>
        </div>

        {/* Upload proof */}
        <div className="glass-card rounded-2xl p-6 border border-border/40">
          <h3 className="font-semibold mb-1 flex items-center gap-2 text-lg">
            <Upload className="h-4 w-4 text-primary" /> Upload payment proof
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            After transferring, upload the transaction screenshot. Our team verifies manually within 1–24 hours.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Transaction reference (optional)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TXN-..."
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Screenshot</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1.5 h-11 file:text-primary"
              />
            </div>
            <Button
              onClick={submitProof}
              disabled={uploading || !file}
              className="w-full h-12 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Submit for verification
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string, l?: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="font-mono text-sm truncate">{value}</div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onCopy(value, `${label} copied`)}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
