import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Kenya Capital" },
      { name: "description", content: "Kenya Capital is a Nairobi-based investment company building lasting value for Kenyan shareholders." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <section className="bg-hero py-16 text-navy-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">About Kenya Capital</h1>
          <p className="mx-auto mt-4 max-w-2xl text-navy-foreground/80">A modern investment company built on transparency, accountability, and shared prosperity.</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="prose prose-lg max-w-none">
          <h2 className="font-display text-2xl font-bold text-navy">Our mission</h2>
          <p className="mt-3 text-muted-foreground">
            We exist to make ownership of high-quality assets accessible to everyday Kenyans. By pooling capital from a broad base of shareholders, we build a portfolio with real long-term upside — and we share that upside transparently.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-navy">Our principles</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>• <strong className="text-foreground">Transparency.</strong> Every shareholder sees the same numbers we do.</li>
            <li>• <strong className="text-foreground">Discipline.</strong> We invest in opportunities we understand, with clear theses and exit plans.</li>
            <li>• <strong className="text-foreground">Stewardship.</strong> Your capital is treated with the care it deserves.</li>
            <li>• <strong className="text-foreground">Compounding.</strong> Patient capital, reinvested intelligently, builds generational wealth.</li>
          </ul>

          <h2 className="mt-10 font-display text-2xl font-bold text-navy">Leadership</h2>
          <p className="mt-3 text-muted-foreground">
            Kenya Capital is led by a small team of finance, technology, and operations professionals committed to building Kenya's most trusted shareholder-owned investment company.
          </p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
