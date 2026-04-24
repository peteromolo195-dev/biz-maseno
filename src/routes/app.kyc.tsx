import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Upload, FileCheck2, Clock, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/kyc")({
  component: () => <RequireAuth><KYC /></RequireAuth>,
});

function KYC() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [docType, setDocType] = useState("national_id");
  const [docNumber, setDocNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: subs }, { data: prof }] = await Promise.all([
      supabase.from("kyc_submissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("kyc_status").eq("id", user.id).single(),
    ]);
    setSubmissions(subs ?? []);
    setProfile(prof);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) {
      toast.error("Please attach your document");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setUploading(true);
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("kyc-documents").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }

    const { error } = await supabase.from("kyc_submissions").insert({
      user_id: user.id,
      document_type: docType,
      document_number: docNumber,
      document_url: path,
      status: "pending",
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ kyc_status: "pending" }).eq("id", user.id);
    toast.success("KYC submitted for review");
    setFile(null); setDocNumber("");
    load();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">KYC Verification</h1>
          <p className="text-sm text-muted-foreground">Verify your identity to unlock dividends and certificates.</p>
        </div>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <KycStatusIcon status={profile?.kyc_status} />
            <div>
              <p className="text-sm text-muted-foreground">Current status</p>
              <Badge>{profile?.kyc_status ?? "not_submitted"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Submit document</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Document type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dn">Document number</Label>
                <Input id="dn" required value={docNumber} onChange={(e) => setDocNumber(e.target.value)} maxLength={50} />
              </div>
              <div>
                <Label htmlFor="file">Document file (PDF or image, max 10MB)</Label>
                <Input id="file" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
              </div>
              <Button type="submit" disabled={uploading} className="w-full">
                <Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading..." : "Submit for review"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Submission history</CardTitle></CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {submissions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{s.document_type}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.created_at)}</p>
                      {s.reviewer_notes && <p className="mt-1 text-xs italic text-muted-foreground">"{s.reviewer_notes}"</p>}
                    </div>
                    <Badge>{s.status}</Badge>
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

function KycStatusIcon({ status }: { status?: string }) {
  if (status === "approved") return <FileCheck2 className="h-8 w-8 text-success" />;
  if (status === "rejected") return <XCircle className="h-8 w-8 text-destructive" />;
  return <Clock className="h-8 w-8 text-warning" />;
}
