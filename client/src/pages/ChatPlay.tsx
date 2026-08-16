import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { findTicTacToeWinner, GameKind, shuffledWord, TRIVIA_QUESTIONS } from "@/lib/game-utils";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CirclePlus, Crown, Gamepad2, LogOut, Menu, Mic, Moon, Paperclip, Play, Send, Sparkles, Sun, Trophy, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Room = { id: string; name: string; description: string; visibility: string; created_by: string; created_at: string };
type Profile = { id: string; display_name: string; avatar_seed: string };
type ChatMessage = { id: string; room_id: string; sender_id: string; kind: string; body: string | null; voice_path: string | null; duration_seconds: number | null; metadata: any; created_at: string; profiles?: Profile; message_reactions?: Array<{ emoji: string; user_id: string }> };
type Game = { id: string; room_id: string; host_id: string; game_type: GameKind; status: string; state: any; winner_id: string | null };

const EMOJIS = ["🔥", "😂", "👏", "💚"];
const spring = { type: "spring", stiffness: 360, damping: 28 } as const;

function initials(name: string) { return name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase(); }
function time(value: string) { return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function identicon(seed: string) { const sum = seed.split("").reduce((value, char) => value + char.charCodeAt(0), 0); return `linear-gradient(135deg, hsl(${sum % 360} 72% 61%), hsl(${(sum * 7) % 360} 70% 48%))`; }

export default function ChatPlay() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { mutateAsync: bootstrapChat, isPending: bootstrapPending } = trpc.chatplay.bootstrap.useMutation();
  const [bridgeReady, setBridgeReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [directory, setDirectory] = useState<Profile[]>([]);
  const [online, setOnline] = useState<Profile[]>([]);
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", description: "", visibility: "public" });
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [opponentId, setOpponentId] = useState("");
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [gameWord, setGameWord] = useState("galaxy");
  const [gameAnswer, setGameAnswer] = useState("");
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const voiceStart = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didBootstrap = useRef(false);

  const activeRoom = rooms.find(room => room.id === roomId) ?? null;
  const pending = bootstrapPending || !bridgeReady;

  useEffect(() => {
    if (!isAuthenticated || !user || bridgeReady || bootstrapPending || didBootstrap.current) return;
    didBootstrap.current = true;
    void (async () => {
      try {
        const session = await bootstrapChat();
        const verified = await supabase.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken });
        if (verified.error) throw verified.error;
        await supabase.realtime.setAuth(session.accessToken);
        setBridgeReady(true);
      } catch {
        didBootstrap.current = false;
        toast.error("Could not prepare your secure chat profile");
      }
    })();
  }, [isAuthenticated, user?.openId, bridgeReady, bootstrapPending, bootstrapChat]);

  const loadRooms = async () => {
    const { data, error } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRooms((data ?? []) as Room[]);
    if (!roomId && data?.[0]) setRoomId(data[0].id);
  };

  useEffect(() => { if (bridgeReady) void loadRooms(); }, [bridgeReady]);

  useEffect(() => {
    if (!bridgeReady) return;
    void (async () => {
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) return;
      const current = await supabase.from("profiles").select("id, display_name, avatar_seed").eq("id", auth.data.user.id).single();
      if (!current.error && current.data) setProfile(current.data as Profile);
    })();
  }, [bridgeReady]);

  const loadRoom = async () => {
    if (!roomId) return;
    const [messageResult, memberResult, sessionResult] = await Promise.all([
      supabase.from("messages").select("*, profiles!messages_sender_id_fkey(id, display_name, avatar_seed), message_reactions(emoji, user_id)").eq("room_id", roomId).order("created_at", { ascending: true }).limit(120),
      supabase.from("room_members").select("profiles!room_members_user_id_fkey(id, display_name, avatar_seed)").eq("room_id", roomId),
      supabase.from("game_sessions").select("*").eq("room_id", roomId).in("status", ["pending", "active"]).order("created_at", { ascending: false }).limit(1),
    ]);
    if (messageResult.error) toast.error(messageResult.error.message); else setMessages((messageResult.data ?? []) as unknown as ChatMessage[]);
    const roomProfiles = (memberResult.data ?? []).map((row: any) => row.profiles).filter(Boolean) as Profile[];
    setMembers(roomProfiles);
    const profileDirectory = await supabase.from("profiles").select("id, display_name, avatar_seed").order("display_name");
    if (!profileDirectory.error) setDirectory((profileDirectory.data ?? []) as Profile[]);
    setActiveGame((sessionResult.data?.[0] ?? null) as Game | null);
    const auth = await supabase.auth.getUser();
    setProfile(roomProfiles.find(member => member.id === auth.data.user?.id) ?? null);
  };

  useEffect(() => {
    if (!bridgeReady || !roomId) return;
    void loadRoom();
    const channel = supabase.channel(`room:${roomId}`, { config: { private: true, presence: { key: profile?.id ?? "guest" } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, () => void loadRoom())
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => void loadRoom())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions", filter: `room_id=eq.${roomId}` }, () => void loadRoom())
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<any>();
        setOnline(Object.values(state).flat().map((entry: any) => entry.profile).filter(Boolean));
      })
      .subscribe(async status => { if (status === "SUBSCRIBED" && profile) await channel.track({ profile }); });
    return () => { void supabase.removeChannel(channel); };
  }, [bridgeReady, roomId, profile?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const createRoom = async () => {
    if (!profile || newRoom.name.trim().length < 2) return toast.error("Give the room a name with at least 2 characters");
    const { data, error } = await supabase.from("rooms").insert({ name: newRoom.name.trim(), description: newRoom.description.trim(), visibility: newRoom.visibility, created_by: profile.id }).select().single();
    if (error) return toast.error(error.message);
    setNewRoomOpen(false); setNewRoom({ name: "", description: "", visibility: "public" }); await loadRooms(); setRoomId(data.id); toast.success("Room created");
  };

  const joinRoom = async (room: Room) => {
    if (!profile) return;
    const { error } = await supabase.from("room_members").insert({ room_id: room.id, user_id: profile.id });
    if (error && !/duplicate/i.test(error.message)) return toast.error(error.message);
    setRoomId(room.id); setSidebarOpen(false);
  };

  const addMember = async (member: Profile) => {
    if (!roomId) return;
    const result = await supabase.from("room_members").insert({ room_id: roomId, user_id: member.id });
    if (result.error) return toast.error(result.error.message);
    toast.success(`${member.display_name} was invited to ${activeRoom?.name}`);
    void loadRoom();
  };

  const removeMember = async (member: Profile) => {
    if (!roomId || member.id === profile?.id) return;
    const result = await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", member.id);
    if (result.error) return toast.error(result.error.message);
    toast.success(`${member.display_name} was removed from ${activeRoom?.name}`);
    void loadRoom();
  };

  const sendText = async () => {
    if (!profile || !roomId || !draft.trim()) return;
    const body = draft.trim(); setDraft("");
    const optimistic: ChatMessage = { id: `optimistic-${Date.now()}`, room_id: roomId, sender_id: profile.id, kind: "text", body, voice_path: null, duration_seconds: null, metadata: {}, created_at: new Date().toISOString(), profiles: profile, message_reactions: [] };
    setMessages(current => [...current, optimistic]);
    const { error } = await supabase.from("messages").insert({ room_id: roomId, sender_id: profile.id, kind: "text", body });
    if (error) { setMessages(current => current.filter(message => message.id !== optimistic.id)); toast.error(error.message); } else void loadRoom();
  };

  const react = async (messageId: string, emoji: string) => {
    if (!profile) return;
    const message = messages.find(item => item.id === messageId);
    const exists = message?.message_reactions?.some(reaction => reaction.emoji === emoji && reaction.user_id === profile.id);
    const query = supabase.from("message_reactions");
    const result = exists ? await query.delete().eq("message_id", messageId).eq("user_id", profile.id).eq("emoji", emoji) : await query.insert({ message_id: messageId, user_id: profile.id, emoji });
    if (result.error) toast.error(result.error.message); else void loadRoom();
  };

  const toggleRecord = async () => {
    if (recording && recorder.current) { recorder.current.stop(); setRecording(false); return; }
    if (!profile || !roomId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = []; const media = new MediaRecorder(stream, { mimeType: "audio/webm" }); recorder.current = media; voiceStart.current = Date.now();
      media.ondataavailable = event => chunks.push(event.data);
      media.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const duration = Math.min(60, Math.max(1, Math.round((Date.now() - voiceStart.current) / 1000)));
        const blob = new Blob(chunks, { type: "audio/webm" });
        const path = `${roomId}/${profile.id}/${crypto.randomUUID()}.webm`;
        const upload = await supabase.storage.from("voice-messages").upload(path, blob, { contentType: "audio/webm" });
        if (upload.error) return toast.error(upload.error.message);
        const message = await supabase.from("messages").insert({ room_id: roomId, sender_id: profile.id, kind: "voice", voice_path: path, duration_seconds: duration });
        if (message.error) toast.error(message.error.message); else void loadRoom();
      };
      media.start(); setRecording(true); toast.message("Recording voice message — tap again to send");
      window.setTimeout(() => { if (media.state === "recording") { media.stop(); setRecording(false); } }, 60000);
    } catch { toast.error("Microphone permission is needed to record a voice message"); }
  };

  const createGame = async (gameType: GameKind) => {
    if (!profile || !roomId) return;
    const baseState = gameType === "tic_tac_toe" ? { board: Array(9).fill(null), turn: profile.id, symbols: { [profile.id]: "X" } } : gameType === "word_scramble" ? { word: gameWord.trim().toUpperCase(), scrambled: shuffledWord(gameWord), winner: null } : { questionIndex: 0, answers: {}, scores: {}, startedAt: Date.now() };
    if (gameType === "word_scramble" && gameWord.trim().length < 3) return toast.error("Enter a word with at least 3 characters");
    const session = await supabase.from("game_sessions").insert({ room_id: roomId, host_id: profile.id, game_type: gameType, status: "active", state: baseState }).select().single();
    if (session.error) return toast.error(session.error.message);
    const players = await supabase.from("game_players").insert({ game_session_id: session.data.id, user_id: profile.id, invite_status: "accepted" });
    if (players.error) return toast.error(players.error.message);
    const invitee = members.find(member => member.id === opponentId);
    if (invitee) await supabase.from("game_players").insert({ game_session_id: session.data.id, user_id: invitee.id, invite_status: "pending" });
    await supabase.from("messages").insert({ room_id: roomId, sender_id: profile.id, kind: "game_invite", body: invitee ? `${profile.display_name} invited ${invitee.display_name} to ${gameType.replaceAll("_", " ")}.` : `${profile.display_name} started ${gameType.replaceAll("_", " ")}. Join the game panel!`, metadata: { game_id: session.data.id, game_type: gameType, invitee_id: invitee?.id ?? null } });
    setActiveGame(session.data as Game); setGameOpen(false); toast.success("Game started — invitees can join from this room");
  };

  const joinGame = async () => {
    if (!profile || !activeGame) return;
    const result = await supabase.from("game_players").upsert({ game_session_id: activeGame.id, user_id: profile.id, invite_status: "accepted" });
    if (result.error) toast.error(result.error.message); else { toast.success("You joined the game"); void loadRoom(); }
  };

  const updateGame = async (state: any, winnerId?: string | null) => {
    if (!activeGame) return;
    const update = await supabase.from("game_sessions").update({ state, ...(winnerId !== undefined ? { winner_id: winnerId, status: "completed" } : {}) }).eq("id", activeGame.id).select().single();
    if (update.error) return toast.error(update.error.message);
    setActiveGame(update.data as Game);
    const channel = supabase.channel(`game:${activeGame.id}`, { config: { private: true } });
    channel.subscribe(async status => { if (status === "SUBSCRIBED") { await channel.send({ type: "broadcast", event: "game_state", payload: { state } }); await supabase.removeChannel(channel); } });
    if (winnerId !== undefined && profile && roomId) await supabase.from("messages").insert({ room_id: roomId, sender_id: profile.id, kind: "game_result", body: winnerId ? `${members.find(member => member.id === winnerId)?.display_name ?? "A player"} won ${activeGame.game_type.replaceAll("_", " ")}!` : `${activeGame.game_type.replaceAll("_", " ")} ended in a draw.`, metadata: { game_id: activeGame.id } });
  };

  const playTic = async (index: number) => {
    if (!profile || !activeGame || activeGame.game_type !== "tic_tac_toe") return;
    const state = activeGame.state ?? {}; const board = [...(state.board ?? Array(9).fill(null))];
    if (board[index] || state.turn !== profile.id) return;
    const players = (await supabase.from("game_players").select("user_id").eq("game_session_id", activeGame.id).eq("invite_status", "accepted")).data ?? [];
    const opponent = players.find(player => player.user_id !== profile.id)?.user_id;
    if (!opponent) return toast.message("Waiting for an opponent to join");
    const symbol = state.symbols?.[profile.id] ?? "O"; board[index] = symbol; const winner = findTicTacToeWinner(board);
    await updateGame({ ...state, board, turn: winner ? null : opponent, symbols: { ...(state.symbols ?? {}), [profile.id]: symbol, [opponent]: state.symbols?.[opponent] ?? (symbol === "X" ? "O" : "X") } }, winner === "draw" ? null : winner ? profile.id : undefined);
  };

  const answerGame = async () => {
    if (!profile || !activeGame || !gameAnswer.trim()) return;
    const answer = gameAnswer.trim().toUpperCase(); setGameAnswer(""); const state = activeGame.state ?? {};
    if (activeGame.game_type === "word_scramble" && answer === state.word) await updateGame({ ...state, winner: profile.id }, profile.id);
    if (activeGame.game_type === "trivia") {
      const question = TRIVIA_QUESTIONS[state.questionIndex ?? 0]; const correct = question.options[question.answer].toUpperCase();
      if (state.answers?.[profile.id]) return toast.message("Your answer is locked in for this round.");
      const isCorrect = answer === correct || answer === String(question.answer + 1);
      await updateGame({ ...state, answers: { ...(state.answers ?? {}), [profile.id]: answer }, scores: { ...(state.scores ?? {}), [profile.id]: ((state.scores ?? {})[profile.id] ?? 0) + (isCorrect ? 1 : 0) } });
      toast.message(isCorrect ? "Correct — your point is on the board." : "Answer submitted. Scores update live.");
    }
  };

  const finishTrivia = async () => {
    if (!profile || !activeGame || activeGame.game_type !== "trivia" || activeGame.host_id !== profile.id) return;
    const scores = activeGame.state?.scores ?? {};
    const winnerId = Object.entries(scores).sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] as string | undefined;
    await updateGame({ ...activeGame.state, finishedAt: Date.now() }, winnerId ?? null);
  };

  const reactionsFor = (message: ChatMessage, emoji: string) => message.message_reactions?.filter(reaction => reaction.emoji === emoji).length ?? 0;
  const signedAudio = (path: string) => supabase.storage.from("voice-messages").createSignedUrl(path, 3600).then(result => result.data?.signedUrl ?? "");

  if (loading || (isAuthenticated && pending)) return <div className="grid min-h-screen place-items-center bg-[#0d1117] text-slate-300"><Sparkles className="size-7 animate-pulse text-teal-300" /></div>;
  if (!isAuthenticated) return <Landing onLogin={startLogin} />;

  return <div className="min-h-screen bg-[#0d1117] text-slate-100 selection:bg-teal-300/25">
    <div className="mx-auto flex min-h-screen max-w-[1700px] overflow-hidden lg:p-4">
      <aside aria-label="Room navigation" className={`fixed inset-y-0 left-0 z-40 flex w-[295px] flex-col border-r border-white/5 bg-[#101720] p-4 shadow-2xl transition-transform lg:static lg:translate-x-0 lg:rounded-[28px] ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-7 flex items-center justify-between px-2"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-teal-300 text-[#0b2427]"><Gamepad2 className="size-5" /></div><div><p className="font-semibold tracking-tight">ChatPlay</p><p className="text-xs text-teal-200/60">where rooms come alive</p></div></div><button aria-label="Close room navigation" onClick={() => setSidebarOpen(false)} className="lg:hidden"><X className="size-5" /></button></div>
        <Button onClick={() => setNewRoomOpen(true)} className="mb-5 h-11 rounded-xl bg-teal-300 font-semibold text-[#082426] hover:bg-teal-200"><CirclePlus className="mr-2 size-4" />Create a room</Button>
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Your rooms</p>
        <ScrollArea className="flex-1"><div className="space-y-1 pr-2">{rooms.map(room => <button key={room.id} onClick={() => { void joinRoom(room); }} className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${room.id === roomId ? "bg-teal-300/10 text-teal-100" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}><div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-bold">{initials(room.name)}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-sm font-medium">{room.name}</p>{room.visibility === "private" && <span className="text-[10px] text-slate-500">PRIVATE</span>}</div><p className="truncate text-xs text-slate-500">{room.description || "Tap to join the conversation"}</p></div></button>)}</div></ScrollArea>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3"><Avatar className="size-9"><AvatarFallback style={{ background: identicon(profile?.avatar_seed ?? user?.openId ?? "guest") }} className="text-xs font-bold text-white">{initials(profile?.display_name ?? user?.name ?? "U")}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{profile?.display_name ?? user?.name}</p><p className="text-xs text-emerald-300"><span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-300" />online</p></div><button aria-label="Log out" onClick={() => void logout()} className="text-slate-500 hover:text-slate-200"><LogOut className="size-4" /></button></div>
      </aside>
      {sidebarOpen && <button aria-label="Close room navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/55 lg:hidden" />}
      <main className="flex min-w-0 flex-1 flex-col lg:ml-4 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/5 lg:bg-[#121922]">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/5 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><button aria-label="Open room navigation" onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu className="size-5" /></button><div className="grid size-10 place-items-center rounded-2xl bg-slate-800 text-sm font-bold">{activeRoom ? initials(activeRoom.name) : "CP"}</div><div className="min-w-0"><h1 className="truncate font-semibold">{activeRoom?.name ?? "Choose a room"}</h1><p className="truncate text-xs text-slate-500">{online.length || members.length} people around</p></div></div><div className="flex items-center gap-2"><button aria-label="Manage room members" onClick={() => setMembersOpen(true)} disabled={!activeRoom} className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-teal-200"><Users className="size-4" /></button><button aria-label="Toggle color theme" onClick={toggleTheme} className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-teal-200">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</button><Button onClick={() => setGameOpen(true)} disabled={!activeRoom} className="rounded-xl bg-teal-300 px-3 text-[#082426] hover:bg-teal-200"><Gamepad2 className="mr-2 size-4" /><span className="hidden sm:inline">Play</span></Button></div></header>
        {activeRoom ? <div className="relative flex min-h-0 flex-1 flex-col"><ScrollArea className="flex-1"><div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-7">{messages.map(message => <MessageBubble key={message.id} message={message} mine={message.sender_id === profile?.id} onReact={react} reactionCount={reactionsFor} onJoinGame={joinGame} audioUrl={message.voice_path ? signedAudio(message.voice_path) : undefined} />)}<div ref={bottomRef} /></div></ScrollArea>
          {activeGame && <GamePanel game={activeGame} profile={profile} members={members} answer={gameAnswer} setAnswer={setGameAnswer} onJoin={joinGame} onTic={playTic} onAnswer={answerGame} onFinishTrivia={finishTrivia} />}
          <div className="border-t border-white/5 bg-[#101720]/85 p-3 backdrop-blur sm:p-4"><div className="mx-auto flex max-w-4xl items-end gap-2"><button aria-label="Attachment options" className="hidden size-10 place-items-center rounded-xl text-slate-500 hover:bg-white/5 sm:grid"><Paperclip className="size-4" /></button><Textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendText(); } }} placeholder={`Message #${activeRoom.name}`} className="min-h-11 max-h-28 resize-none rounded-2xl border-white/5 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-slate-600 focus-visible:ring-teal-300/50" rows={1} /><Button aria-label={recording ? "Finish and send voice message" : "Record voice message"} onClick={toggleRecord} className={`grid size-11 shrink-0 place-items-center rounded-2xl ${recording ? "bg-rose-400 text-white hover:bg-rose-300" : "bg-white/[0.05] text-slate-400 hover:bg-white/10"}`}><Mic className={`size-4 ${recording ? "animate-pulse" : ""}`} /></Button><Button aria-label="Send message" onClick={() => void sendText()} className="grid size-11 shrink-0 place-items-center rounded-2xl bg-teal-300 text-[#082426] hover:bg-teal-200"><Send className="size-4" /></Button></div></div>
        </div> : <EmptyRooms onCreate={() => setNewRoomOpen(true)} />}
      </main>
    </div>
    <AnimatePresence>{newRoomOpen && <Modal title="Make a new room" onClose={() => setNewRoomOpen(false)}><div className="space-y-4"><Input value={newRoom.name} onChange={event => setNewRoom({ ...newRoom, name: event.target.value })} placeholder="Room name" className="border-white/10 bg-white/5" /><Textarea value={newRoom.description} onChange={event => setNewRoom({ ...newRoom, description: event.target.value })} placeholder="What will people talk and play about?" className="border-white/10 bg-white/5" /><div className="grid grid-cols-2 gap-2">{["public", "private"].map(visibility => <button key={visibility} onClick={() => setNewRoom({ ...newRoom, visibility })} className={`rounded-xl border p-3 text-left capitalize ${newRoom.visibility === visibility ? "border-teal-300/60 bg-teal-300/10 text-teal-100" : "border-white/10 text-slate-400"}`}><p className="text-sm font-semibold">{visibility}</p><p className="mt-1 text-xs opacity-70">{visibility === "public" ? "Anyone can discover and join" : "Only members can see it"}</p></button>)}</div><Button onClick={() => void createRoom()} className="w-full bg-teal-300 text-[#082426] hover:bg-teal-200">Create room</Button></div></Modal>}</AnimatePresence>
    <AnimatePresence>{gameOpen && <Modal title="Start a game" onClose={() => setGameOpen(false)}><div className="space-y-3"><select aria-label="Choose a room member to invite" value={opponentId} onChange={event => setOpponentId(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100"><option value="">Open invitation to the room</option>{members.filter(member => member.id !== profile?.id).map(member => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select><GameChoice icon="⊹" title="Tic-Tac-Toe" text="Challenge a selected room member turn by turn." onClick={() => void createGame("tic_tac_toe")} /><div className="rounded-2xl border border-white/10 p-4"><div className="flex items-start justify-between"><div><p className="font-semibold">Word Scramble</p><p className="mt-1 text-xs text-slate-400">Choose the word. Everyone races to solve it.</p></div><span className="text-xl">⌘</span></div><Input value={gameWord} onChange={event => setGameWord(event.target.value)} className="mt-3 border-white/10 bg-white/5" placeholder="Secret word" /><Button onClick={() => void createGame("word_scramble")} className="mt-3 w-full bg-white/10 hover:bg-white/15">Start scramble</Button></div><GameChoice icon="?" title="Trivia Sprint" text="Launch a multiple-choice question with a live leaderboard." onClick={() => void createGame("trivia")} /></div></Modal>}</AnimatePresence>
    <AnimatePresence>{membersOpen && <Modal title={`${activeRoom?.name ?? "Room"} members`} onClose={() => setMembersOpen(false)}><div className="space-y-3"><p className="text-xs text-slate-400">{activeRoom?.visibility === "private" ? "Private rooms can only be joined by members invited here." : "Anyone can join this public room."}</p><div className="max-h-44 space-y-2 overflow-auto">{members.map(member => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-white/[0.045] p-2.5"><Avatar className="size-8"><AvatarFallback style={{ background: identicon(member.avatar_seed) }} className="text-[10px] text-white">{initials(member.display_name)}</AvatarFallback></Avatar><span className="text-sm">{member.display_name}</span>{member.id === activeRoom?.created_by && <Crown className="ml-auto size-3.5 text-amber-300" />}{activeRoom?.visibility === "private" && profile?.id === activeRoom.created_by && member.id !== profile.id && <button aria-label={`Remove ${member.display_name}`} onClick={() => void removeMember(member)} className="ml-auto text-xs text-rose-300 hover:text-rose-200">Remove</button>}</div>)}</div>{activeRoom?.visibility === "private" && profile?.id === activeRoom.created_by && <><p className="pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Invite to this room</p><div className="max-h-44 space-y-2 overflow-auto">{directory.filter(candidate => !members.some(member => member.id === candidate.id)).map(candidate => <button key={candidate.id} onClick={() => void addMember(candidate)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-white/[0.05]"><Avatar className="size-8"><AvatarFallback style={{ background: identicon(candidate.avatar_seed) }} className="text-[10px] text-white">{initials(candidate.display_name)}</AvatarFallback></Avatar><span className="text-sm">{candidate.display_name}</span><CirclePlus className="ml-auto size-4 text-teal-200" /></button>)}</div></>}</div></Modal>}</AnimatePresence>
  </div>;
}

function MessageBubble({ message, mine, onReact, reactionCount, onJoinGame, audioUrl }: { message: ChatMessage; mine: boolean; onReact: (id: string, emoji: string) => void; reactionCount: (message: ChatMessage, emoji: string) => number; onJoinGame: () => void; audioUrl?: Promise<string> }) {
  const [url, setUrl] = useState(""); useEffect(() => { void audioUrl?.then(setUrl); }, [audioUrl]);
  return <motion.div initial={{ opacity: 0, y: 10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className={`group flex gap-2 ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[84%] ${mine ? "order-2" : ""}`}><div className={`rounded-2xl px-4 py-3 ${mine ? "rounded-br-md bg-teal-300 text-[#092528]" : "rounded-bl-md bg-white/[0.06] text-slate-100"}`}><div className="mb-1 flex items-center gap-2"><span className={`text-xs font-semibold ${mine ? "text-[#145c5c]" : "text-teal-200"}`}>{mine ? "You" : message.profiles?.display_name ?? "Member"}</span>{message.kind.includes("game") && <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">game</span>}</div>{message.kind === "game_invite" ? <div className="rounded-xl border border-current/15 bg-black/10 p-3"><p className="text-sm font-semibold">{message.body}</p><p className="mt-1 text-xs opacity-70">Ready to play? Join the live game in this room.</p><Button onClick={onJoinGame} className="mt-3 h-8 rounded-lg bg-[#082426] px-3 text-xs text-teal-100 hover:bg-[#0e3a3d]">Join game</Button></div> : message.kind === "voice" && url ? <audio controls src={url} className="h-8 max-w-full" /> : <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>}<p className={`mt-1 text-[10px] ${mine ? "text-[#15595a]" : "text-slate-500"}`}>{time(message.created_at)} {mine && <Check className="ml-1 inline size-3" />}</p></div><div className="mt-1 flex flex-wrap gap-1 opacity-0 transition group-hover:opacity-100">{EMOJIS.map(emoji => <button onClick={() => onReact(message.id, emoji)} key={emoji} className="rounded-lg bg-white/[0.05] px-1.5 py-0.5 text-xs hover:bg-white/10">{emoji}{reactionCount(message, emoji) ? <span className="ml-1 text-[10px] text-slate-400">{reactionCount(message, emoji)}</span> : null}</button>)}</div></div></motion.div>;
}

function GamePanel({ game, profile, members, answer, setAnswer, onJoin, onTic, onAnswer, onFinishTrivia }: any) {
  const state = game.state ?? {}; const board = state.board ?? Array(9).fill(null); const joined = game.status === "active";
  return <motion.section initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-3 mb-3 rounded-3xl border border-teal-300/20 bg-gradient-to-br from-teal-300/10 to-cyan-300/5 p-4 shadow-2xl sm:mx-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-teal-100"><Gamepad2 className="size-4" />{game.game_type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-400">{game.status === "completed" ? "Game complete" : "Live in this room"}</p></div>{game.status !== "completed" && <Button onClick={onJoin} className="rounded-xl bg-teal-300 text-[#082426] hover:bg-teal-200"><Users className="mr-2 size-4" />Join</Button>}</div>{game.game_type === "tic_tac_toe" && <div className="mt-4 grid max-w-[232px] grid-cols-3 gap-1 rounded-2xl bg-[#0c151c] p-2">{board.map((cell: string | null, index: number) => <button key={index} onClick={() => void onTic(index)} className="grid aspect-square place-items-center rounded-xl bg-white/[0.06] text-xl font-bold text-teal-200 transition hover:bg-white/10">{cell}</button>)}</div>}{game.game_type === "word_scramble" && <div className="mt-4"><p className="font-mono text-2xl font-bold tracking-[.22em] text-teal-200">{state.scrambled}</p><div className="mt-3 flex gap-2"><Input value={answer} onChange={(event: any) => setAnswer(event.target.value)} onKeyDown={(event: any) => event.key === "Enter" && void onAnswer()} placeholder="Unscramble it" className="border-white/10 bg-[#0c151c]" /><Button onClick={() => void onAnswer()} className="bg-white/10 hover:bg-white/15">Guess</Button></div></div>}{game.game_type === "trivia" && <div className="mt-4"><p className="font-medium">{TRIVIA_QUESTIONS[state.questionIndex ?? 0].prompt}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{TRIVIA_QUESTIONS[state.questionIndex ?? 0].options.map((option, index) => <button key={option} onClick={() => { setAnswer(String(index + 1)); window.setTimeout(() => void onAnswer(), 0); }} className="rounded-xl bg-white/[0.06] px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-teal-300/15">{String.fromCharCode(65 + index)}. {option}</button>)}</div><div className="mt-4 rounded-2xl bg-[#0c151c]/80 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Live leaderboard</p><div className="mt-2 space-y-1.5">{Object.entries(state.scores ?? {}).sort(([, a]: any, [, b]: any) => b - a).map(([id, score]: any, index) => <div key={id} className="flex items-center justify-between text-sm"><span>{index + 1}. {members.find((member: any) => member.id === id)?.display_name ?? "Player"}</span><span className="font-semibold text-teal-200">{score}</span></div>)}</div></div>{profile?.id === game.host_id && game.status !== "completed" && <Button onClick={() => void onFinishTrivia()} className="mt-3 bg-white/10 hover:bg-white/15">Finish round & post result</Button>}</div>}</motion.section>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }} transition={spring} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141d27] p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">{title}</h2><button aria-label="Close dialog" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5"><X className="size-4" /></button></div>{children}</motion.div></motion.div>; }
function GameChoice({ icon, title, text, onClick }: { icon: string; title: string; text: string; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl border border-white/10 p-4 text-left transition hover:border-teal-300/40 hover:bg-teal-300/5"><div className="grid size-10 place-items-center rounded-xl bg-teal-300/10 font-bold text-teal-200">{icon}</div><div><p className="font-semibold">{title}</p><p className="mt-1 text-xs text-slate-400">{text}</p></div></button>; }
function EmptyRooms({ onCreate }: { onCreate: () => void }) { return <div className="grid flex-1 place-items-center p-8 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-teal-300/10 text-teal-200"><Users className="size-7" /></div><h2 className="mt-5 text-xl font-semibold">Start the first room</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">Create a public hangout or a private space for your closest players. Messaging, voice, and games will live together.</p><Button onClick={onCreate} className="mt-5 rounded-xl bg-teal-300 text-[#082426] hover:bg-teal-200">Create a room</Button></div></div>; }
function Landing({ onLogin }: { onLogin: () => void }) { return <main className="min-h-screen overflow-hidden bg-[#0d1117] text-slate-100"><div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-8"><nav className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-teal-300 text-[#082426]"><Gamepad2 className="size-5" /></div><span className="font-semibold">ChatPlay</span></div><Button onClick={onLogin} className="rounded-xl bg-white/10 hover:bg-white/15">Sign in</Button></nav><section className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr]"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-teal-200">Real-time rooms, real play</p><h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-[.98] tracking-tight sm:text-6xl">Your group chat just got a game night.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-400">A social space for instant rooms, voice notes, reactions, and multiplayer games that finish right where the conversation started.</p><Button onClick={onLogin} className="mt-8 h-12 rounded-2xl bg-teal-300 px-6 font-semibold text-[#082426] hover:bg-teal-200">Enter ChatPlay <Play className="ml-2 size-4" /></Button></div><div className="relative mx-auto w-full max-w-md rounded-[32px] border border-white/10 bg-[#141d27] p-5 shadow-[0_28px_100px_rgba(0,0,0,.42)]"><div className="flex items-center gap-3 border-b border-white/5 pb-4"><div className="size-10 rounded-2xl bg-gradient-to-br from-teal-300 to-cyan-500" /><div><p className="font-semibold">Sunday Squad</p><p className="text-xs text-emerald-300">6 players online</p></div></div><div className="space-y-3 py-6"><div className="w-3/4 rounded-2xl rounded-bl-md bg-white/[.07] p-3 text-sm text-slate-300">Trivia Sprint in 3… 2… 1…</div><div className="ml-auto w-2/3 rounded-2xl rounded-br-md bg-teal-300 p-3 text-sm text-[#082426]">I’m ready. Let’s go!</div><div className="rounded-2xl border border-teal-300/25 bg-teal-300/10 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-teal-100"><Trophy className="size-4" />Live leaderboard</p><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full w-3/4 rounded-full bg-teal-300" /></div></div></div><p className="text-center text-xs text-slate-500">Fast chat. Friendly competition. One room.</p></div></section></div></main>; }
