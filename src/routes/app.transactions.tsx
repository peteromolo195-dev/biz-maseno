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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatKes, formatDateTime } from "@/lib/format";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Wallet, Smartphone } from "lucide-react";
import { initiateStkPush } from "@/server/mpesa.functions";

export const Route = createFileRoute("/app/transactions")({
  component: () => <RequireAuth><Transactions /></RequireAuth>,
});

function Transactions() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mpesaLoading, setMpesaLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setTxs(data ?? []);
    setWalletBalance(Number((profile as unknown as Record<string, unknown>)?.wallet_balance ?? 0));
  };
  useEffect(() => { load(); }, [user]);

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (amount <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "deposit" as const,
      status: "pending" as const,
      amount_kes: amount,
      reference,
      description,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Deposit recorded — pending admin approval");
    setDepositOpen(false); setAmount(0); setReference(""); setDescription("");
    load();
  };

  const submitMpesaDeposit = async () => {
    if (!user) return;
    if (amount <= 0) return toast.error("Enter a valid amount");
    if (!phone || phone.length < 10) return toast.error("Enter a valid phone number");
    setMpesaLoading(true);
    try {
      const result = await initiateStkPush({
        data: { phone, amount, accountRef: `KC-${user.id.slice(0, 8)}`, userId: user.id },
      });

      // Record a pending transaction with the checkout request ID
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit" as const,
        status: "pending" as const,
        amount_kes: amount,
        reference: result.checkoutRequestID,
        description: `M-Pesa STK Push - ${result.responseDescription}`,
      });

      toast.success("STK Push sent! Check your phone for the M-Pesa prompt.");
      setDepositOpen(false); setAmount(0); setPhone("");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "M-Pesa request failed");
    } finally {
      setMpesaLoading(false);
    }
  };

  const submitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (amount <= 0) return toast.error("Enter a valid amount");
    if (amount > walletBalance) return toast.error("Insufficient wallet balance");
    setSubmitting(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "withdrawal" as const,
      status: "pending" as const,
      amount_kes: amount,
      reference,
      description,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal request submitted — pending admin approval");
    setWithdrawOpen(false); setAmount(0); setReference(""); setDescription("");
    load();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-navy">Transactions</h1>
          <div className="flex gap-2">
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger asChild>
                <Button><ArrowDownToLine className="mr-2 h-4 w-4" />Deposit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display text-navy">Deposit funds</DialogTitle></DialogHeader>
                <Tabs defaultValue="manual">
                  <TabsList className="w-full">
                    <TabsTrigger value="manual" className="flex-1"><Plus className="mr-1 h-4 w-4" />Manual</TabsTrigger>
                    <TabsTrigger value="mpesa" className="flex-1"><Smartphone className="mr-1 h-4 w-4" />M-Pesa</TabsTrigger>
                  </TabsList>
                  <TabsContent value="manual">
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
                        {submitting ? "Submitting..." : "Submit deposit"}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">An admin will verify and confirm your deposit.</p>
                    </form>
                  </TabsContent>
                  <TabsContent value="mpesa">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="mpesa-amt">Amount (KSh)</Label>
                        <Input id="mpesa-amt" type="number" min={1} required value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
                      </div>
                      <div>
                        <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                        <Input id="mpesa-phone" placeholder="0712345678" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                        <p className="mt-1 text-xs text-muted-foreground">Enter the Safaricom number to receive the STK push</p>
                      </div>
                      <Button onClick={submitMpesaDeposit} disabled={mpesaLoading} className="w-full bg-green-600 hover:bg-green-700">
                        <Smartphone className="mr-2 h-4 w-4" />
                        {mpesaLoading ? "Sending STK Push..." : "Pay via M-Pesa"}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">You'll receive a prompt on your phone to enter your M-Pesa PIN.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>

            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><ArrowUpFromLine className="mr-2 h-4 w-4" />Withdraw</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display text-navy">Withdraw funds</DialogTitle></DialogHeader>
                <div className="mb-3 rounded-md bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">Available balance:</span>{" "}
                  <span className="font-semibold text-navy">{formatKes(walletBalance)}</span>
                </div>
                <form onSubmit={submitWithdraw} className="space-y-3">
                  <div>
                    <Label htmlFor="w-amt">Amount (KSh)</Label>
                    <Input id="w-amt" type="number" min={1} max={walletBalance} required value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="w-ref">M-Pesa number or bank account</Label>
                    <Input id="w-ref" required maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="w-desc">Notes (optional)</Label>
                    <Textarea id="w-desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "Submitting..." : "Request withdrawal"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">An admin will process your withdrawal.</p>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Wallet balance card */}
        <Card className="border-gold">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-gold/10 p-3">
              <Wallet className="h-6 w-6 text-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="font-display text-2xl font-bold text-navy">{formatKes(walletBalance)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-navy">Transaction History</CardTitle></CardHeader>
          <CardContent>
            {txs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="divide-y">
                {txs.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium capitalize">{t.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(t.created_at)} {t.reference ? `· ${t.reference}` : ""}</p>
                      {t.description && <p className="text-xs text-muted-foreground italic">{t.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${t.type === "withdrawal" ? "text-destructive" : "text-navy"}`}>
                        {t.type === "withdrawal" ? "-" : ""}{formatKes(t.amount_kes)}
                      </p>
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
