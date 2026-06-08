import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Loader2 } from "lucide-react";
import logoImg from "../../public/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.5 2.3 2.1 6.8 2.1 12.2S6.5 22.1 12 22.1c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.4-.2-2H12z"/></svg>
  );
}

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Wasit.pay" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const target = (redirect as string) || "/marketplace";

  useEffect(() => {
    if (!authLoading && user) navigate({ to: target as any, replace: true });
  }, [authLoading, user, navigate, target]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { toast.error(error.message); return; }
      toast.success("Welcome back!");
      navigate({ to: target as any, replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-hero">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src={logoImg} alt="Wasit.pay" className="h-10 w-10 rounded-xl shadow-glow" />
          <span className="font-display text-2xl font-bold">Wasit<span className="text-gradient-gold">.pay</span></span>
        </Link>

        <div className="glass-card rounded-3xl p-8 shadow-elevated">
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your Wasit.pay account</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 font-semibold shadow-glow">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={async () => {
              const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + target });
              if (result?.error) toast.error(result.error.message || "Google sign-in failed");
            }}
          >
            <GoogleIcon /> Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            New to Wasit.pay? <Link to="/register" className="text-primary font-medium hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
