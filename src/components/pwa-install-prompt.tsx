import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "amanpay_pwa_dismissed_at";
const DISMISS_DAYS = 7;

export function PwaInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Hide if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (standalone) return;
    // Respect dismissal
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setVisible(false);
    setEvt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 inset-x-4 md:inset-x-auto md:right-6 md:max-w-sm z-[60] glass-card rounded-2xl p-4 border border-primary/30 shadow-glow animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Install Wasit.pay</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Add to your home screen for fast access and a native app feel.
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={install} className="bg-gradient-gold text-primary-foreground font-semibold h-8">
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} className="h-8">
              Later
            </Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
