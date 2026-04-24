import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Users, Coins } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/referrals")({
  component: () => <RequireAuth><Referrals /></RequireAuth>,
});

function Referrals() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: refs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("referrals").select("*, profiles!referrals_referred_id_fkey(username, investor_id, created_at)").eq("referrer_id", user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(prof);
      setReferrals(refs ?? []);
    })();
  }, [user]);

  const link = profile ? `${window.location.origin}/signup?ref=${profile.investor_id}` : "";

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-navy">Referrals</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-gradient-to-br from-navy to-navy/90 text-navy-foreground">
            <CardContent className="pt-6">
              <Users className="h-6 w-6 text-gold" />
              <p className="mt-2 text-sm text-navy-foreground/70">Successful referrals</p>
              <p className="font-display text-3xl font-bold text-gold">{referrals.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gold-gradient text-navy">
            <CardContent className="pt-6">
              <Coins className="h-6 w-6" />
              <p className="mt-2 text-sm">Points earned</p>
              <p className="font-display text-3xl font-bold">{profile?.referral_points ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Your referral link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button onClick={copy}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share your code <span className="rounded bg-muted px-2 py-0.5 font-mono font-semibold text-navy">{profile?.investor_id}</span>. You and your referee both earn points when they sign up.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">People you've referred</CardTitle></CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referrals yet. Share your link to earn points!</p>
            ) : (
              <div className="space-y-2">
                {referrals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">@{r.profiles?.username}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gold">+{r.points_awarded} pts</span>
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
