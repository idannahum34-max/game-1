import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { supabase, hasSupabase } from "@/lib/supabase";
import {
  PACKS, CHAOS_EVENTS, ROASTS, shuffle, blankPlayer, allAnswers, allQuestions, titleForPlayer, uid,
  type Player, type Submission, type ChaosEvent,
} from "@/lib/gameData";

type Phase = "lobby" | "choose" | "vote" | "reveal" | "end";
type RoomState = {
  phase: Phase; round: number; judgeIndex: number; currentQuestion: string;
  submissions: Submission[]; winner: Submission | null; selectedPacks: string[];
  event: ChaosEvent | null; deck: string[]; questionDeck: string[]; scoreLimit: number; version: number;
};

const DEFAULT_PACKS = ["classic", "israeli", "adult18", "dating", "black"];

function getClientId() {
  const key = "mevich_client_id";
  let id = localStorage.getItem(key);
  if (!id) { id = uid(); localStorage.setItem(key, id); }
  return id;
}

function emptyState(packs = DEFAULT_PACKS): RoomState {
  const safePacks = packs.filter((p) => (PACKS as any)[p]);
  const selected = safePacks.length ? safePacks : DEFAULT_PACKS;
  return {
    phase: "lobby", round: 0, judgeIndex: 0, currentQuestion: "", submissions: [], winner: null,
    selectedPacks: selected, event: null, deck: shuffle(allAnswers(selected)),
    questionDeck: shuffle(allQuestions(selected)), scoreLimit: 7, version: Date.now(),
  };
}

function rowsToPlayers(rows: any[]): Player[] {
  return (rows || []).map((r: any) => ({
    id: r.id, name: r.name, isHost: Boolean(r.is_host),
    hand: Array.isArray(r.hand) ? r.hand : [], score: typeof r.score === "number" ? r.score : 0,
    wins: 0, chaos: 0, votes: 0, reputation: [],
  }));
}

export default function Room() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const roomId = (window.location.pathname.split("/room/")[1]?.split("?")[0] || "ROOM").toUpperCase();
  const isHost = params.get("host") === "1";
  const myIdRef = useRef(isHost ? `host_${roomId}` : getClientId());
  const myId = myIdRef.current;
  const initialName = params.get("name") || (isHost ? "מארח" : "");
  const packsParam = params.get("packs") || DEFAULT_PACKS.join(",");
  const initialPacks = packsParam.split(",").filter((p) => (PACKS as any)[p]);

  const [roomState, setRoomState] = useState<RoomState>(() => emptyState(initialPacks));
  const [players, setPlayers] = useState<Player[]>([]);
  const [myName, setMyName] = useState(initialName);
  const [joined, setJoined] = useState(isHost);
  const [addName, setAddName] = useState("");
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<number>(Date.now());

  const me = players.find((p) => p.id === myId);
  const judge = players[roomState.judgeIndex];
  const isJudge = judge?.id === myId;
  const hasSubmitted = roomState.submissions.some((s) => s.playerId === myId);
  const canControl = isHost || isJudge;
  const inviteUrl = `${window.location.origin}/room/${roomId}`;
  const scoreSorted = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const roundRoast = ROASTS[Math.abs(roomState.round || 0) % ROASTS.length];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function saveRoom(next: RoomState) {
    const nextWithVersion = { ...next, version: Date.now() };
    setRoomState(nextWithVersion);
    if (!hasSupabase || !supabase) { localStorage.setItem(`mevich_room_state_${roomId}`, JSON.stringify(nextWithVersion)); return; }
    const { error } = await supabase.from("rooms").upsert({
      id: roomId, name: "מביך רצח", host_id: `host_${roomId}`, phase: nextWithVersion.phase,
      game_state: nextWithVersion, selected_packs: nextWithVersion.selectedPacks, secrets: [],
      updated_at: new Date().toISOString(),
    });
    if (error) showToast(`שגיאת חדר: ${error.message}`);
  }

  async function savePlayer(p: Player) {
    setPlayers((prev) => prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]);
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase.from("players").upsert({
      id: p.id, room_id: roomId, name: p.name, score: p.score, hand: p.hand, is_host: p.isHost, connected: true,
    });
    if (error) showToast(`שגיאת שחקן: ${error.message}`);
  }

  async function savePlayers(nextPlayers: Player[]) {
    setPlayers(nextPlayers);
    if (!hasSupabase || !supabase) { localStorage.setItem(`mevich_room_players_${roomId}`, JSON.stringify(nextPlayers)); return; }
    await Promise.all(nextPlayers.map((p) => supabase.from("players").upsert({
      id: p.id, room_id: roomId, name: p.name, score: p.score, hand: p.hand, is_host: p.isHost, connected: true,
    })));
  }

  async function pullRemote() {
    if (!hasSupabase || !supabase) {
      const savedState = localStorage.getItem(`mevich_room_state_${roomId}`);
      const savedPlayers = localStorage.getItem(`mevich_room_players_${roomId}`);
      if (savedState) setRoomState(JSON.parse(savedState));
      if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
      setLastSync(Date.now()); setLoading(false); return;
    }
    const [{ data: room, error: roomError }, { data: playerRows, error: playersError }] = await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).maybeSingle(),
      supabase.from("players").select("*").eq("room_id", roomId).order("created_at"),
    ]);
    if (roomError) showToast(`שגיאת rooms: ${roomError.message}`);
    if (playersError) showToast(`שגיאת players: ${playersError.message}`);
    if (room?.game_state && Object.keys(room.game_state).length) setRoomState(room.game_state as RoomState);
    setPlayers(rowsToPlayers(playerRows || []));
    setLastSync(Date.now()); setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (isHost) {
        const host = blankPlayer(myId, myName || "מארח", true);
        if (hasSupabase && supabase) {
          const { data: existing } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
          if (!existing) {
            const initState = emptyState(initialPacks);
            await supabase.from("rooms").insert({
              id: roomId, name: "מביך רצח", host_id: myId, phase: "lobby",
              game_state: initState, selected_packs: initState.selectedPacks, secrets: [],
            });
          }
          await supabase.from("players").upsert({
            id: myId, room_id: roomId, name: host.name, score: 0, hand: [], is_host: true, connected: true,
          });
        } else {
          if (!localStorage.getItem(`mevich_room_state_${roomId}`)) localStorage.setItem(`mevich_room_state_${roomId}`, JSON.stringify(emptyState(initialPacks)));
          if (!localStorage.getItem(`mevich_room_players_${roomId}`)) localStorage.setItem(`mevich_room_players_${roomId}`, JSON.stringify([host]));
        }
        setJoined(true);
      }
      if (mounted) await pullRemote();
    }
    init();

    const poll = setInterval(() => pullRemote(), 1000);
    if (!hasSupabase || !supabase) return () => { mounted = false; clearInterval(poll); };

    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => pullRemote())
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, () => pullRemote())
      .subscribe();

    return () => { mounted = false; clearInterval(poll); supabase.removeChannel(channel); };
  }, [roomId]);

  async function joinRoom() {
    const name = myName.trim();
    if (!name) return showToast("תכתוב שם");
    const p = blankPlayer(myId, name, false);
    setJoined(true); await savePlayer(p); await pullRemote();
  }

  async function addPlayer() {
    const name = addName.trim();
    if (!name) return;
    const p = blankPlayer(uid(), name, false);
    setAddName(""); await savePlayer(p); showToast(`${name} נוסף`);
  }

  
function drawCards(currentPlayers: Player[], currentState: RoomState) {
    let deck = [...new Set(currentState.deck)];
    const nextPlayers = currentPlayers.map((p) => ({
      ...p,
      hand: [...new Set(p.hand)],
    }));

    for (const p of nextPlayers) {
      while (p.hand.length < 7) {
        if (deck.length === 0) {
          deck = [...new Set(shuffle(allAnswers(currentState.selectedPacks)))];
        }

        const nextCard = deck.shift();
        if (!nextCard) break;

        if (!p.hand.includes(nextCard)) {
          p.hand.push(nextCard);
        }
      }
    }

    return { deck, nextPlayers };
  }


  async function startGame() {
    if (!isHost) return;
    if (players.length < 2) return showToast("צריך לפחות 2 שחקנים");
    let qDeck = roomState.questionDeck.length ? [...roomState.questionDeck] : shuffle(allQuestions(roomState.selectedPacks));
    const question = qDeck.shift() || "מה הדבר הכי מביך שקרה פה?";
    const base: RoomState = {
      ...roomState, phase: "choose", round: 1, judgeIndex: 0, currentQuestion: question,
      questionDeck: qDeck, submissions: [], winner: null,
      event: Math.random() < 0.3 ? CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)] : null,
    };
    const { deck, nextPlayers } = drawCards(players.map((p) => ({ ...p, score: 0, hand: [] })), base);
    await savePlayers(nextPlayers); await saveRoom({ ...base, deck });
  }

  async function submitCard() {
    if (!me || isJudge || hasSubmitted || selectedCard === null) return;
    const sub: Submission = { id: uid(), playerId: me.id, playerName: me.name, card: me.hand[selectedCard], votes: 0 };
    const updatedMe = { ...me, hand: me.hand.filter((_, i) => i !== selectedCard) };
    let newPlayers = players.map((p) => (p.id === me.id ? updatedMe : p));
    const afterDeal = drawCards(newPlayers, roomState);
    newPlayers = afterDeal.nextPlayers;
    const submissions = [...roomState.submissions, sub];
    const nonJudgeCount = players.filter((p) => p.id !== judge?.id).length;
    const phase: Phase = submissions.length >= nonJudgeCount ? "vote" : "choose";
    setSelectedCard(null);
    await savePlayers(newPlayers);
    await saveRoom({ ...roomState, submissions, phase, deck: afterDeal.deck });
  }

  async function pickWinner(sub: Submission) {
    if (!isJudge || roomState.phase !== "vote") return;
    const newPlayers = players.map((p) => p.id !== sub.playerId ? p : { ...p, score: p.score + 1, wins: p.wins + 1 });
    const winnerPlayer = newPlayers.find((p) => p.score >= roomState.scoreLimit);
    await savePlayers(newPlayers);
    await saveRoom({ ...roomState, winner: sub, phase: winnerPlayer ? "end" : "reveal" });
  }

  async function nextRound() {
    if (!canControl) return;
    let qDeck = roomState.questionDeck.length ? [...roomState.questionDeck] : shuffle(allQuestions(roomState.selectedPacks));
    const question = qDeck.shift() || "מה הדבר הכי מביך?";
    const nextState: RoomState = {
      ...roomState, phase: "choose", round: roomState.round + 1,
      judgeIndex: (roomState.judgeIndex + 1) % players.length,
      currentQuestion: question, questionDeck: qDeck, submissions: [], winner: null,
      event: Math.random() < 0.3 ? CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)] : null,
    };
    const { deck, nextPlayers } = drawCards(players, nextState);
    await savePlayers(nextPlayers); await saveRoom({ ...nextState, deck });
  }

  async function resetGame() {
    if (!isHost) return;
    const host = players.find((p) => p.isHost) || blankPlayer(myId, myName || "מארח", true);
    const nextState = emptyState(roomState.selectedPacks);
    await savePlayers([{ ...host, score: 0, hand: [], wins: 0 }]); await saveRoom(nextState);
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopyFeedback(true); showToast("קישור הועתק"); setTimeout(() => setCopyFeedback(false), 1600);
    });
  }

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center" dir="rtl"><div className="font-black text-xl">טוען חדר...</div></div>;

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Heebo', sans-serif", direction: "rtl" }}>
      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full font-black z-50">{toast}</div>}
      <nav className="border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50" style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors font-black text-sm">← חזרה</button>
        <div className="flex items-center gap-3"><div className="font-black text-sm">מביך <span style={{ color: "#e53e3e" }}>רצח</span></div><div className="border border-white/20 rounded px-3 py-1 font-black text-lg tracking-widest">{roomId}</div></div>
        <button onClick={copyCode} className="text-xs font-black px-3 py-1.5 border border-white/20 rounded transition-all" style={{ background: copyFeedback ? "white" : "transparent", color: copyFeedback ? "black" : "rgba(255,255,255,0.6)" }}>{copyFeedback ? "✓ הועתק" : "שתף"}</button>
      </nav>

      {roomState.phase === "lobby" && (
        <main className="max-w-3xl mx-auto px-4 py-10">
          <div className="text-center mb-8"><h1 className="font-black text-5xl mb-3">לובי</h1><p className="text-white/40 font-bold">"ממתינים לשחקנים..."</p></div>
          <div className="border-2 border-white/20 rounded-2xl p-8 text-center mb-8" style={{ background: "#0d0d0d" }}><div className="text-xs font-black text-white/40 mb-3 tracking-widest">קוד חדר</div><div className="font-black text-6xl tracking-widest mb-4">{roomId}</div><button onClick={copyCode} className="btn-secondary text-sm">{copyFeedback ? "✓ הועתק!" : "📋 העתק קישור"}</button></div>
          {!joined && !isHost && <div className="mb-6 border border-white/10 rounded-xl p-4" style={{ background: "#0d0d0d" }}><h3 className="font-black text-sm text-white/60 mb-3">הצטרפות לחדר</h3><div className="flex gap-2"><input value={myName} onChange={(e) => setMyName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinRoom()} placeholder="שם שחקן" className="game-input flex-1" maxLength={20} /><button onClick={joinRoom} className="btn-primary">היכנס</button></div></div>}
          <div className="mb-6"><div className="flex items-center justify-between mb-3"><h2 className="font-black text-base">שחקנים ({players.length})</h2><span className="text-xs text-white/30 font-bold">מינימום 2</span></div><div className="space-y-2">{players.map((p) => <div key={p.id} className="player-row"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-sm">{p.name[0]}</div><span className="font-bold text-sm">{p.name}</span>{p.isHost && <span className="text-xs font-black text-white/30 border border-white/20 rounded px-1.5">מארח</span>}{p.id === myId && <span className="text-xs text-white/30">← אתה</span>}</div><div className="text-xs text-white/30 font-bold">{p.hand.length} קלפים</div></div>)}</div></div>
          {isHost && <div className="mb-6 border border-white/10 rounded-xl p-4" style={{ background: "#0d0d0d" }}><h3 className="font-black text-sm text-white/60 mb-3">הוסף שחקן ידנית</h3><div className="flex gap-2"><input value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="שם שחקן" className="game-input flex-1" maxLength={20} /><button onClick={addPlayer} className="btn-primary">הוסף</button></div></div>}
          <div className="mb-6 border border-white/10 rounded-xl p-4" style={{ background: "#0d0d0d" }}>
            <h3 className="font-black text-sm text-white/70 mb-3">חוקי המשחק</h3>
            <ul className="text-white/45 text-sm leading-7 font-bold list-disc pr-5">
              <li>בכל סיבוב יש שופט אחד.</li>
              <li>כולם חוץ מהשופט בוחרים קלף תשובה.</li>
              <li>השופט בוחר את התשובה הכי מצחיקה, מביכה או טראשית.</li>
              <li>המנצח מקבל נקודה. ראשון ל־7 מנצח.</li>
              <li>18+ והומור שחור הן חבילות אופציונליות.</li>
            </ul>
          </div>
          <div className="mb-8"><h3 className="font-black text-sm text-white/40 mb-3">חבילות נבחרות</h3><div className="flex flex-wrap gap-2">{roomState.selectedPacks.map((id) => <div key={id} className="flex items-center gap-1.5 border border-white/15 rounded-full px-3 py-1 text-xs font-bold text-white/60"><span>{(PACKS as any)[id]?.emoji}</span><span>{(PACKS as any)[id]?.name}</span></div>)}</div></div>
          {isHost ? <button onClick={startGame} disabled={players.length < 2} className="btn-primary w-full justify-center text-lg py-4">🎮 התחל משחק ({players.length} שחקנים)</button> : <div className="text-center text-white/40 font-bold">ממתין למארח להתחיל...</div>}
        </main>
      )}

      {(roomState.phase === "choose" || roomState.phase === "vote" || roomState.phase === "reveal") && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-1">{players.map((p, i) => <div key={p.id} className="flex-shrink-0 flex items-center gap-2 border rounded-full px-3 py-1.5" style={{ borderColor: i === roomState.judgeIndex ? "white" : "rgba(255,255,255,0.15)", background: i === roomState.judgeIndex ? "rgba(255,255,255,0.08)" : "transparent" }}>{i === roomState.judgeIndex && <span className="text-xs">⚖️</span>}<span className="font-bold text-xs text-white/80">{p.name}</span><span className="score-badge">{p.score}</span>{p.id === myId && <span className="text-xs text-white/30">אתה</span>}</div>)}</div>
          {roomState.event && <div className="chaos-banner mb-6 flex items-center gap-3"><span className="text-2xl">{roomState.event.emoji}</span><div><div className="font-black text-sm text-white">{roomState.event.title}</div><div className="text-xs font-bold text-white/50">{roomState.event.description}</div></div></div>}
          <div className="mb-8"><div className="text-xs font-black text-white/30 mb-3 tracking-widest">סיבוב {roomState.round} · שופט: {judge?.name}</div><div className="game-card-black" style={{ maxWidth: 520, minHeight: 180 }}><div className="text-xs font-black text-white/40 mb-3">שאלה</div><div className="font-black text-white text-xl leading-tight flex-1">{roomState.currentQuestion}</div><div className="text-xs font-black text-white/25 mt-4">מביך רצח™</div></div></div>
          {roomState.phase === "choose" && <section>{isJudge ? <div className="text-center py-8"><div className="text-4xl mb-4">⚖️</div><div className="font-black text-xl mb-2">אתה השופט הסיבוב הזה</div><div className="text-white/40 font-bold">ממתין לתשובות...</div><div className="mt-4 text-sm text-white/30 font-bold">{roomState.submissions.length} / {players.length - 1} תשובות התקבלו</div></div> : hasSubmitted ? <div className="text-center py-8"><div className="text-4xl mb-4">✅</div><div className="font-black text-xl mb-2">התשובה שלך נשלחה</div><div className="text-white/40 font-bold">ממתין לשאר...</div></div> : <div><div className="flex items-center justify-between mb-4"><h2 className="font-black text-lg">בחר קלף</h2><div className="text-sm text-white/40 font-black">🃏 {me?.hand.length || 0} קלפים ביד</div></div><div className="answer-grid mb-6">{me?.hand.map((card, idx) => <button key={card + idx} onClick={() => setSelectedCard(idx)} className={`answer-card-polished ${selectedCard === idx ? "selected" : ""}`}><span className="answer-card-label">תשובה</span><span className="answer-card-text">{card}</span><span className="answer-card-brand">מביך רצח</span></button>)}</div><button onClick={submitCard} disabled={!selectedCard} className="btn-primary w-full justify-center py-4">שלח תשובה</button></div>}</section>}
          {roomState.phase === "vote" && <section>{isJudge ? <><h2 className="font-black text-xl mb-4">בחר את התשובה הכי מביכה</h2><div className="answer-grid">{roomState.submissions.map((sub) => <button key={sub.id} onClick={() => pickWinner(sub)} className="answer-card-polished"><span className="answer-card-label">בחירה</span><span className="answer-card-text">{sub.card}</span><span className="answer-card-brand">מביך רצח</span></button>)}</div></> : <div className="text-center py-10"><div className="text-4xl mb-4">👀</div><div className="font-black text-xl">ממתין לשופט לבחור...</div></div>}</section>}
          {roomState.phase === "reveal" && roomState.winner && <section className="text-center"><div className="mb-4 font-black text-white/40">המנצח של הסיבוב</div><div className="game-card-white mx-auto mb-6" style={{ maxWidth: 520 }}><div className="font-black text-black text-xl">{roomState.winner.card}</div><div className="mt-6 text-black/50 font-black">— {roomState.winner.playerName}</div></div><div className="roast-box mb-6">🤖 {roundRoast}</div>{canControl ? <button onClick={nextRound} className="btn-primary px-10 py-4">סיבוב הבא</button> : <div className="text-white/40 font-bold">ממתין לסיבוב הבא...</div>}</section>}
        </main>
      )}

      {roomState.phase === "end" && <main className="max-w-3xl mx-auto px-4 py-12 text-center"><div className="text-6xl mb-4">🏆</div><h1 className="font-black text-5xl mb-3">נגמר המשחק</h1><div className="game-card-white mx-auto mb-8" style={{ maxWidth: 520 }}><div className="text-black/50 font-black text-sm mb-2">המנצח</div><div className="font-black text-black text-4xl">{scoreSorted[0]?.name}</div><div className="mt-4 text-black/50 font-bold">{scoreSorted[0]?.score} נקודות</div></div><div className="grid grid-cols-2 gap-3 mb-8">{players.map((p) => <div key={p.id} className="border border-white/10 rounded-xl p-4" style={{ background: "#0d0d0d" }}><div className="font-black">{p.name}</div><div className="text-white/40 text-sm">{titleForPlayer(p)}</div><div className="score-badge mx-auto mt-2">{p.score}</div></div>)}</div>{isHost && <button onClick={resetGame} className="btn-primary px-10 py-4">משחק חדש</button>}</main>}
    </div>
  );
}
