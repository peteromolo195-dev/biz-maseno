import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileSignature, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/contract")({
  component: () => <RequireAuth><Contract /></RequireAuth>,
});

function Contract() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
  }, [user]);

  const sign = async () => {
    if (!user) return;
    if (!agreed) return toast.error("You must accept the terms");
    if (signature.trim().length < 3) return toast.error("Please type your full name as signature");
    setSubmitting(true);
    const { error } = await supabase.from("profiles").update({ contract_signed_at: new Date().toISOString() }).eq("id", user.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Contract signed!");
    setProfile({ ...profile, contract_signed_at: new Date().toISOString() });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-navy" />
          <h1 className="font-display text-2xl font-bold text-navy">Shareholder Agreement</h1>
        </div>

        {profile?.contract_signed_at ? (
          <Card className="border-success/40 bg-success/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <div>
                <p className="font-semibold text-foreground">Contract signed</p>
                <p className="text-sm text-muted-foreground">Signed on {formatDateTime(profile.contract_signed_at)}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle className="font-display">Agreement Terms</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
              <p className="font-semibold">SHAREHOLDER AGREEMENT</p>
              <p className="mt-2">This agreement is entered into between Kenya Capital Holdings ("the Company") and the undersigned shareholder ("the Shareholder").</p>
              <p className="mt-2"><strong>1. Subscription.</strong> The Shareholder agrees to subscribe to shares of the Company at the prevailing share price.</p>
              <p className="mt-2"><strong>2. Investor ID.</strong> The Shareholder is identified by a unique 6-character Investor ID issued upon registration.</p>
              <p className="mt-2"><strong>3. Voting Rights.</strong> Each share carries one vote at the Company's Annual General Meeting.</p>
              <p className="mt-2"><strong>4. Dividends.</strong> Dividends, when declared, are paid pro-rata to shares held.</p>
              <p className="mt-2"><strong>5. Transfers.</strong> Shares may not be transferred without written consent of the board.</p>
              <p className="mt-2"><strong>6. KYC.</strong> The Shareholder agrees to complete identity verification.</p>
              <p className="mt-2"><strong>7. Confidentiality.</strong> Information shared by the Company is confidential.</p>
              <p className="mt-2"><strong>8. Governing Law.</strong> This agreement is governed by the laws of the Republic of Kenya.</p>
            </div>

            {!profile?.contract_signed_at && (
              <>
                <div className="flex items-start gap-2">
                  <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
                  <Label htmlFor="agree" className="cursor-pointer text-sm leading-snug">I have read and agree to the Shareholder Agreement.</Label>
                </div>
                <div>
                  <Label htmlFor="sig">Type your full name as signature</Label>
                  <Input id="sig" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={profile?.full_name ?? ""} />
                </div>
                <Button onClick={sign} disabled={submitting} className="w-full">
                  {submitting ? "Signing..." : "Sign agreement"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
