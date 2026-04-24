import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatKes, formatNumber, formatDateTime } from "@/lib/format";
import { Users, Receipt, FileCheck2, ShieldCheck, Search } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: () => <RequireAuth adminOnly><Admin /></RequireAuth>,
});

function Admin() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl font-bold text-navy">Admin Panel</h1>
        </div>

        <Stats />

        <Tabs defaultValue="users">
          <TabsList className="flex-wrap">
            <TabsTrigger value="users"><Users className="mr-1 h-4 w-4" />Users</TabsTrigger>
            <TabsTrigger value="tx"><Receipt className="mr-1 h-4 w-4" />Transactions</TabsTrigger>
            <TabsTrigger value="kyc"><FileCheck2 className="mr-1 h-4 w-4" />KYC</TabsTrigger>
            <TabsTrigger value="subs">Subscriptions</TabsTrigger>
          </TabsList>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="tx"><TxTab /></TabsContent>
          <TabsContent value="kyc"><KycTab /></TabsContent>
          <TabsContent value="subs"><SubsTab /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Stats() {
  const [stats, setStats] = useState({ users: 0, capital: 0, shares: 0 });
  useEffect(() => {
    (async () => {
      const [{ count: users }, { data: txs }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("amount_kes, shares, type, status"),
      ]);
      const capital = (txs ?? []).filter((t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed")).reduce((s, t) => s + Number(t.amount_kes ?? 0), 0);
      const shares = (txs ?? []).filter((t) => t.type === "share_issuance" && t.status === "completed").reduce((s, t) => s + (t.shares ?? 0), 0);
      setStats({ users: users ?? 0, capital, shares });
    })();
  }, []);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total shareholders</p><p className="font-display text-2xl font-bold text-navy">{formatNumber(stats.users)}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Capital raised</p><p className="font-display text-2xl font-bold text-navy">{formatKes(stats.capital)}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Shares issued</p><p className="font-display text-2xl font-bold text-navy">{formatNumber(stats.shares)}</p></CardContent></Card>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => setUsers(data ?? []));
  }, []);
  const filtered = users.filter((u) => !q || u.email?.toLowerCase().includes(q.toLowerCase()) || u.username?.toLowerCase().includes(q.toLowerCase()) || u.investor_id?.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card>
      <CardHeader><div className="flex items-center gap-2"><Search className="h-4 w-4" /><Input placeholder="Search email, username, ID..." value={q} onChange={(e) => setQ(e.target.value)} /></div></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{u.full_name ?? "—"} · @{u.username}</p>
                <p className="text-xs text-muted-foreground">{u.email} · {u.phone ?? "no phone"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">{u.investor_id}</Badge>
                <Badge>{u.kyc_status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TxTab() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<any[]>([]);
  const load = () => supabase.from("transactions").select("*, profiles(username, investor_id, full_name)").order("created_at", { ascending: false }).limit(200).then(({ data }) => setTxs(data ?? []));
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: "approved" | "rejected" | "completed") => {
    const { error } = await supabase.from("transactions").update({ status, approved_by: user?.id, approved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Transaction ${status}`);
    load();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          {txs.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium capitalize">{t.type.replace("_", " ")} · {formatKes(t.amount_kes)} {t.shares ? `· ${t.shares} shares` : ""}</p>
                <p className="text-xs text-muted-foreground">{t.profiles?.full_name} (@{t.profiles?.username}) · {formatDateTime(t.created_at)} · Ref: {t.reference ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{t.status}</Badge>
                {t.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => update(t.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => update(t.id, "rejected")}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KycTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [notes, setNotes] = useState("");

  const load = () => supabase.from("kyc_submissions").select("*, profiles(username, investor_id, full_name)").order("created_at", { ascending: false }).limit(200).then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, []);

  const open = async (k: any) => {
    setViewing(k);
    setNotes(k.reviewer_notes ?? "");
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(k.document_url, 600);
    setPreviewUrl(data?.signedUrl ?? "");
  };

  const review = async (status: "approved" | "rejected") => {
    if (!viewing) return;
    const { error } = await supabase.from("kyc_submissions").update({ status, reviewer_notes: notes, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", viewing.id);
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ kyc_status: status }).eq("id", viewing.user_id);
    toast.success(`KYC ${status}`);
    setViewing(null); load();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          {items.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{k.profiles?.full_name} (@{k.profiles?.username})</p>
                <p className="text-xs text-muted-foreground">{k.document_type} · #{k.document_number} · {formatDateTime(k.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{k.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => open(k)}>Review</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display text-navy">Review KYC</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <p className="text-sm">{viewing.profiles?.full_name} · {viewing.document_type} · #{viewing.document_number}</p>
              {previewUrl && (previewUrl.match(/\.(pdf)/i) ? (
                <iframe src={previewUrl} className="h-[400px] w-full rounded border" />
              ) : (
                <img src={previewUrl} alt="KYC document" className="max-h-[400px] w-full rounded border object-contain" />
              ))}
              <Textarea placeholder="Reviewer notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => review("approved")} className="flex-1">Approve</Button>
                <Button onClick={() => review("rejected")} variant="destructive" className="flex-1">Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SubsTab() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const load = () => supabase.from("subscriptions").select("*, profiles(username, investor_id, full_name), packages(name)").order("created_at", { ascending: false }).limit(200).then(({ data }) => setSubs(data ?? []));
  useEffect(() => { load(); }, []);

  const approve = async (s: any) => {
    // Mark sub active and issue shares
    const { error: sErr } = await supabase.from("subscriptions").update({ status: "active", approved_by: user?.id, approved_at: new Date().toISOString() }).eq("id", s.id);
    if (sErr) return toast.error(sErr.message);
    const { error: tErr } = await supabase.from("transactions").insert({
      user_id: s.user_id, type: "share_issuance", status: "completed",
      shares: s.shares, amount_kes: s.total_amount_kes,
      reference: `SUB-${s.id.slice(0, 8)}`, related_subscription_id: s.id,
      approved_by: user?.id, approved_at: new Date().toISOString(),
    });
    if (tErr) return toast.error(tErr.message);
    toast.success("Subscription approved & shares issued");
    load();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          {subs.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{s.packages?.name ?? "Custom"} · {s.shares} shares · {formatKes(s.total_amount_kes)}</p>
                <p className="text-xs text-muted-foreground">{s.profiles?.full_name} (@{s.profiles?.username}) · {formatDateTime(s.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{s.status}</Badge>
                {s.status === "pending" && <Button size="sm" onClick={() => approve(s)}>Approve & issue</Button>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
