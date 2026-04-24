import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  component: () => <RequireAuth><Profile /></RequireAuth>,
});

function Profile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      phone: profile.phone,
      username: profile.username,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  if (!profile) return <AppShell><p>Loading...</p></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-navy">My Profile</h1>

        <Card className="bg-gradient-to-br from-navy to-navy/90 text-navy-foreground">
          <CardContent className="pt-6">
            <p className="text-sm text-navy-foreground/70">Investor ID</p>
            <p className="font-display text-3xl font-bold text-gold">{profile.investor_id}</p>
            <div className="mt-3 flex gap-2">
              <Badge variant="secondary">@{profile.username}</Badge>
              <Badge>{profile.kyc_status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Account details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Full name</Label>
                <Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Username</Label>
                <Input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase() })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={profile.email} disabled />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button variant="destructive" onClick={signOut}>Sign out</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
