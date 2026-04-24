import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatKes, formatDateTime } from "@/lib/format";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/app/transactions")({
  component: () => <RequireAuth><Transactions /></RequireAuth>,
});

function Transactions() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTxs(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (amount <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "deposit",
      status: "pending",
      amount_kes: amount,
      reference,
      description,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Deposit recorded — pending admin approval");
    setOpen(false); setAmount(0); setReference(""); setDescription("");
    load();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-navy">Transactions</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Record deposit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display text-navy">Record a deposit</DialogTitle></DialogHeader>
              <form onSubmit={submitDeposit} className="space-y-3">
                <div>
                  <Label htmlFor="amt">Amount (KSh)</Label>
                  <Input id="amt" type="number" min={1} required value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor="ref">Reference (M-Pesa code, bank ref...)</Label>
                  <Input id="ref" required maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="desc">Notes (optional)</Label>
                  <Textarea id="desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">An admin will verify and confirm your deposit.</p>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            {txs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="divide-y">
                {txs.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium capitalize">{t.type.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(t.created_at)} {t.reference ? `· ${t.reference}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-navy">{formatKes(t.amount_kes)}</p>
                      <Badge variant="secondary" className="text-xs">{t.status}</Badge>
                    </div>
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
