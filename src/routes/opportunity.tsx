import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Building2, Sprout, Coins } from "lucide-react";

export const Route = createFileRoute("/opportunity")({
  head: () => ({
    meta: [
      { title: "The Opportunity — Kenya Capital" },
      { name: "description", content: "Why invest with Kenya Capital — diversified across real estate, agriculture, and growth equity." },
    ],
  }),
  component: Opportunity,
});

function Opportunity() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <section className="bg-hero py-16 text-navy-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">The opportunity</h1>
          <p className="mx-auto mt-4 max-w-2xl text-navy-foreground/80">A diversified portfolio across the highest-growth sectors of the Kenyan economy.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { icon: Building2, title: "Real estate", body: "Income-generating commercial and residential property in Nairobi and growth corridors." },
            { icon: Sprout, title: "Agribusiness", body: "Modern farming operations and value-add processing for export markets." },
            { icon: TrendingUp, title: "Growth equity", body: "Strategic stakes in promising East African SMEs scaling regionally." },
            { icon: Coins, title: "Fixed income", body: "Government and corporate paper providing stable yield and liquidity." },
          ].map((s) => (
            <Card key={s.title} className="shadow-card">
              <CardContent className="flex gap-4 pt-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-navy">
                  <s.icon className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-navy">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
