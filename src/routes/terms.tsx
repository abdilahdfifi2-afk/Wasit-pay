import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Wasit.pay" },
      { name: "description", content: "Wasit.pay terms and conditions for buyers, sellers, and escrow services." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useLanguage();

  const sections = [
    { title: t("terms.section1.title"), text: t("terms.section1.text") },
    { title: t("terms.section2.title"), text: t("terms.section2.text") },
    { title: t("terms.section3.title"), text: t("terms.section3.text") },
    { title: t("terms.section4.title"), text: t("terms.section4.text") },
    { title: t("terms.section5.title"), text: t("terms.section5.text") },
    { title: t("terms.section6.title"), text: t("terms.section6.text") },
    { title: t("terms.section7.title"), text: t("terms.section7.text") },
    { title: t("terms.section8.title"), text: t("terms.section8.text") },
    { title: t("terms.section9.title"), text: t("terms.section9.text") },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SiteHeader />

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-12">
          <div className="h-14 w-14 rounded-2xl bg-gradient-gold shadow-glow mx-auto flex items-center justify-center">
            <ScrollText className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-5">{t("terms.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("terms.lastUpdated")}: 5 juin 2026
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 md:p-10 mb-8">
          <p className="text-muted-foreground leading-relaxed">{t("terms.intro")}</p>
        </div>

        <div className="space-y-6">
          {sections.map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-bold mb-3">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-6 mt-8 text-center">
          <p className="text-sm text-muted-foreground">{t("terms.contact")}</p>
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
