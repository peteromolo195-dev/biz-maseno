import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Star, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKes } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/packages")({
  component: () => <RequireAuth><AppPackages /></RequireAuth>,
});

function AppPackages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [shares, setShares] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    supabase.from("packages").select("*").eq("active", true).order("sort_order").then(({ data }) => {
      setPackages(data ?? []);
    });
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
        setWalletBalance(Number((data as unknown as Record<string, unknown>)?.wallet_balance ?? 0));
      });
    }
  }, [user]);

  const subscribe = async () => {
    if (!user || !selected) return;
    if (shares < selected.min_shares) {
      toast.error(`Minimum ${selected.min_shares} shares for this package`);
      return;
    }
    const total = shares * Number(selected.price_per_share_kes);

    // Check wallet balance
    if (walletBalance < total) {
      toast.error(`Insufficient wallet balance (${formatKes(walletBalance)}). You need ${formatKes(total)}. Redirecting to deposit page...`);
      setSelected(null);
      setTimeout(() => navigate({ to: "/app/transactions" }), 1500);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      package_id: selected.id,
      shares,
      price_per_share_kes: selected.price_per_share_kes,
      total_amount_kes: total,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Subscription submitted! Pending admin approval.");
      setSelected(null);
      navigate({ to: "/app/transactions" });
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">Investment Packages</h1>
            <p className="text-sm text-muted-foreground">Subscribe to shares — start with as few as 3.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2">
            <Wallet className="h-5 w-5 text-gold" />
            <div>
              <p className="text-xs text-muted-foreground">Wallet Balance</p>
              <p className="font-display font-bold text-navy">{formatKes(walletBalance)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {packages.map((p) => {
            const total = p.min_shares * Number(p.price_per_share_kes);
            return (
              <Card key={p.id} className={p.is_featured ? "border-gold relative shadow-gold" : "shadow-card"}>
                {p.is_featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy">
                    <Star className="mr-1 h-3 w-3 fill-current" /> Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="font-display text-xl text-navy">{p.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                  <div className="mt-3">
                    <div className="font-display text-2xl font-bold text-navy">{formatKes(total)}</div>
                    <div className="text-xs text-muted-foreground">From {p.min_shares} shares</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(p.benefits ?? []).map((b: string) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {b}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={p.is_featured ? "mt-5 w-full bg-gold text-navy hover:bg-gold/90" : "mt-5 w-full"}
                    onClick={() => { setSelected(p); setShares(p.min_shares); }}
                  >
                    Subscribe
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-navy">Subscribe to {selected?.name}</DialogTitle>
            <DialogDescription>Choose how many shares to subscribe to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="shares">Number of shares (min {selected?.min_shares})</Label>
              <Input id="shares" type="number" min={selected?.min_shares} value={shares} onChange={(e) => setShares(Number(e.target.value))} />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="flex justify-between"><span>Price per share</span><span>{formatKes(selected?.price_per_share_kes ?? 0)}</span></div>
              <div className="mt-1 flex justify-between font-semibold text-navy"><span>Total</span><span>{formatKes(shares * Number(selected?.price_per_share_kes ?? 0))}</span></div>
              <div className="mt-2 flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Your wallet</span>
                <span className={walletBalance >= shares * Number(selected?.price_per_share_kes ?? 0) ? "text-success font-medium" : "text-destructive font-medium"}>
                  {formatKes(walletBalance)}
                </span>
              </div>
              {walletBalance < shares * Number(selected?.price_per_share_kes ?? 0) && (
                <p className="mt-2 text-xs text-destructive">⚠ Insufficient funds. Deposit {formatKes(shares * Number(selected?.price_per_share_kes ?? 0) - walletBalance)} more to proceed.</p>
              )}
            </div>
            <Button onClick={subscribe} disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Confirm subscription"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
