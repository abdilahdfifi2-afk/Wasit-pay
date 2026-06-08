import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageCircle, ArrowLeft, Image as ImageIcon, Trash2, Pencil, Check, X, Search, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>) => ({ to: (s.to as string) || "" }),
  head: () => ({ meta: [{ title: "Messages — Wasit.pay" }] }),
  component: ChatPage,
});

// Simple beep using Web Audio for new message sound
function playBeep() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 300);
  } catch {}
}

function SignedImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let alive = true;
    if (path.startsWith("http")) { setUrl(path); return; }
    supabase.storage.from("message-attachments").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (alive && data) setUrl(data.signedUrl);
    });
    return () => { alive = false; };
  }, [path]);
  if (!url) return <div className="h-40 w-40 bg-muted/40 animate-pulse rounded-lg" />;
  return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="attachment" className="max-h-60 rounded-lg object-cover" loading="lazy" /></a>;
}

function ChatPage() {
  const { user, loading } = useAuth();
  const { to } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activePeer, setActivePeer] = useState<string>(to);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);
  useEffect(() => { if (to) setActivePeer(to); }, [to]);

  // Threads list
  const { data: threads } = useQuery({
    queryKey: ["threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, message, image_url, created_at, is_read, deleted_at")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(300);
      const map = new Map<string, any>();
      for (const m of data ?? []) {
        const peer = m.sender_id === user!.id ? m.receiver_id : m.sender_id;
        const isPeerToMe = m.receiver_id === user!.id;
        if (!map.has(peer)) {
          map.set(peer, {
            peer,
            last: m.deleted_at ? "🗑️ Deleted message" : (m.message || (m.image_url ? "📷 Image" : "")),
            at: m.created_at,
            unread: 0,
          });
        }
        if (isPeerToMe && !m.is_read) {
          map.get(peer).unread += 1;
        }
      }
      const out = Array.from(map.values());
      if (out.length) {
        const { data: profiles } = await supabase.from("public_profiles").select("id, full_name, avatar_url").in("id", out.map((t) => t.peer));
        const pm = new Map((profiles ?? []).map((p: any) => [p.id, p]));
        out.forEach((t) => {
          const p = pm.get(t.peer);
          t.name = p?.full_name || t.peer.slice(0, 8);
          t.avatar = p?.avatar_url;
        });
      }
      return out;
    },
  });

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t: any) => (t.name || "").toLowerCase().includes(q) || (t.last || "").toLowerCase().includes(q));
  }, [threads, search]);

  const totalUnread = useMemo(() => (threads ?? []).reduce((s: number, t: any) => s + (t.unread || 0), 0), [threads]);

  const { data: messages } = useQuery({
    queryKey: ["messages", user?.id, activePeer],
    enabled: !!user && !!activePeer,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${activePeer}),and(sender_id.eq.${activePeer},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      await supabase.from("messages").update({ is_read: true }).eq("receiver_id", user!.id).eq("sender_id", activePeer).eq("is_read", false);
      qc.invalidateQueries({ queryKey: ["threads"] });
      return data ?? [];
    },
  });

  // Realtime: incoming messages → invalidate + sound + browser notification
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("msgs-inbox-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, (payload) => {
        qc.invalidateQueries({ queryKey: ["messages"] });
        qc.invalidateQueries({ queryKey: ["threads"] });
        const m: any = payload.new;
        playBeep();
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
          try { new Notification("New message", { body: m.message || "📷 Image", icon: "/favicon.ico" }); } catch {}
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["messages"] });
        qc.invalidateQueries({ queryKey: ["threads"] });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["messages"] });
        qc.invalidateQueries({ queryKey: ["threads"] });
      })
      .subscribe();
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  // Presence + typing channel for the active peer (sorted IDs so both join the same room)
  useEffect(() => {
    if (!user || !activePeer) { setPeerOnline(false); setPeerTyping(false); return; }
    const roomId = [user.id, activePeer].sort().join("__");
    const ch = supabase.channel("chat-room-" + roomId, { config: { presence: { key: user.id } } });
    channelRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any>;
      setPeerOnline(!!state[activePeer]);
    })
      .on("broadcast", { event: "typing" }, (msg: any) => {
        if (msg.payload?.from === activePeer) {
          setPeerTyping(true);
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setPeerTyping(false), 2500);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (msg: any) => {
        if (msg.payload?.from === activePeer) setPeerTyping(false);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await ch.track({ online_at: new Date().toISOString() });
      });
    return () => {
      clearTimeout(typingTimerRef.current);
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [user, activePeer]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, peerTyping]);

  const broadcastTyping = () => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { from: user.id } });
  };

  const send = async () => {
    if (!draft.trim() || !user || !activePeer) return;
    const text = draft.trim().slice(0, 1000);
    setDraft("");
    channelRef.current?.send({ type: "broadcast", event: "stop_typing", payload: { from: user.id } });
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: activePeer, message: text });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["messages"] });
    qc.invalidateQueries({ queryKey: ["threads"] });
  };

  const sendImage = async (file: File) => {
    if (!user || !activePeer) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("message-attachments").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: activePeer, image_url: path });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["messages"] });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("messages").update({ deleted_at: new Date().toISOString(), message: null, image_url: null }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["messages"] });
    qc.invalidateQueries({ queryKey: ["threads"] });
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    const { error } = await supabase.from("messages").update({ message: editText.trim().slice(0, 1000), edited_at: new Date().toISOString() }).eq("id", editingId);
    if (error) return toast.error(error.message);
    setEditingId(null);
    setEditText("");
    qc.invalidateQueries({ queryKey: ["messages"] });
  };

  if (!user) return null;

  const activeThread = threads?.find((t: any) => t.peer === activePeer);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <SiteHeader />
      <div className="container mx-auto h-[calc(100vh-4rem)] flex">
        {/* Threads */}
        <aside className={`${activePeer ? "hidden md:flex" : "flex"} flex-col md:w-80 w-full border-r border-border/40 glass`}>
          <div className="p-4 border-b border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">Messages</h2>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">{totalUnread}</span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..." className="pl-8 h-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!filteredThreads?.length ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                {search ? "No matches." : "No conversations yet."}
              </div>
            ) : filteredThreads.map((t: any) => (
              <button key={t.peer} onClick={() => setActivePeer(t.peer)} className={`w-full text-left p-3 border-b border-border/40 hover:bg-muted/20 transition-colors flex items-center gap-3 ${activePeer === t.peer ? "bg-muted/30" : ""}`}>
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
                    {t.avatar ? <img src={t.avatar} alt="" className="h-full w-full object-cover" /> : t.name?.[0]?.toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.last}</div>
                </div>
                {t.unread > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{t.unread}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        <section className={`${activePeer ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
          {activePeer ? (
            <>
              <div className="p-3 border-b border-border/40 glass flex items-center gap-3">
                <button onClick={() => setActivePeer("")} className="md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-xs overflow-hidden">
                  {activeThread?.avatar ? <img src={activeThread.avatar} alt="" className="h-full w-full object-cover" /> : (activeThread?.name?.[0]?.toUpperCase() ?? activePeer.slice(0, 1).toUpperCase())}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{activeThread?.name ?? activePeer.slice(0, 8)}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Circle className={`h-2 w-2 ${peerOnline ? "fill-green-500 text-green-500" : "fill-muted-foreground/40 text-muted-foreground/40"}`} />
                    {peerTyping ? "typing..." : peerOnline ? "Online" : "Offline"}
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages?.map((m: any) => {
                  const mine = m.sender_id === user.id;
                  const isEditing = editingId === m.id;
                  return (
                    <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm relative ${mine ? "bg-gradient-gold text-primary-foreground rounded-br-sm" : "glass-card rounded-bl-sm"}`}>
                        {m.deleted_at ? (
                          <em className="opacity-60">🗑️ Message deleted</em>
                        ) : isEditing ? (
                          <div className="flex items-center gap-1 min-w-[200px]">
                            <Input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="h-7 text-sm bg-background/20 border-0 text-current" />
                            <button onClick={saveEdit} className="p-1"><Check className="h-4 w-4" /></button>
                            <button onClick={() => { setEditingId(null); setEditText(""); }} className="p-1"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <>
                            {m.image_url && <div className="mb-1"><SignedImage path={m.image_url} /></div>}
                            {m.message && <div className="whitespace-pre-wrap break-words">{m.message}</div>}
                          </>
                        )}
                        <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {m.edited_at && !m.deleted_at && <span className="italic">· edited</span>}
                          {mine && !m.deleted_at && (
                            <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              {m.message && !m.image_url && (
                                <button onClick={() => { setEditingId(m.id); setEditText(m.message); }} title="Edit"><Pencil className="h-3 w-3" /></button>
                              )}
                              <button onClick={() => deleteMessage(m.id)} title="Delete"><Trash2 className="h-3 w-3" /></button>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {peerTyping && (
                  <div className="flex justify-start">
                    <div className="glass-card px-3 py-2 rounded-2xl rounded-bl-sm text-sm">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                      </span>
                    </div>
                  </div>
                )}
                {!messages?.length && <div className="text-center text-sm text-muted-foreground py-12">Start the conversation 👋</div>}
              </div>

              <div className="p-3 border-t border-border/40 glass flex gap-2 items-center">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])} />
                <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading} title="Send image">
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); broadcastTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={uploading ? "Uploading image..." : "Type a message..."}
                  className="h-11"
                  maxLength={1000}
                  disabled={uploading}
                />
                <Button onClick={send} disabled={!draft.trim() || uploading} className="h-11 bg-gradient-gold text-primary-foreground shadow-glow">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground text-sm">Select a conversation to start chatting.</div>
          )}
        </section>
      </div>
      <MobileNav />
    </div>
  );
}
