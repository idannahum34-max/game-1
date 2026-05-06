
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { supabase, hasSupabase } from "@/lib/supabase";
import {
  PACKS,
  CHAOS_EVENTS,
  ROASTS,
  shuffle,
  blankPlayer,
  allAnswers,
  allQuestions,
  titleForPlayer,
  uid,
  type Player,
  type Submission,
  type ChaosEvent,
} from "@/lib/gameData";

type Phase = "lobby" | "choose" | "vote" | "reveal" | "end";

interface RoomState {
  phase: Phase;
  round: number;
  judgeIndex: number;
  currentQuestion: string;
  players: Player[];
  submissions: Submission[];
  winner: Submission | null;
  selectedPacks: string[];
  event: ChaosEvent | null;
  deck: string[];
  questionDeck: string[];
  usedQuestions: string[];
  scoreLimit: number;
}

function getClientId() {
  const key = "mevich_client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = uid();
    localStorage.setItem(key, id);
  }
  return id;
}

function makeState(roomId: string, packs: string[], scoreLimit = 7): RoomState {
  return {
    phase: "lobby",
    round: 0,
    judgeIndex: 0,
    currentQuestion: "",
    players: [],
    submissions: [],
    winner: null,
    selectedPacks: packs,
    event: null,
    deck: shuffle(allAnswers(packs)),
    questionDeck: shuffle(allQuestions(packs)),
    usedQuestions: [],
    scoreLimit,
  };
}

function dealToSeven(state: RoomState, playerId: string): RoomState {
  const next: RoomState = {
    ...state,
    deck: [...state.deck],
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
  };

  const player = next.players.find((p) => p.id === playerId);
  if (!player) return next;

  while (player.hand.length < 7 && next.deck.length > 0) {
    player.hand.push(next.deck.shift()!);
  }

  if (next.deck.length < 10) {
    const inHands = next.players.flatMap((p) => p.hand);
    const more = shuffle(allAnswers(next.selectedPacks).filter((a) => !inHands.includes(a)));
    next.deck = [...next.deck, ...more];
  }

  return next;
}

export default function Room() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const roomId = window.location.pathname.split("/room/")[1]?.split("?")[0] || "ROOM";
  const isHost = params.get("host") === "1";
  const initialName = params.get("name") || (isHost ? "מארח" : "");
  const packsParam = params.get("packs") || "classic,israeli,office";
  const initialPacks = packsParam.split(",").filter((p) => PACKS[p]);
  const myIdRef = useRef(isHost ? `host_${roomId}` : getClientId());

  const [state, setState] = useState<RoomState>(() => makeState(roomId, initialPacks.length ? initialPacks : ["classic"]));
  const [myName, setMyName] = useState(initialName);
  const [joined, setJoined] = useState(isHost);
  const [addName, setAddName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showRoast, setShowRoast] = useState(false);
  const [roastText, setRoastText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myId = myIdRef.current;
  const me = state.players.find((p) => p.id === myId);
  const judge = state.players[state.judgeIndex];
  const isJudge = judge?.id === myId;
  const hasSubmitted = state.submissions.some((s) => s.playerId === myId);

  const inviteUrl = `${window.location.origin}/room/${roomId}`;

  function showToast(msg: string) {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2500);
  }

  const canControl = isHost || isJudge;

  async function saveRoom(nextState: RoomState) {
    setState(nextState);
    if (!hasSupabase || !supabase) {
      localStorage.setItem(`mevich_room_${roomId}`, JSON.stringify(nextState));
      return;
    }

    await supabase.from("rooms").upsert({
      id: roomId,
      name: "מביך רצח",
      host_id: `host_${roomId}`,
      phase: nextState.phase,
      game_state: nextState,
      selected_packs: nextState.selectedPacks,
      secrets: [],
      updated_at: new Date().toISOString(),
    });

    for (const p of nextState.players) {
      await supabase.from("players").upsert({
        id: p.id,
        room_id: roomId,
        name: p.name,
        score: p.score,
        hand: p.hand,
        is_host: p.isHost,
        connected: true,
      });
    }
  }

  async function pullRemote() {
    if (!hasSupabase || !supabase) return;

    const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    const { data: rows } = await supabase.from("players").select("*").eq("room_id", roomId).order("created_at");

    if (room?.game_state && Object.keys(room.game_state).length) {
      const remote = room.game_state as RoomState;
      if (rows && remote.phase === "lobby") {
        remote.players = rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          isHost: r.is_host,
          hand: r.hand || [],
          score: r.score || 0,
          wins: 0,
          chaos: 0,
          votes: 0,
          reputation: [],
        }));
      }
      setState(remote);
    } else if (rows) {
      setState((prev) => ({
        ...prev,
        players: rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          isHost: r.is_host,
          hand: r.hand || [],
          score: r.score || 0,
          wins: 0,
          chaos: 0,
          votes: 0,
          reputation: [],
        })),
      }));
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!hasSupabase || !supabase) {
        const saved = localStorage.getItem(`mevich_room_${roomId}`);
        if (saved) setState(JSON.parse(saved));
        if (isHost) {
          const host = blankPlayer(myId, "מארח", true);
          host.hand = [];
          const s = makeState(roomId, initialPacks.length ? initialPacks : ["classic"]);
          s.players = [host];
          await saveRoom(s);
        }
        return;
      }

      if (isHost) {
        const { data: existing } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
        if (!existing) {
          const s = makeState(roomId, initialPacks.length ? initialPacks : ["classic"]);
          const host = blankPlayer(myId, myName || "מארח", true);
          s.players = [host];

          await supabase.from("rooms").insert({
            id: roomId,
            name: "מביך רצח",
            host_id: myId,
            phase: "lobby",
            game_state: s,
            selected_packs: s.selectedPacks,
            secrets: [],
          });

          await supabase.from("players").upsert({
            id: myId,
            room_id: roomId,
            name: host.name,
            score: 0,
            hand: [],
            is_host: true,
            connected: true,
          });
        }
        setJoined(true);
      }

      await pullRemote();
    }

    init();

    if (!hasSupabase || !supabase) return;

    const channel = supabase
      .channel(`mevich-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => mounted && pullRemote())
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, () => mounted && pullRemote())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  async function joinRoom() {
    const name = myName.trim();
    if (!name) {
      showToast("תכתוב שם");
      return;
    }

    const newPlayer = blankPlayer(myId, name, false);
    let next = state.players.some((p) => p.id === myId)
      ? { ...state, players: state.players.map((p) => (p.id === myId ? { ...p, name } : p)) }
      : { ...state, players: [...state.players, newPlayer] };

    setJoined(true);

    if (hasSupabase && supabase) {
      await supabase.from("players").upsert({
        id: myId,
        room_id: roomId,
        name,
        score: 0,
        hand: [],
        is_host: false,
        connected: true,
      });

      await supabase.from("rooms").upsert({
        id: roomId,
        name: "מביך רצח",
        phase: next.phase,
        game_state: next,
        selected_packs: next.selectedPacks,
        secrets: [],
      });

      await pullRemote();
      return;
    }

    await saveRoom(next);
  }

  async function addPlayer() {
    const n = addName.trim();
    if (!n) return;

    const newPlayer = blankPlayer(uid(), n, false);
    let next = { ...state, players: [...state.players, newPlayer] };
    setAddName("");
    showToast(`${n} נוסף למשחק`);
    await saveRoom(next);
  }

  async function startGame() {
    if (state.players.length < 2) {
      showToast("צריך לפחות 2 שחקנים");
      return;
    }

    let next: RoomState = {
      ...state,
      phase: "choose",
      round: 1,
      judgeIndex: 0,
      submissions: [],
      winner: null,
      currentQuestion: state.questionDeck[0] || "מה הדבר הכי מביך שקרה לך?",
      questionDeck: state.questionDeck.slice(1),
      event: Math.random() < 0.25 ? CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)] : null,
    };

    next.players.forEach((p) => {
      next = dealToSeven(next, p.id);
    });

    await saveRoom(next);
  }

  async function submitCard() {
    if (!selectedCard || !me || isJudge || hasSubmitted) return;

    const card = selectedCard;
    const sub: Submission = {
      id: uid(),
      playerId: myId,
      playerName: me.name,
      card,
      votes: 0,
    };

    let next: RoomState = {
      ...state,
      submissions: [...state.submissions, sub],
      players: state.players.map((p) => {
        if (p.id !== myId) return p;
        return { ...p, hand: p.hand.filter((c) => c !== card) };
      }),
    };

    next = dealToSeven(next, myId);

    const judgeId = next.players[next.judgeIndex]?.id;
    const nonJudges = next.players.filter((p) => p.id !== judgeId);
    const allSubmitted = nonJudges.every((p) => next.submissions.some((s) => s.playerId === p.id));

    if (allSubmitted) next.phase = "vote";

    setSelectedCard(null);
    await saveRoom(next);
  }

  async function pickWinner(sub: Submission) {
    if (!isJudge || state.phase !== "vote") return;

    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    setRoastText(roast);
    setShowRoast(true);
    setTimeout(() => setShowRoast(false), 3000);

    const players = state.players.map((p) => {
      if (p.id !== sub.playerId) return p;
      return { ...p, score: p.score + 1, wins: p.wins + 1 };
    });

    const winnerPlayer = players.find((p) => p.score >= state.scoreLimit);

    await saveRoom({
      ...state,
      players,
      winner: sub,
      phase: winnerPlayer ? "end" : "reveal",
    });
  }

  async function nextRound() {
    if (!canControl) return;

    let qDeck = [...state.questionDeck];
    if (!qDeck.length) qDeck = shuffle(allQuestions(state.selectedPacks));

    let next: RoomState = {
      ...state,
      phase: "choose",
      round: state.round + 1,
      judgeIndex: (state.judgeIndex + 1) % state.players.length,
      currentQuestion: qDeck.shift() || "מה הדבר הכי מביך?",
      questionDeck: qDeck,
      submissions: [],
      winner: null,
      event: Math.random() < 0.25 ? CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)] : null,
    };

    next.players.forEach((p) => {
      next = dealToSeven(next, p.id);
    });

    await saveRoom(next);
  }

  async function resetGame() {
    if (!isHost) return;
    const host = state.players.find((p) => p.isHost) || blankPlayer(myId, myName || "מארח", true);
    const next = makeState(roomId, state.selectedPacks, state.scoreLimit);
    next.players = [{ ...host, score: 0, hand: [], wins: 0, chaos: 0, votes: 0, reputation: [] }];
    await saveRoom(next);
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopyFeedback(true);
      showToast("קישור הועתק בלי מצב מארח");
      setTimeout(() => setCopyFeedback(false), 1800);
    });
  }

  const scoreSorted = useMemo(() => [...state.players].sort((a, b) => b.score - a.score), [state.players]);

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Heebo', sans-serif", direction: "rtl" }}>
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full font-black z-50">
          {toast}
        </div>
      )}

      <nav className="border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50" style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors font-black text-sm">
          ← חזרה
        </button>

        <div className="flex items-center gap-3">
          <div className="font-black text-sm">מביך <span style={{ color: "#e53e3e" }}>רצח</span></div>
          <div className="border border-white/20 rounded px-3 py-1 font-black text-lg tracking-widest" style={{ letterSpacing: "0.15em" }}>
            {roomId}
          </div>
        </div>

        <button onClick={copyCode} className="text-xs font-black px-3 py-1.5 border border-white/20 rounded transition-all hover:border-white/50" style={{ background: copyFeedback ? "white" : "transparent", color: copyFeedback ? "black" : "rgba(255,255,255,0.6)" }}>
          {copyFeedback ? "✓ הועתק" : "שתף"}
        </button>
      </nav>

      {state.phase === "lobby" && (
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <h1 className="font-black text-5xl mb-3">לובי</h1>
            <p className="text-white/40 font-bold">
              {hasSupabase ? "Realtime מחובר — עכשיו בודקים אנשים אמיתיים" : "מצב מקומי — Supabase לא מחובר"}
            </p>
          </div>

          <div className="border-2 border-white/20 rounded-2xl p-8 text-center mb-8" style={{ background: "#0d0d0d" }}>
            <div className="text-xs font-black text-white/40 mb-3 tracking-widest">קוד חדר</div>
            <div className="font-black text-6xl tracking-widest mb-4" style={{ letterSpacing: "0.15em" }}>{roomId}</div>
            <button onClick={copyCode} className="btn-secondary text-sm">{copyFeedback ? "✓ הועתק!" : "📋 העתק קישור"}</button>
          </div>

          {!joined && !isHost && (
            <div className="mb-6 border border-white/10 rounded-xl p-4" style={{ background: "#0d0d0d" }}>
              <h3 className="font-black text-sm text-white/60 mb-3">הצטרפות לחדר</h3>
              <div className="flex gap-2">
                <input value={myName} onChange={(e) => setMyName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinRoom()} placeholder="שם שחקן" className="game-input flex-1" maxLength={20} />
                <button onClick={joinRoom} className="btn-primary">היכנס</button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-base">שחקנים ({state.players.length})</h2>
              <span className="text-xs text-white/30 font-bold">מינימום 2</span>
            </div>
            <div className="space-y-2">
              {state.players.map((p) => (
                <div key={p.id} className="player-row">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-sm">{p.name[0]}</div>
                    <span className="font-bold text-sm">{p.name}</span>
                    {p.isHost && <span className="text-xs font-black text-white/30 border border-white/20 rounded px-1.5">מארח</span>}
                    {p.id === myId && <span className="text-xs font-black text-white/30">← אתה</span>}
                  </div>
                  <div className="text-xs text-white/30 font-bold">{p.hand.length} קלפים</div>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="mb-6 border border-white/10 rounded-xl p-4" style={{ background: "#0d0d0d" }}>
              <h3 className="font-black text-sm text-white/60 mb-3">הוסף שחקן ידנית</h3>
              <div className="flex gap-2">
                <input value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="שם שחקן" className="game-input flex-1" maxLength={20} />
                <button onClick={addPlayer} className="btn-primary">הוסף</button>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="font-black text-sm text-white/40 mb-3">חבילות נבחרות</h3>
            <div className="flex flex-wrap gap-2">
              {state.selectedPacks.map((id) => (
                <div key={id} className="flex items-center gap-1.5 border border-white/15 rounded-full px-3 py-1 text-xs font-bold text-white/60">
                  <span>{PACKS[id]?.emoji}</span><span>{PACKS[id]?.name}</span>
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button onClick={startGame} disabled={state.players.length < 2} className="btn-primary w-full justify-center text-lg py-4">
              🎮 התחל משחק ({state.players.length} שחקנים)
            </button>
          ) : (
            <div className="text-center text-white/40 font-bold">ממתין למארח להתחיל...</div>
          )}
        </div>
      )}

      {(state.phase === "choose" || state.phase === "vote" || state.phase === "reveal") && (
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-1">
            {state.players.map((p, i) => (
              <div key={p.id} className="flex-shrink-0 flex items-center gap-2 border rounded-full px-3 py-1.5" style={{ borderColor: i === state.judgeIndex ? "white" : "rgba(255,255,255,0.15)", background: i === state.judgeIndex ? "rgba(255,255,255,0.08)" : "transparent" }}>
                {i === state.judgeIndex && <span className="text-xs">⚖️</span>}
                <span className="font-bold text-xs text-white/80">{p.name}</span>
                <span className="score-badge">{p.score}</span>
                {p.id === myId && <span className="text-xs text-white/30">אתה</span>}
              </div>
            ))}
          </div>

          {state.event && (
            <div className="chaos-banner mb-6 flex items-center gap-3">
              <span className="text-2xl">{state.event.emoji}</span>
              <div>
                <div className="font-black text-sm text-white">{state.event.title}</div>
                <div className="text-xs font-bold text-white/50">{state.event.description}</div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="text-xs font-black text-white/30 mb-3 tracking-widest">סיבוב {state.round} · שופט: {judge?.name}</div>
            <div className="game-card-black" style={{ maxWidth: 520, minHeight: 180 }}>
              <div className="text-xs font-black text-white/40 mb-3">שאלה</div>
              <div className="font-black text-white text-xl leading-tight flex-1">{state.currentQuestion}</div>
              <div className="text-xs font-black text-white/25 mt-4">מביך רצח™</div>
            </div>
          </div>

          {state.phase === "choose" && (
            <div>
              {isJudge ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⚖️</div>
                  <div className="font-black text-xl mb-2">אתה השופט הסיבוב הזה</div>
                  <div className="text-white/40 font-bold">ממתין לתשובות...</div>
                  <div className="mt-4 text-sm text-white/30 font-bold">{state.submissions.length} / {state.players.length - 1} תשובות התקבלו</div>
                </div>
              ) : hasSubmitted ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">✅</div>
                  <div className="font-black text-xl mb-2">התשובה שלך נשלחה</div>
                  <div className="text-white/40 font-bold">ממתין לשאר...</div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-black text-lg">בחר קלף</h2>
                    <div className="text-sm text-white/40 font-black">🃏 {me?.hand.length || 0} קלפים ביד</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {me?.hand.map((card) => (
                      <button key={card} onClick={() => setSelectedCard(card)} className={`answer-card ${selectedCard === card ? "selected" : ""}`}>
                        {card}
                      </button>
                    ))}
                  </div>
                  <button onClick={submitCard} disabled={!selectedCard} className="btn-primary w-full justify-center py-4">שלח תשובה</button>
                </div>
              )}
            </div>
          )}

          {state.phase === "vote" && (
            <div>
              {isJudge ? (
                <>
                  <h2 className="font-black text-xl mb-4">בחר את התשובה הכי מביכה</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {state.submissions.map((sub) => (
                      <button key={sub.id} onClick={() => pickWinner(sub)} className="answer-card">
                        {sub.card}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="text-4xl mb-4">👀</div>
                  <div className="font-black text-xl">ממתין לשופט לבחור...</div>
                </div>
              )}
            </div>
          )}

          {state.phase === "reveal" && state.winner && (
            <div className="text-center">
              <div className="mb-4 font-black text-white/40">המנצח של הסיבוב</div>
              <div className="game-card-white mx-auto mb-6" style={{ maxWidth: 520 }}>
                <div className="font-black text-black text-xl">{state.winner.card}</div>
                <div className="mt-6 text-black/50 font-black">— {state.winner.playerName}</div>
              </div>
              {showRoast && <div className="roast-box mb-6">🤖 {roastText}</div>}
              {canControl ? (
                <button onClick={nextRound} className="btn-primary px-10 py-4">סיבוב הבא</button>
              ) : (
                <div className="text-white/40 font-bold">ממתין לסיבוב הבא...</div>
              )}
            </div>
          )}
        </div>
      )}

      {state.phase === "end" && (
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="font-black text-5xl mb-3">נגמר המשחק</h1>
          <div className="game-card-white mx-auto mb-8" style={{ maxWidth: 520 }}>
            <div className="text-black/50 font-black text-sm mb-2">המנצח</div>
            <div className="font-black text-black text-4xl">{scoreSorted[0]?.name}</div>
            <div className="mt-4 text-black/50 font-bold">{scoreSorted[0]?.score} נקודות</div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {state.players.map((p) => (
              <div key={p.id} className="border border-white/10 rounded-xl p-4" style={{ background: "#0d0d0d" }}>
                <div className="font-black">{p.name}</div>
                <div className="text-white/40 text-sm">{titleForPlayer(p)}</div>
                <div className="score-badge mx-auto mt-2">{p.score}</div>
              </div>
            ))}
          </div>

          {isHost && <button onClick={resetGame} className="btn-primary px-10 py-4">משחק חדש</button>}
        </div>
      )}
    </div>
  );
}
