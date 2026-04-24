import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKes, formatNumber, formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/shares")({
  component: () => <RequireAuth><Shares /></RequireAuth>,
});

function Shares() {
  const { user } = useAuth();
  const [issuances, setIssuances] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [price, setPrice] = useState(500);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: txs }, { data: subs }, { data: cfg }] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).eq("type", "share_issuance").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*, packages(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("app_config").select("value").eq("key", "share_price_kes").single(),
      ]);
      setIssuances(txs ?? []);
      setSubscriptions(subs ?? []);
      if (cfg) setPrice(Number(cfg.value));
    })();
  }, [user]);

  const totalShares = issuances.filter((i) => i.status === "completed").reduce((s, i) => s + (i.shares ?? 0), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-navy">My Shares</h1>

        <Card className="bg-gradient-to-br from-navy to-navy/90 text-navy-foreground shadow-elegant">
          <CardContent className="pt-6">
            <p className="text-sm text-navy-foreground/70">Total shares owned</p>
            <p className="mt-1 font-display text-4xl font-bold text-gold">{formatNumber(totalShares)}</p>
            <p className="mt-1 text-sm text-navy-foreground/70">Worth {formatKes(totalShares * price)} at {formatKes(price)}/share</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Subscriptions</CardTitle></CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscriptions yet. Visit Packages to subscribe.</p>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium">{s.packages?.name ?? "Custom"} — {s.shares} shares</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.created_at)} · {formatKes(s.total_amount_kes)}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Share certificates issued</CardTitle></CardHeader>
          <CardContent>
            {issuances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shares issued yet.</p>
            ) : (
              <div className="space-y-2">
                {issuances.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium">{formatNumber(i.shares)} shares</p>
                      <p className="text-xs text-muted-foreground">{formatDate(i.created_at)} · Ref: {i.reference ?? "—"}</p>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/20 text-warning-foreground",
    active: "bg-success text-success-foreground",
    completed: "bg-success text-success-foreground",
    approved: "bg-success text-success-foreground",
    rejected: "bg-destructive text-destructive-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
}
