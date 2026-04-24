import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Hash, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/chat")({
  component: () => <RequireAuth><Chat /></RequireAuth>,
});

function Chat() {
  const { user } = useAuth();
  const [me, setMe] = useState<any>(null);
  const [publicMsgs, setPublicMsgs] = useState<any[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [dmTarget, setDmTarget] = useState<{ id: string; username: string } | null>(null);
  const [dmMsgs, setDmMsgs] = useState<any[]>([]);
  const [dmText, setDmText] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const publicEnd = useRef<HTMLDivElement>(null);
  const dmEnd = useRef<HTMLDivElement>(null);

  // Load my profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, username, investor_id").eq("id", user.id).single().then(({ data }) => setMe(data));
  }, [user]);

  // Load public messages + subscribe
  const loadPublic = async () => {
    const { data } = await supabase.from("messages").select("*").eq("channel", "public").order("created_at", { ascending: true }).limit(200);
    setPublicMsgs(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((m) => m.sender_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("public_profiles").select("id, username").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.username; });
      setUsernames((u) => ({ ...u, ...map }));
    }
  };

  useEffect(() => {
    if (!user) return;
    loadPublic();
    const ch = supabase.channel("public-chat").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "channel=eq.public" }, (payload) => {
      setPublicMsgs((m) => [...m, payload.new]);
      const sid = (payload.new as any).sender_id;
      if (!usernames[sid]) {
        supabase.from("public_profiles").select("username").eq("id", sid).single().then(({ data }) => {
          if (data) setUsernames((u) => ({ ...u, [sid]: (data as any).username }));
        });
      }
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => { publicEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [publicMsgs]);
  useEffect(() => { dmEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMsgs]);

  const sendPublic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, channel: "public", body });
    if (error) toast.error(error.message);
  };

  // DM logic
  const loadDm = async (targetId: string) => {
    if (!user) return;
    const { data } = await supabase.from("messages").select("*").or(`and(sender_id.eq.${user.id},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${user.id})`).order("created_at", { ascending: true }).limit(200);
    setDmMsgs(data ?? []);
  };

  useEffect(() => {
    if (!dmTarget || !user) return;
    loadDm(dmTarget.id);
    const ch = supabase.channel(`dm-${dmTarget.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const m = payload.new as any;
      if ((m.sender_id === user.id && m.recipient_id === dmTarget.id) || (m.sender_id === dmTarget.id && m.recipient_id === user.id)) {
        setDmMsgs((prev) => [...prev, m]);
      }
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [dmTarget, user]);

  const sendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim() || !user || !dmTarget) return;
    const body = dmText.trim();
    setDmText("");
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: dmTarget.id, channel: "dm", body });
    if (error) toast.error(error.message);
  };

  const searchUsers = async () => {
    if (!searchUser.trim()) return;
    const { data } = await supabase.from("public_profiles").select("id, username, investor_id").ilike("username", `%${searchUser.trim()}%`).limit(20);
    setFoundUsers((data ?? []).filter((u: any) => u.id !== user?.id));
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-navy">Investor Chat</h1>
        <p className="text-sm text-muted-foreground">Only usernames are shown — no personal details are exposed.</p>

        <Tabs defaultValue="public">
          <TabsList>
            <TabsTrigger value="public"><Hash className="mr-1 h-4 w-4" />Public</TabsTrigger>
            <TabsTrigger value="dm"><MessageCircle className="mr-1 h-4 w-4" />Direct messages</TabsTrigger>
          </TabsList>

          <TabsContent value="public">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">#general</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[50vh] overflow-y-auto rounded-md border bg-muted/20 p-3">
                  {publicMsgs.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet. Be the first!</p>}
                  {publicMsgs.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`mb-2 flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-navy text-navy-foreground" : "bg-background border"}`}>
                          {!isMe && <div className="text-xs font-semibold text-gold">@{usernames[m.sender_id] ?? "user"}</div>}
                          <div>{m.body}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={publicEnd} />
                </div>
                <form onSubmit={sendPublic} className="mt-3 flex gap-2">
                  <Input placeholder="Say something..." value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
                  <Button type="submit"><Send className="h-4 w-4" /></Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dm">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Find a user</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input placeholder="Search by username..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
                  <Button onClick={searchUsers}>Search</Button>
                </div>
                {foundUsers.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {foundUsers.map((u) => (
                      <button key={u.id} onClick={() => { setDmTarget({ id: u.id, username: u.username }); setFoundUsers([]); }} className="flex w-full items-center justify-between rounded-md border p-2 text-left text-sm hover:bg-muted">
                        <span className="font-medium">@{u.username}</span>
                        <span className="font-mono text-xs text-muted-foreground">{u.investor_id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {dmTarget && (
                  <div className="mt-4">
                    <div className="mb-2 rounded-md bg-muted px-3 py-2 text-sm">Chatting with <strong>@{dmTarget.username}</strong></div>
                    <div className="h-[40vh] overflow-y-auto rounded-md border bg-muted/20 p-3">
                      {dmMsgs.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet.</p>}
                      {dmMsgs.map((m) => {
                        const isMe = m.sender_id === user?.id;
                        return (
                          <div key={m.id} className={`mb-2 flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-navy text-navy-foreground" : "bg-background border"}`}>{m.body}</div>
                          </div>
                        );
                      })}
                      <div ref={dmEnd} />
                    </div>
                    <form onSubmit={sendDm} className="mt-3 flex gap-2">
                      <Input placeholder="Type a message..." value={dmText} onChange={(e) => setDmText(e.target.value)} maxLength={2000} />
                      <Button type="submit"><Send className="h-4 w-4" /></Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
