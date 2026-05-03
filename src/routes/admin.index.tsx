import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { audit } from "@/lib/audit";
import { formatKes, formatNumber, formatDateTime } from "@/lib/format";
import { exportTablePDF, generateShareCertificate } from "@/lib/pdf-export";
import {
  Users, Receipt, FileCheck2, ShieldCheck, Search, ScrollText,
  ChevronLeft, ChevronRight, ArrowUpDown, Package as PackageIcon, Settings,
  Plus, Trash2, Pencil, Star, Download, Award,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
            <TabsTrigger value="packages"><PackageIcon className="mr-1 h-4 w-4" />Packages</TabsTrigger>
            <TabsTrigger value="config"><Settings className="mr-1 h-4 w-4" />Configuration</TabsTrigger>
            <TabsTrigger value="audit"><ScrollText className="mr-1 h-4 w-4" />Audit Log</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="tx"><TxTab /></TabsContent>
            <TabsContent value="kyc"><KycTab /></TabsContent>
            <TabsContent value="subs"><SubsTab /></TabsContent>
            <TabsContent value="packages"><PackagesTab /></TabsContent>
            <TabsContent value="config"><ConfigTab /></TabsContent>
            <TabsContent value="audit"><AuditTab /></TabsContent>
          </div>
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
      const capital = (txs ?? [])
        .filter((t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed"))
        .reduce((s, t) => s + Number(t.amount_kes ?? 0), 0);
      const shares = (txs ?? [])
        .filter((t) => t.type === "share_issuance" && t.status === "completed")
        .reduce((s, t) => s + (t.shares ?? 0), 0);
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

/* -------------------- Reusable table toolbar + pager -------------------- */

interface ToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  filter?: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] };
  right?: ReactNode;
}
function Toolbar({ search, onSearch, placeholder, filter, right }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-[200px] flex-1 items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="h-9" />
      </div>
      {filter && (
        <Select value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {filter.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {right}
    </div>
  );
}

function Pager({ page, pageCount, onChange, total }: { page: number; pageCount: number; onChange: (p: number) => void; total: number }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>{total} record{total === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
        <span>Page {page + 1} of {Math.max(pageCount, 1)}</span>
        <Button size="icon" variant="outline" disabled={page + 1 >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function SortableHead({ label, field, sort, onSort }: { label: string; field: string; sort: { field: string; dir: "asc" | "desc" }; onSort: (f: string) => void }) {
  const active = sort.field === field;
  return (
    <TableHead>
      <button onClick={() => onSort(field)} className={`inline-flex items-center gap-1 ${active ? "text-navy" : ""}`}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
      </button>
    </TableHead>
  );
}

function useSort(initial: string, dir: "asc" | "desc" = "desc") {
  const [sort, setSort] = useState({ field: initial, dir });
  const onSort = (f: string) => setSort((s) => s.field === f ? { field: f, dir: s.dir === "asc" ? "desc" : "asc" } : { field: f, dir: "asc" });
  return { sort, onSort };
}

function paginate<T>(rows: T[], page: number, pageSize = 10) {
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

function compareVals(a: unknown, b: unknown, dir: "asc" | "desc") {
  const av = a ?? "";
  const bv = b ?? "";
  if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
  return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
}

/* -------------------- Users -------------------- */

interface UserRow {
  id: string; investor_id: string; username: string; email: string;
  full_name: string | null; phone: string | null; kyc_status: string;
  created_at: string; referral_points: number; wallet_balance?: number;
  shares_owned?: number; referrals_count?: number;
}

function UsersTab() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kyc, setKyc] = useState("all");
  const [page, setPage] = useState(0);
  const { sort, onSort } = useSort("created_at");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: profiles } = await supabase.from("profiles").select("*").limit(1000) as { data: UserRow[] | null };
      const list = (profiles ?? []) as UserRow[];

      const enriched = await Promise.all(list.map(async (u) => {
        const [{ data: shares }, { count: refCount }] = await Promise.all([
          supabase.rpc("user_shares_owned", { _user_id: u.id }),
          supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", u.id),
        ]);
        return { ...u, shares_owned: Number(shares ?? 0), referrals_count: refCount ?? 0 };
      }));
      setRows(enriched);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((u) => kyc === "all" || u.kyc_status === kyc)
      .filter((u) => !term ||
        u.email.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term) ||
        (u.full_name ?? "").toLowerCase().includes(term) ||
        u.investor_id.toLowerCase().includes(term))
      .sort((a, b) => compareVals(
        (a as unknown as Record<string, unknown>)[sort.field],
        (b as unknown as Record<string, unknown>)[sort.field],
        sort.dir,
      ));
  }, [rows, q, kyc, sort]);

  const pageSize = 10;
  const pageCount = Math.ceil(filtered.length / pageSize);
  const visible = paginate(filtered, page, pageSize);

  const exportPDF = () => {
    exportTablePDF(
      "Users Report",
      ["Investor ID", "Name", "Username", "Email", "KYC", "Shares", "Wallet", "Joined"],
      filtered.map((u) => [
        u.investor_id, u.full_name ?? "—", u.username, u.email,
        u.kyc_status, String(u.shares_owned ?? 0),
        formatKes(u.wallet_balance ?? 0), formatDateTime(u.created_at),
      ]),
      "Kenya_Capital_Users.pdf",
    );
  };

  const issueCertificate = (u: UserRow) => {
    if (!u.shares_owned || u.shares_owned <= 0) {
      toast.error("User has no shares");
      return;
    }
    generateShareCertificate({
      investorId: u.investor_id,
      fullName: u.full_name ?? u.username,
      shares: u.shares_owned,
      pricePerShare: 500,
      certificateNo: `KC-${u.investor_id}-${Date.now().toString(36).toUpperCase()}`,
      issueDate: new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" }),
    });
    toast.success("Certificate generated");
  };

  return (
    <Card>
      <CardHeader>
        <Toolbar
          search={q} onSearch={(v) => { setQ(v); setPage(0); }}
          placeholder="Search by name, username, email, or investor ID..."
          filter={{
            value: kyc, onChange: (v) => { setKyc(v); setPage(0); },
            options: [
              { label: "All KYC", value: "all" },
              { label: "Not submitted", value: "not_submitted" },
              { label: "Pending", value: "pending" },
              { label: "Approved", value: "approved" },
              { label: "Rejected", value: "rejected" },
            ],
          }}
          right={<Button size="sm" variant="outline" onClick={exportPDF}><Download className="mr-1 h-4 w-4" />Export PDF</Button>}
        />
      </CardHeader>
      <CardContent>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Investor ID" field="investor_id" sort={sort} onSort={onSort} />
                    <SortableHead label="Name / Username" field="username" sort={sort} onSort={onSort} />
                    <TableHead>Contact</TableHead>
                    <SortableHead label="KYC" field="kyc_status" sort={sort} onSort={onSort} />
                    <SortableHead label="Shares" field="shares_owned" sort={sort} onSort={onSort} />
                    <SortableHead label="Wallet" field="wallet_balance" sort={sort} onSort={onSort} />
                    <SortableHead label="Joined" field="created_at" sort={sort} onSort={onSort} />
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell><Badge variant="secondary" className="font-mono">{u.investor_id}</Badge></TableCell>
                      <TableCell>
                        <div className="font-medium">{u.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">@{u.username}</div>
                      </TableCell>
                      <TableCell>
                        <div>{u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.phone ?? "—"}</div>
                      </TableCell>
                      <TableCell><Badge>{u.kyc_status}</Badge></TableCell>
                      <TableCell className="font-medium">{formatNumber(u.shares_owned ?? 0)}</TableCell>
                      <TableCell className="font-medium">{formatKes(u.wallet_balance ?? 0)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(u.created_at)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => issueCertificate(u)} title="Generate share certificate">
                          <Award className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No users match.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pager page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- Transactions -------------------- */

interface TxRow {
  id: string; type: string; status: string; amount_kes: number; shares: number;
  reference: string | null; description: string | null; created_at: string; user_id: string;
  profiles?: { username?: string; investor_id?: string; full_name?: string | null } | null;
}

function TxTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(0);
  const { sort, onSort } = useSort("created_at");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("transactions")
      .select("*, profiles!transactions_user_id_fkey(username, investor_id, full_name)")
      .order("created_at", { ascending: false }).limit(500);
    setRows((data ?? []) as TxRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (t: TxRow, newStatus: "approved" | "rejected" | "completed") => {
    const { error } = await supabase.from("transactions")
      .update({ status: newStatus, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    await audit(`transaction.${newStatus}`, "transaction", t.id, { amount_kes: t.amount_kes, type: t.type, user_id: t.user_id });
    toast.success(`Transaction ${newStatus}`);
    load();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((t) => status === "all" || t.status === status)
      .filter((t) => type === "all" || t.type === type)
      .filter((t) => !term ||
        (t.reference ?? "").toLowerCase().includes(term) ||
        (t.profiles?.username ?? "").toLowerCase().includes(term) ||
        (t.profiles?.investor_id ?? "").toLowerCase().includes(term) ||
        (t.profiles?.full_name ?? "").toLowerCase().includes(term))
      .sort((a, b) => compareVals(
        (a as unknown as Record<string, unknown>)[sort.field],
        (b as unknown as Record<string, unknown>)[sort.field],
        sort.dir,
      ));
  }, [rows, q, status, type, sort]);

  const pageCount = Math.ceil(filtered.length / 10);
  const visible = paginate(filtered, page);

  const exportPDF = () => {
    exportTablePDF(
      "Transactions Report",
      ["Date", "User", "Type", "Amount", "Shares", "Reference", "Status"],
      filtered.map((t) => [
        formatDateTime(t.created_at),
        `${t.profiles?.full_name ?? "—"} (${t.profiles?.investor_id ?? ""})`,
        t.type.replace(/_/g, " "), formatKes(t.amount_kes),
        String(t.shares || "—"), t.reference ?? "—", t.status,
      ]),
      "Kenya_Capital_Transactions.pdf",
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <Toolbar
          search={q} onSearch={(v) => { setQ(v); setPage(0); }}
          placeholder="Search reference, investor, name..."
          filter={{
            value: status, onChange: (v) => { setStatus(v); setPage(0); },
            options: [
              { label: "All status", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Approved", value: "approved" },
              { label: "Completed", value: "completed" },
              { label: "Rejected", value: "rejected" },
            ],
          }}
          right={
            <div className="flex gap-2">
              <Select value={type} onValueChange={(v) => { setType(v); setPage(0); }}>
                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="share_issuance">Share issuance</SelectItem>
                  <SelectItem value="referral_bonus">Referral bonus</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={exportPDF}><Download className="mr-1 h-4 w-4" />PDF</Button>
            </div>
          }
        />
      </CardHeader>
      <CardContent>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Date" field="created_at" sort={sort} onSort={onSort} />
                    <TableHead>User</TableHead>
                    <SortableHead label="Type" field="type" sort={sort} onSort={onSort} />
                    <SortableHead label="Amount" field="amount_kes" sort={sort} onSort={onSort} />
                    <TableHead>Shares</TableHead>
                    <TableHead>Reference</TableHead>
                    <SortableHead label="Status" field="status" sort={sort} onSort={onSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{t.profiles?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">@{t.profiles?.username} · <span className="font-mono">{t.profiles?.investor_id}</span></div>
                      </TableCell>
                      <TableCell className="capitalize">{t.type.replace(/_/g, " ")}</TableCell>
                      <TableCell className="font-medium">{formatKes(t.amount_kes)}</TableCell>
                      <TableCell>{t.shares || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{t.reference ?? "—"}</TableCell>
                      <TableCell><Badge>{t.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {t.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => update(t, "approved")}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => update(t, "rejected")}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No transactions match.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pager page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- KYC Review -------------------- */

interface KycRow {
  id: string; user_id: string; document_type: string; document_number: string | null;
  document_url: string; selfie_url: string | null; status: string;
  reviewer_notes: string | null; reviewed_at: string | null; created_at: string;
  profiles?: { username?: string; investor_id?: string; full_name?: string | null; email?: string } | null;
}

function KycTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<KycRow | null>(null);
  const [docPreview, setDocPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("kyc_submissions")
      .select("*, profiles!kyc_submissions_user_id_fkey(username, investor_id, full_name, email)")
      .order("created_at", { ascending: false }).limit(500);
    setRows((data ?? []) as KycRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const open = async (k: KycRow) => {
    setViewing(k);
    setNotes(k.reviewer_notes ?? "");
    const { data: doc } = await supabase.storage.from("kyc-documents").createSignedUrl(k.document_url, 600);
    setDocPreview(doc?.signedUrl ?? "");
    if (k.selfie_url) {
      const { data: s } = await supabase.storage.from("kyc-documents").createSignedUrl(k.selfie_url, 600);
      setSelfiePreview(s?.signedUrl ?? "");
    } else {
      setSelfiePreview("");
    }
  };

  const review = async (newStatus: "approved" | "rejected") => {
    if (!viewing) return;
    const { error } = await supabase.from("kyc_submissions")
      .update({ status: newStatus, reviewer_notes: notes, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", viewing.id);
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ kyc_status: newStatus }).eq("id", viewing.user_id);
    await audit(`kyc.${newStatus}`, "kyc_submission", viewing.id, {
      user_id: viewing.user_id,
      document_type: viewing.document_type,
      notes: notes || null,
    });
    toast.success(`KYC ${newStatus}`);
    setViewing(null); load();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((k) => status === "all" || k.status === status)
      .filter((k) => !term ||
        (k.profiles?.username ?? "").toLowerCase().includes(term) ||
        (k.profiles?.full_name ?? "").toLowerCase().includes(term) ||
        (k.profiles?.investor_id ?? "").toLowerCase().includes(term) ||
        (k.document_number ?? "").toLowerCase().includes(term));
  }, [rows, q, status]);

  const pageCount = Math.ceil(filtered.length / 10);
  const visible = paginate(filtered, page);

  const exportPDF = () => {
    exportTablePDF(
      "KYC Submissions Report",
      ["Submitted", "User", "Document Type", "Doc #", "Status", "Reviewed"],
      filtered.map((k) => [
        formatDateTime(k.created_at),
        `${k.profiles?.full_name ?? "—"} (${k.profiles?.investor_id ?? ""})`,
        k.document_type.replace(/_/g, " "), k.document_number ?? "—",
        k.status, k.reviewed_at ? formatDateTime(k.reviewed_at) : "—",
      ]),
      "Kenya_Capital_KYC.pdf",
    );
  };

  return (
    <Card>
      <CardHeader>
        <Toolbar
          search={q} onSearch={(v) => { setQ(v); setPage(0); }}
          placeholder="Search by user or document number..."
          filter={{
            value: status, onChange: (v) => { setStatus(v); setPage(0); },
            options: [
              { label: "All status", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Approved", value: "approved" },
              { label: "Rejected", value: "rejected" },
            ],
          }}
          right={<Button size="sm" variant="outline" onClick={exportPDF}><Download className="mr-1 h-4 w-4" />PDF</Button>}
        />
      </CardHeader>
      <CardContent>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(k.created_at)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{k.profiles?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">@{k.profiles?.username} · <span className="font-mono">{k.profiles?.investor_id}</span></div>
                      </TableCell>
                      <TableCell>
                        <div className="capitalize">{k.document_type.replace(/_/g, " ")}</div>
                        <div className="text-xs text-muted-foreground">#{k.document_number ?? "—"}</div>
                      </TableCell>
                      <TableCell><Badge>{k.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{k.reviewed_at ? formatDateTime(k.reviewed_at) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => open(k)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No submissions match.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pager page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
          </>
        )}
      </CardContent>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="font-display text-navy">Review KYC submission</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{viewing.profiles?.full_name} <span className="text-muted-foreground">(@{viewing.profiles?.username})</span></p>
                <p className="text-xs text-muted-foreground">{viewing.profiles?.email} · Investor <span className="font-mono">{viewing.profiles?.investor_id}</span></p>
                <p className="mt-1 text-xs">Document: <span className="capitalize">{viewing.document_type.replace(/_/g, " ")}</span> · #{viewing.document_number ?? "—"}</p>
                <p className="mt-1 text-xs">Submitted: {formatDateTime(viewing.created_at)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Document</p>
                  {docPreview ? (docPreview.match(/\.pdf(\?|$)/i) ? (
                    <iframe src={docPreview} className="h-[320px] w-full rounded border" title="KYC document" />
                  ) : (
                    <a href={docPreview} target="_blank" rel="noreferrer">
                      <img src={docPreview} alt="KYC document" className="max-h-[320px] w-full rounded border object-contain" />
                    </a>
                  )) : <p className="text-xs text-muted-foreground">Loading…</p>}
                  {docPreview && <a href={docPreview} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">Open / download</a>}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Selfie</p>
                  {selfiePreview ? (
                    <a href={selfiePreview} target="_blank" rel="noreferrer">
                      <img src={selfiePreview} alt="Selfie" className="max-h-[320px] w-full rounded border object-contain" />
                    </a>
                  ) : <p className="rounded border border-dashed p-6 text-center text-xs text-muted-foreground">No selfie uploaded</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Reviewer notes</label>
                <Textarea placeholder="Add a note (visible to admins)…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

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

/* -------------------- Subscriptions -------------------- */

interface SubRow {
  id: string; user_id: string; shares: number; total_amount_kes: number;
  price_per_share_kes: number;
  status: string; created_at: string;
  profiles?: { username?: string; investor_id?: string; full_name?: string | null } | null;
  packages?: { name?: string } | null;
}

function SubsTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("subscriptions")
      .select("*, profiles!subscriptions_user_id_fkey(username, investor_id, full_name), packages(name)")
      .order("created_at", { ascending: false }).limit(500);
    setRows((data ?? []) as SubRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (s: SubRow) => {
    // Check if user has sufficient wallet balance
    const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", s.user_id).single();
    const balance = Number(profile?.wallet_balance ?? 0);
    if (balance < s.total_amount_kes) {
      toast.error(`Insufficient wallet balance (${formatKes(balance)} < ${formatKes(s.total_amount_kes)}). User needs to deposit first.`);
      return;
    }

    const { error: sErr } = await supabase.from("subscriptions")
      .update({ status: "active", approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("id", s.id);
    if (sErr) return toast.error(sErr.message);
    const { error: tErr } = await supabase.from("transactions").insert({
      user_id: s.user_id, type: "share_issuance" as const, status: "completed" as const,
      shares: s.shares, amount_kes: s.total_amount_kes,
      reference: `SUB-${s.id.slice(0, 8)}`, related_subscription_id: s.id,
      approved_by: user?.id, approved_at: new Date().toISOString(),
    });
    if (tErr) return toast.error(tErr.message);
    await audit("subscription.approved", "subscription", s.id, { user_id: s.user_id, shares: s.shares });
    toast.success("Subscription approved & shares issued");
    load();
  };

  const reject = async (s: SubRow) => {
    const { error } = await supabase.from("subscriptions")
      .update({ status: "rejected", approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    await audit("subscription.rejected", "subscription", s.id, { user_id: s.user_id });
    toast.success("Subscription rejected");
    load();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((s) => status === "all" || s.status === status)
      .filter((s) => !term ||
        (s.profiles?.username ?? "").toLowerCase().includes(term) ||
        (s.profiles?.full_name ?? "").toLowerCase().includes(term) ||
        (s.profiles?.investor_id ?? "").toLowerCase().includes(term) ||
        (s.packages?.name ?? "").toLowerCase().includes(term));
  }, [rows, q, status]);

  const pageCount = Math.ceil(filtered.length / 10);
  const visible = paginate(filtered, page);

  const exportPDF = () => {
    exportTablePDF(
      "Subscriptions Report",
      ["Created", "User", "Package", "Shares", "Total", "Status"],
      filtered.map((s) => [
        formatDateTime(s.created_at),
        `${s.profiles?.full_name ?? "—"} (${s.profiles?.investor_id ?? ""})`,
        s.packages?.name ?? "Custom", String(s.shares), formatKes(s.total_amount_kes), s.status,
      ]),
      "Kenya_Capital_Subscriptions.pdf",
    );
  };

  return (
    <Card>
      <CardHeader>
        <Toolbar
          search={q} onSearch={(v) => { setQ(v); setPage(0); }}
          placeholder="Search by user or package..."
          filter={{
            value: status, onChange: (v) => { setStatus(v); setPage(0); },
            options: [
              { label: "All status", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Active", value: "active" },
              { label: "Rejected", value: "rejected" },
              { label: "Cancelled", value: "cancelled" },
            ],
          }}
          right={<Button size="sm" variant="outline" onClick={exportPDF}><Download className="mr-1 h-4 w-4" />PDF</Button>}
        />
      </CardHeader>
      <CardContent>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{s.profiles?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">@{s.profiles?.username}</div>
                      </TableCell>
                      <TableCell>{s.packages?.name ?? "Custom"}</TableCell>
                      <TableCell>{formatNumber(s.shares)}</TableCell>
                      <TableCell className="font-medium">{formatKes(s.total_amount_kes)}</TableCell>
                      <TableCell><Badge>{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {s.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => approve(s)}>Approve & issue</Button>
                            <Button size="sm" variant="outline" onClick={() => reject(s)}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No subscriptions match.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pager page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- Audit Log -------------------- */

interface AuditRow {
  id: string; created_at: string; actor_id: string | null; action: string;
  entity: string | null; entity_id: string | null; details: unknown;
}

function AuditTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [actorMap, setActorMap] = useState<Record<string, { username: string; investor_id: string }>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(1000);
      const audits = (data ?? []) as AuditRow[];
      setRows(audits);
      const ids = Array.from(new Set(audits.map((a) => a.actor_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, investor_id").in("id", ids);
        const map: Record<string, { username: string; investor_id: string }> = {};
        (profs ?? []).forEach((p) => { map[p.id] = { username: p.username, investor_id: p.investor_id }; });
        setActorMap(map);
      }
      setLoading(false);
    })();
  }, []);

  const entities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.entity && set.add(r.entity));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => entity === "all" || r.entity === entity)
      .filter((r) => {
        if (!term) return true;
        const actor = r.actor_id ? actorMap[r.actor_id] : null;
        return r.action.toLowerCase().includes(term) ||
          (r.entity ?? "").toLowerCase().includes(term) ||
          (r.entity_id ?? "").toLowerCase().includes(term) ||
          (actor?.username ?? "").toLowerCase().includes(term) ||
          (actor?.investor_id ?? "").toLowerCase().includes(term) ||
          JSON.stringify(r.details ?? {}).toLowerCase().includes(term);
      });
  }, [rows, q, entity, actorMap]);

  const pageCount = Math.ceil(filtered.length / 15);
  const visible = paginate(filtered, page, 15);

  const exportPDF = () => {
    exportTablePDF(
      "Audit Log Report",
      ["When", "Actor", "Action", "Entity", "Details"],
      filtered.map((r) => {
        const actor = r.actor_id ? actorMap[r.actor_id] : null;
        return [
          formatDateTime(r.created_at),
          actor ? `@${actor.username} (${actor.investor_id})` : "system",
          r.action, r.entity ?? "—",
          r.details ? JSON.stringify(r.details, null, 0).slice(0, 100) : "—",
        ];
      }),
      "Kenya_Capital_Audit_Log.pdf",
    );
  };

  return (
    <Card>
      <CardHeader>
        <Toolbar
          search={q} onSearch={(v) => { setQ(v); setPage(0); }}
          placeholder="Search action, actor, entity, or details..."
          filter={{
            value: entity, onChange: (v) => { setEntity(v); setPage(0); },
            options: [{ label: "All entities", value: "all" }, ...entities.map((e) => ({ label: e, value: e }))],
          }}
          right={<Button size="sm" variant="outline" onClick={exportPDF}><Download className="mr-1 h-4 w-4" />PDF</Button>}
        />
      </CardHeader>
      <CardContent>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => {
                    const actor = r.actor_id ? actorMap[r.actor_id] : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                        <TableCell>
                          {actor ? (
                            <>
                              <div>@{actor.username}</div>
                              <div className="font-mono text-xs text-muted-foreground">{actor.investor_id}</div>
                            </>
                          ) : <span className="text-xs text-muted-foreground">system</span>}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{r.action}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {r.entity ?? "—"}
                          {r.entity_id && <div className="font-mono text-muted-foreground">{r.entity_id.slice(0, 8)}…</div>}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted px-2 py-1 text-[11px]">{r.details ? JSON.stringify(r.details, null, 0) : "—"}</pre>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visible.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No audit entries match.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pager page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- Packages CRUD -------------------- */

interface PackageRow {
  id: string; name: string; tagline: string | null; price_per_share_kes: number;
  min_shares: number; benefits: unknown; is_featured: boolean; active: boolean;
  sort_order: number; created_at: string;
}

interface PackageForm {
  id?: string; name: string; tagline: string; price_per_share_kes: string;
  min_shares: string; benefits: string; is_featured: boolean; active: boolean; sort_order: string;
}

const emptyPackage: PackageForm = {
  name: "", tagline: "", price_per_share_kes: "500", min_shares: "10",
  benefits: "", is_featured: false, active: true, sort_order: "0",
};

function PackagesTab() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PackageForm | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("packages").select("*").order("sort_order").order("created_at");
    setRows((data ?? []) as PackageRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => setEditing({ ...emptyPackage });
  const openEdit = (p: PackageRow) => setEditing({
    id: p.id, name: p.name, tagline: p.tagline ?? "",
    price_per_share_kes: String(p.price_per_share_kes), min_shares: String(p.min_shares),
    benefits: Array.isArray(p.benefits) ? (p.benefits as string[]).join("\n") : "",
    is_featured: p.is_featured, active: p.active, sort_order: String(p.sort_order),
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Name is required");
    const price = Number(editing.price_per_share_kes);
    const minShares = Number(editing.min_shares);
    if (!(price > 0)) return toast.error("Price per share must be > 0");
    if (!(minShares > 0)) return toast.error("Min shares must be > 0");

    const payload = {
      name: editing.name.trim(), tagline: editing.tagline.trim() || null,
      price_per_share_kes: price, min_shares: minShares,
      benefits: editing.benefits.split("\n").map((s) => s.trim()).filter(Boolean),
      is_featured: editing.is_featured, active: editing.active,
      sort_order: Number(editing.sort_order) || 0,
    };

    if (editing.id) {
      const { error } = await supabase.from("packages").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await audit("package.updated", "package", editing.id, payload);
      toast.success("Package updated");
    } else {
      const { data, error } = await supabase.from("packages").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      await audit("package.created", "package", data?.id ?? null, payload);
      toast.success("Package created");
    }
    setEditing(null); load();
  };

  const remove = async (p: PackageRow) => {
    if (!confirm(`Delete package "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("packages").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await audit("package.deleted", "package", p.id, { name: p.name });
    toast.success("Package deleted"); load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-display text-navy">Share packages</CardTitle>
          <p className="text-xs text-muted-foreground">Public-facing investment tiers</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New package</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price / share</TableHead>
                  <TableHead>Min shares</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.tagline ?? "—"}</div>
                    </TableCell>
                    <TableCell className="font-medium">{formatKes(p.price_per_share_kes)}</TableCell>
                    <TableCell>{formatNumber(p.min_shares)}</TableCell>
                    <TableCell>{p.is_featured ? <Star className="h-4 w-4 text-gold" /> : "—"}</TableCell>
                    <TableCell><Badge variant={p.active ? "default" : "secondary"}>{p.active ? "active" : "hidden"}</Badge></TableCell>
                    <TableCell>{p.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(p)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No packages yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="font-display text-navy">{editing?.id ? "Edit package" : "New package"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Bronze, Silver, Gold" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">Tagline</label>
                <Input value={editing.tagline} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} placeholder="Short pitch shown on the card" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Price per share (KSh)</label>
                  <Input type="number" min={1} value={editing.price_per_share_kes} onChange={(e) => setEditing({ ...editing, price_per_share_kes: e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Minimum shares</label>
                  <Input type="number" min={1} value={editing.min_shares} onChange={(e) => setEditing({ ...editing, min_shares: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">Benefits (one per line)</label>
                <Textarea rows={4} value={editing.benefits} onChange={(e) => setEditing({ ...editing, benefits: e.target.value })} placeholder={"Priority dividend payouts\nQuarterly investor calls\n..."} />
              </div>
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} />
                  <span className="text-xs">Featured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                  <span className="text-xs">Active</span>
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Sort order</label>
                  <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={save} className="flex-1">{editing.id ? "Save changes" : "Create package"}</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* -------------------- Configuration -------------------- */

interface ConfigItem {
  key: string; label: string; description: string; type: "number" | "text"; prefix?: string;
}

const CONFIG_ITEMS: ConfigItem[] = [
  { key: "company_name", label: "Company name", description: "Displayed on certificates and statements", type: "text" },
  { key: "share_price_kes", label: "Current share price", description: "Default KSh per share for new subscriptions", type: "number", prefix: "KSh" },
  { key: "min_shares_per_tx", label: "Minimum shares per subscription", description: "Smallest allowed share count in one purchase", type: "number" },
  { key: "max_shares_per_tx", label: "Maximum shares per subscription", description: "Largest allowed share count in one purchase", type: "number" },
  { key: "min_deposit_kes", label: "Minimum deposit", description: "Minimum KSh users can record per deposit", type: "number", prefix: "KSh" },
  { key: "total_shares_authorised", label: "Total shares authorised", description: "Cap on total issuable shares", type: "number" },
  { key: "referral_points_referrer", label: "Referrer bonus points", description: "Awarded to the referring user on signup", type: "number" },
  { key: "referral_points_referred", label: "Referred bonus points", description: "Awarded to the new user on signup", type: "number" },
];

function ConfigTab() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_config").select("*");
    const map: Record<string, string> = {};
    (data ?? []).forEach((r) => {
      const v = r.value;
      map[r.key] = typeof v === "string" ? v : JSON.stringify(v);
    });
    setValues(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (item: ConfigItem) => {
    setSaving(item.key);
    const raw = values[item.key] ?? "";
    let parsed: unknown;
    if (item.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) { toast.error("Must be a number"); setSaving(null); return; }
      parsed = n;
    } else {
      parsed = raw;
    }
    const { error } = await supabase.from("app_config")
      .upsert({ key: item.key, value: parsed as never, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); setSaving(null); return; }
    await audit("config.updated", "app_config", item.key, { value: parsed });
    toast.success(`${item.label} saved`);
    setSaving(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-navy">System configuration</CardTitle>
        <p className="text-xs text-muted-foreground">Global settings used across the platform</p>
      </CardHeader>
      <CardContent>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {CONFIG_ITEMS.map((item) => (
              <div key={item.key} className="grid gap-1 rounded-md border p-3">
                <label className="text-sm font-medium text-navy">{item.label}</label>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                <div className="mt-1 flex items-center gap-2">
                  {item.prefix && <span className="text-xs text-muted-foreground">{item.prefix}</span>}
                  <Input
                    type={item.type === "number" ? "number" : "text"}
                    value={values[item.key] ?? ""}
                    onChange={(e) => setValues({ ...values, [item.key]: e.target.value })}
                    className="h-9"
                  />
                  <Button size="sm" onClick={() => save(item)} disabled={saving === item.key}>
                    {saving === item.key ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
