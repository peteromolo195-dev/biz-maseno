import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Shield, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sterling Capital — Invest in Kenya's Growth" },
      { name: "description", content: "Premium share investment platform. Transparent, secure, and built for long-term wealth." },
    ],
  }),
  component: Home,
});

function Home() {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", message: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("interest_registrations").insert(form);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Thanks! We'll be in touch.");
      setForm({ full_name: "", email: "", phone: "", message: "" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-navy-foreground">
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-navy/80 to-navy" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Now accepting new shareholders
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Own a piece of Kenya's <span className="text-gold">next chapter</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-navy-foreground/80">
              Sterling Capital is a private investment company offering everyday Kenyans a transparent, secure way to become shareholders. Track your portfolio in real time, receive your unique Investor ID, and grow with us.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" className="bg-gold text-navy hover:bg-gold/90">
                  Become an Investor <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/packages">
                <Button size="lg" variant="outline" className="border-navy-foreground/30 bg-transparent text-navy-foreground hover:bg-navy-foreground/10">
                  View Packages
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {[
              { k: "KSh 500", v: "Per share" },
              { k: "From 3", v: "Shares to start" },
              { k: "100%", v: "Real-time tracking" },
            ].map((s) => (
              <div key={s.v} className="rounded-lg border border-gold/20 bg-navy/40 p-6 backdrop-blur">
                <div className="font-display text-3xl font-bold text-gold">{s.k}</div>
                <div className="mt-1 text-sm text-navy-foreground/70">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">Why Sterling</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Investing made transparent</h2>
          <p className="mt-4 text-muted-foreground">Built from the ground up for clarity, accountability, and long-term shareholder value.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Shield, title: "Bank-grade security", desc: "Encrypted KYC, two-factor authentication, and audited transaction logs." },
            { icon: TrendingUp, title: "Real-time portfolio", desc: "See exactly what you own, what it's worth, and how it grows — every day." },
            { icon: Users, title: "Unique Investor ID", desc: "A secure 6-character ID identifies you across statements, payouts, and certificates." },
          ].map((f) => (
            <Card key={f.title} className="border-border shadow-card">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy">
                  <f.icon className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="mt-4 font-display">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-gold">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Four steps to shareholder</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              { n: "01", t: "Create account", d: "Sign up with email and phone. Get your unique 6-character Investor ID instantly." },
              { n: "02", t: "Verify identity", d: "Upload your ID for our quick KYC review." },
              { n: "03", t: "Choose package", d: "Subscribe to as few as 3 shares or build a Premier position." },
              { n: "04", t: "Track & grow", d: "Watch your portfolio in real time and access shareholder benefits." },
            ].map((s) => (
              <div key={s.n}>
                <div className="font-display text-4xl font-bold text-gold">{s.n}</div>
                <h3 className="mt-3 font-display text-lg font-semibold text-navy">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Register interest */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-gold">Get in touch</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Register your interest</h2>
            <p className="mt-4 text-muted-foreground">Not ready to subscribe yet? Leave your details and we'll send you our investor brief.</p>
            <ul className="mt-6 space-y-3">
              {["No obligation", "Reply within 24 hours", "Confidential"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {b}
                </li>
              ))}
            </ul>
          </div>
          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" required minLength={2} maxLength={200} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="message">Message (optional)</Label>
                  <Textarea id="message" rows={3} maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Sending..." : "Send"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
