// Guarded service worker registration. Only registers in production on the real published origin.
// Refuses (and unregisters stale workers) in dev, iframe preview, Lovable preview, and via ?sw=off.

const SW_PATH = "/sw.js";

function refusalReason(): string | null {
  if (typeof window === "undefined") return "no-window";
  if (!import.meta.env.PROD) return "not-prod";
  if (!("serviceWorker" in navigator)) return "unsupported";
  try {
    if (window.self !== window.top) return "iframe";
  } catch {
    return "iframe";
  }
  const h = window.location.hostname;
  if (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  ) {
    return "lovable-preview";
  }
  if (new URLSearchParams(window.location.search).has("sw") &&
      new URLSearchParams(window.location.search).get("sw") === "off") {
    return "kill-switch";
  }
  return null;
}

async function unregisterMatching() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_PATH);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // ignore
  }
}

export function registerSW() {
  if (typeof window === "undefined") return;
  const reason = refusalReason();
  if (reason) {
    if ("serviceWorker" in navigator) void unregisterMatching();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_PATH).catch(() => {
      // ignore
    });
  });
}
