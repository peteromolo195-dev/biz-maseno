import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Star } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatKes } from "@/lib/format";

export const Route = createFileRoute("/packages")({
  head: () => ({
    meta: [
      { title: "Investment Packages — Sterling Capital" },
      { name: "description", content: "Choose from Starter (3 shares), Growth (20), or Premier (100). Transparent pricing, real shareholder benefits." },
    ],
  }),
  component: Packages,
});

interface Pkg {
  id: string;
  name: string;
  tagline: string | null;
  min_shares: number;
  price_per_share_kes: number;
  benefits: string[];
  is_featured: boolean;
}

function Packages() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  useEffect(() => {
    supabase.from("packages").select("*").eq("active", true).order("sort_order").then(({ data }) => {
      setPackages((data ?? []) as unknown as Pkg[]);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <section className="bg-hero py-16 text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Investment packages</h1>
          <p className="mx-auto mt-4 max-w-2xl text-navy-foreground/80">Pick the package that suits your goals. Start small or commit at scale — every share counts.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((p) => {
            const total = p.min_shares * Number(p.price_per_share_kes);
            return (
              <Card key={p.id} className={p.is_featured ? "border-gold shadow-gold relative" : "shadow-card"}>
                {p.is_featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy">
                    <Star className="mr-1 h-3 w-3 fill-current" /> Most popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="font-display text-2xl text-navy">{p.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{p.tagline}</p>
                  <div className="mt-4">
                    <div className="font-display text-4xl font-bold text-navy">{formatKes(total)}</div>
                    <div className="text-sm text-muted-foreground">
                      {p.min_shares} shares × {formatKes(p.price_per_share_kes)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(p.benefits ?? []).map((b: string) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className="mt-6 block">
                    <Button className={p.is_featured ? "w-full bg-gold text-navy hover:bg-gold/90" : "w-full"}>
                      Subscribe to {p.name}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
