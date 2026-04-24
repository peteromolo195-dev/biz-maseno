import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Wallet, PieChart, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKes, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/app/")({
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [shares, setShares] = useState(0);
  const [pricePerShare, setPricePerShare] = useState(500);
  const [pendingDeposits, setPendingDeposits] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: cfg }, { data: sharesData }, { data: pending }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("app_config").select("value").eq("key", "share_price_kes").single(),
        supabase.from("transactions").select("shares").eq("user_id", user.id).eq("type", "share_issuance").eq("status", "completed"),
        supabase.from("transactions").select("amount_kes").eq("user_id", user.id).eq("type", "deposit").eq("status", "pending"),
      ]);
      setProfile(prof);
      if (cfg) setPricePerShare(Number(cfg.value));
      setShares((sharesData ?? []).reduce((s, t) => s + (t.shares ?? 0), 0));
      setPendingDeposits((pending ?? []).reduce((s, t) => s + Number(t.amount_kes ?? 0), 0));
    })();
  }, [user]);

  const portfolioValue = shares * pricePerShare;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">
            Welcome back, {profile?.full_name?.split(" ")[0] ?? "Investor"}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Investor ID:</span>
            <Badge variant="secondary" className="font-mono text-base bg-navy text-gold">{profile?.investor_id ?? "—"}</Badge>
            {profile?.kyc_status === "approved" && (
              <Badge className="bg-success text-success-foreground"><BadgeCheck className="mr-1 h-3 w-3" />KYC Verified</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={PieChart} label="Shares owned" value={formatNumber(shares)} />
          <StatCard icon={TrendingUp} label="Portfolio value" value={formatKes(portfolioValue)} accent />
          <StatCard icon={Wallet} label="Share price" value={formatKes(pricePerShare)} />
          <StatCard icon={Wallet} label="Pending deposits" value={formatKes(pendingDeposits)} />
        </div>

        <Card className="bg-gradient-to-br from-navy to-navy/90 text-navy-foreground shadow-elegant">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Ready to grow your stake?</h3>
                <p className="mt-1 text-sm text-navy-foreground/70">Subscribe to additional shares from any of our packages.</p>
              </div>
              <Link to="/app/packages">
                <Button className="bg-gold text-navy hover:bg-gold/90">Browse packages</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {profile?.kyc_status !== "approved" && (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Complete your KYC</h3>
                  <p className="text-sm text-muted-foreground">Verification unlocks dividend payouts and certificates.</p>
                </div>
                <Link to="/app/kyc"><Button variant="outline">Submit KYC</Button></Link>
              </div>
            </CardContent>
          </Card>
        )}

        {!profile?.contract_signed_at && (
          <Card className="border-gold/40 bg-gold/10">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Sign the shareholder agreement</h3>
                  <p className="text-sm text-muted-foreground">Required before share certificates are issued.</p>
                </div>
                <Link to="/app/contract"><Button>Review contract</Button></Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-gold/40 bg-gold/5" : "shadow-card"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
          <Icon className={`h-4 w-4 ${accent ? "text-gold" : "text-navy"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl font-bold text-navy">{value}</div>
      </CardContent>
    </Card>
  );
}
