import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Wasit.pay" },
      { name: "description", content: "How Wasit.pay collects, uses, and protects your personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useLanguage();

  const sections = [
    { title: t("privacy.section1.title"), text: t("privacy.section1.text") },
    { title: t("privacy.section2.title"), text: t("privacy.section2.text") },
    { title: t("privacy.section3.title"), text: t("privacy.section3.text") },
    { title: t("privacy.section4.title"), text: t("privacy.section4.text") },
    { title: t("privacy.section5.title"), text: t("privacy.section5.text") },
    { title: t("privacy.section6.title"), text: t("privacy.section6.text") },
    { title: t("privacy.section7.title"), text: t("privacy.section7.text") },
    { title: t("privacy.section8.title"), text: t("privacy.section8.text") },
    { title: t("privacy.section9.title"), text: t("privacy.section9.text") },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-12">
          <div className="h-14 w-14 rounded-2xl bg-gradient-gold shadow-glow mx-auto flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-5">{t("privacy.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("privacy.lastUpdated")}: 5 juin 2026
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 md:p-10 mb-8">
          <p className="text-muted-foreground leading-relaxed">{t("privacy.intro")}</p>
        </div>

        <div className="space-y-6">
          {sections.map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-bold mb-3">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="text-sm text-primary font-medium hover:underline"
          >
            ← {t("nav.home")}
          </Link>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
