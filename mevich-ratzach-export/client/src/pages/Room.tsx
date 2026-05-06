/**
 * מביך רצח — Room / Game Page
 * Design: Cards Against Humanity DNA
 * Pure black bg, white/black cards, Heebo Black, raw Israeli humor
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
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
  type GameState,
} from "@/lib/gameData";

// =====================================================
// TYPES
// =====================================================
type Phase = "lobby" | "choose" | "vote" | "reveal" | "end";

interface LocalState {
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

// =====================================================
// STORAGE KEY
// =====================================================
function storageKey(roomId: string) {
  return `mevich_room_${roomId}`;
}

function saveState(roomId: string, state: LocalState) {
  try {
    localStorage.setItem(storageKey(roomId), JSON.stringify(state));
  } catch {}
}

function loadState(roomId: string): LocalState | null {
  try {
    const s = localStorage.getItem(storageKey(roomId));
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

// =====================================================
// INITIAL STATE
// =====================================================
function makeInitialState(
  roomId: string,
  hostName: string,
  hostId: string,
  packs: string[],
  scoreLimit: number
): LocalState {
  const questions = shuffle(allQuestions(packs));
  const answers = shuffle(allAnswers(packs));
  const host = blankPlayer(hostId, hostName, true);
  // Deal 7 cards to host
  host.hand = answers.splice(0, 7);

  return {
    phase: "lobby",
    round: 0,
    judgeIndex: 0,
    currentQuestion: "",
    players: [host],
    submissions: [],
    winner: null,
    selectedPacks: packs,
    event: null,
    deck: answers,
    questionDeck: questions,
    usedQuestions: [],
    scoreLimit,
  };
}

// =====================================================
// DEAL CARDS
// =====================================================
function dealCards(state: LocalState, playerId: string): LocalState {
  const s = { ...state, deck: [...state.deck], players: state.players.map((p) => ({ ...p, hand: [...p.hand] })) };
  const player = s.players.find((p) => p.id === playerId);
  if (!player) return s;
  while (player.hand.length < 7 && s.deck.length > 0) {
    player.hand.push(s.deck.shift()!);
  }
  // Reshuffle if needed
  if (s.deck.length < 10) {
    const used = s.players.flatMap((p) => p.hand);
    const extra = shuffle(allAnswers(s.selectedPacks).filter((a) => !used.includes(a)));
    s.deck = [...s.deck, ...extra];
  }
  return s;
}

// =====================================================
// COMPONENT
// =====================================================
export default function Room() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const roomId = window.location.pathname.split("/room/")[1]?.split("?")[0] || "ROOM";
  const isHost = params.get("host") === "1";
  const playerName = params.get("name") || (isHost ? "מארח" : "אורח");
  const guestId = params.get("guestId") || uid();
  const packsParam = params.get("packs") || "classic,israeli,office";
  const selectedPacksFromUrl = packsParam.split(",").filter((p) => PACKS[p]);

  const [state, setState] = useState<LocalState>(() => {
    const saved = loadState(roomId);
    if (saved) {
      // If joining, add self if not already there
      if (!isHost) {
        const exists = saved.players.find((p) => p.id === guestId);
        if (!exists) {
          const newPlayer = blankPlayer(guestId, playerName, false);
          let s = { ...saved, players: [...saved.players, newPlayer] };
          s = dealCards(s, guestId);
          saveState(roomId, s);
          return s;
        }
      }
      return saved;
    }
    if (isHost) {
      const s = makeInitialState(roomId, playerName, guestId, selectedPacksFromUrl, 7);
      saveState(roomId, s);
      return s;
    }
    // Guest joining non-existent room
    return makeInitialState(roomId, playerName, guestId, ["classic"], 7);
  });

  const [myId] = useState(guestId);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [showRoast, setShowRoast] = useState(false);
  const [roastText, setRoastText] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = state.players.find((p) => p.id === myId);
  const judge = state.players[state.judgeIndex];
  const isJudge = judge?.id === myId;
  const hasSubmitted = state.submissions.some((s) => s.playerId === myId);

  function showToast(msg: string) {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }

  function update(updater: (s: LocalState) => LocalState) {
    setState((prev) => {
      const next = updater(prev);
      saveState(roomId, next);
      return next;
    });
  }

  // ---- ADD PLAYER (host only) ----
  function addPlayer() {
    const n = addName.trim();
    if (!n) return;
    const newId = uid();
    const newPlayer = blankPlayer(newId, n, false);
    update((s) => {
      let ns = { ...s, players: [...s.players, newPlayer] };
      ns = dealCards(ns, newId);
      return ns;
    });
    setAddName("");
    showToast(`${n} נוסף למשחק`);
  }

  // ---- START GAME ----
  function startGame() {
    if (state.players.length < 2) {
      showToast("צריך לפחות 2 שחקנים");
      return;
    }
    update((s) => {
      const qDeck = [...s.questionDeck];
      const q = qDeck.shift() || "מה הדבר הכי מביך שקרה לך?";
      // Random chaos event (20% chance)
      const event = Math.random() < 0.2 ? CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)] : null;
      return {
        ...s,
        phase: "choose",
        round: 1,
        judgeIndex: 0,
        currentQuestion: q,
        questionDeck: qDeck,
        usedQuestions: [...s.usedQuestions, q],
        submissions: [],
        winner: null,
        event,
      };
    });
  }

  // ---- SUBMIT CARD ----
  function submitCard() {
    if (!selectedCard || isJudge || hasSubmitted) return;
    const card = selectedCard;
    update((s) => {
      const newSub: Submission = {
        id: uid(),
        playerId: myId,
        playerName: me?.name || playerName,
        card,
        votes: 0,
      };
      const newPlayers = s.players.map((p) => {
        if (p.id !== myId) return p;
        return { ...p, hand: p.hand.filter((c) => c !== card) };
      });
      const newSubs = [...s.submissions, newSub];
      // If all non-judges submitted, move to vote/reveal
      const nonJudges = s.players.filter((p) => p.id !== judge?.id);
      const allSubmitted = nonJudges.every((p) => newSubs.some((sub) => sub.playerId === p.id));
      return {
        ...s,
        submissions: newSubs,
        players: newPlayers,
        phase: allSubmitted ? "vote" : "choose",
      };
    });
    setSelectedCard(null);
    showToast("קלף נשלח!");
  }

  // ---- JUDGE PICKS WINNER ----
  function pickWinner(sub: Submission) {
    if (!isJudge || state.phase !== "vote") return;
    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    setRoastText(roast);
    setShowRoast(true);

    update((s) => {
      const newPlayers = s.players.map((p) => {
        if (p.id !== sub.playerId) return p;
        return { ...p, score: p.score + 1, wins: p.wins + 1 };
      });
      const winner = newPlayers.find((p) => p.score >= s.scoreLimit);
      return {
        ...s,
        phase: winner ? "end" : "reveal",
        winner: sub,
        players: newPlayers,
      };
    });

    setTimeout(() => setShowRoast(false), 3500);
  }

  // ---- NEXT ROUND ----
  function nextRound() {
    update((s) => {
      const nextJudgeIndex = (s.judgeIndex + 1) % s.players.length;
      const qDeck = [...s.questionDeck];
      const q = qDeck.shift() || shuffle(allQuestions(s.selectedPacks))[0] || "מה הדבר הכי מביך?";
      const event = Math.random() < 0.2 ? CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)] : null;

      // Deal cards to all players
      let ns: LocalState = {
        ...s,
        phase: "choose" as Phase,
        round: s.round + 1,
        judgeIndex: nextJudgeIndex,
        currentQuestion: q,
        questionDeck: qDeck,
        usedQuestions: [...s.usedQuestions, q],
        submissions: [] as Submission[],
        winner: null,
        event,
      };
      s.players.forEach((p) => {
        if (p.id !== s.players[nextJudgeIndex]?.id) {
          ns = dealCards(ns, p.id);
        }
      });
      return ns;
    });
  }

  // ---- RESET GAME ----
  function resetGame() {
    const s = makeInitialState(roomId, playerName, myId, state.selectedPacks, state.scoreLimit);
    saveState(roomId, s);
    setState(s);
    showToast("משחק חדש!");
  }

  // ---- COPY ROOM CODE ----
  function copyCode() {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(true);
      showToast("קישור הועתק!");
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Heebo', sans-serif", direction: "rtl" }}>

      {/* ===== NAV ===== */}
      <nav className="border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50" style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)" }}>
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors font-black text-sm"
        >
          ← חזרה
        </button>

        <div className="flex items-center gap-3">
          <div className="font-black text-sm">
            מביך <span style={{ color: "#e53e3e" }}>רצח</span>
          </div>
          <div className="border border-white/20 rounded px-3 py-1 font-black text-lg tracking-widest" style={{ letterSpacing: "0.15em" }}>
            {roomId}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="text-xs font-black px-3 py-1.5 border border-white/20 rounded transition-all hover:border-white/50"
            style={{ background: copyFeedback ? "white" : "transparent", color: copyFeedback ? "black" : "rgba(255,255,255,0.6)" }}
          >
            {copyFeedback ? "✓ הועתק" : "שתף"}
          </button>
          <div className="text-xs font-bold text-white/30">
            סיבוב {state.round}
          </div>
        </div>
      </nav>

      {/* ===== LOBBY ===== */}
      {state.phase === "lobby" && (
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="font-black text-5xl mb-3" style={{ letterSpacing: "-0.02em" }}>
              לובי
            </h1>
            <p className="text-white/40 font-bold">ממתין לשחקנים...</p>
          </div>

          {/* Room code big display */}
          <div className="border-2 border-white/20 rounded-2xl p-8 text-center mb-8" style={{ background: "#0d0d0d" }}>
            <div className="text-xs font-black text-white/40 mb-3 tracking-widest">קוד חדר</div>
            <div className="font-black text-6xl tracking-widest mb-4" style={{ letterSpacing: "0.15em" }}>
              {roomId}
            </div>
            <button onClick={copyCode} className="btn-secondary text-sm">
              {copyFeedback ? "✓ הועתק!" : "📋 העתק קישור"}
            </button>
          </div>

          {/* Players list */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-base">שחקנים ({state.players.length})</h2>
              <span className="text-xs text-white/30 font-bold">מינימום 2</span>
            </div>
            <div className="space-y-2">
              {state.players.map((p) => (
                <div key={p.id} className="player-row">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-sm">
                      {p.name[0]}
                    </div>
                    <span className="font-bold text-sm">{p.name}</span>
                    {p.isHost && <span className="text-xs font-black text-white/30 border border-white/20 rounded px-1.5">מארח</span>}
                    {p.id === myId && <span className="text-xs font-black text-white/30">← אתה</span>}
                  </div>
                  <div className="text-xs text-white/30 font-bold">{p.hand.length} קלפים</div>
                </div>
              ))}
            </div>
          </div>

          {/* Add player (host) */}
          {isHost && (
            <div className="mb-6 border border-white/10 rounded-xl p-4" style={{ background: "#0d0d0d" }}>
              <h3 className="font-black text-sm text-white/60 mb-3">הוסף שחקן ידנית</h3>
              <div className="flex gap-2">
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                  placeholder="שם שחקן"
                  className="game-input flex-1"
                  maxLength={20}
                />
                <button onClick={addPlayer} className="btn-primary">הוסף</button>
              </div>
            </div>
          )}

          {/* Packs preview */}
          <div className="mb-8">
            <h3 className="font-black text-sm text-white/40 mb-3">חבילות נבחרות</h3>
            <div className="flex flex-wrap gap-2">
              {state.selectedPacks.map((id) => (
                <div key={id} className="flex items-center gap-1.5 border border-white/15 rounded-full px-3 py-1 text-xs font-bold text-white/60">
                  <span>{PACKS[id]?.emoji}</span>
                  <span>{PACKS[id]?.name}</span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <button
              onClick={startGame}
              disabled={state.players.length < 2}
              className="btn-primary w-full justify-center text-lg py-4"
            >
              🎮 התחל משחק ({state.players.length} שחקנים)
            </button>
          )}
          {!isHost && (
            <div className="text-center text-white/40 font-bold">
              ממתין למארח להתחיל...
            </div>
          )}
        </div>
      )}

      {/* ===== GAME PHASES ===== */}
      {(state.phase === "choose" || state.phase === "vote" || state.phase === "reveal") && (
        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* Score bar */}
          <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-1">
            {state.players.map((p, i) => (
              <div
                key={p.id}
                className="flex-shrink-0 flex items-center gap-2 border rounded-full px-3 py-1.5"
                style={{
                  borderColor: i === state.judgeIndex ? "white" : "rgba(255,255,255,0.15)",
                  background: i === state.judgeIndex ? "rgba(255,255,255,0.08)" : "transparent",
                }}
              >
                {i === state.judgeIndex && <span className="text-xs">⚖️</span>}
                <span className="font-bold text-xs text-white/80">{p.name}</span>
                <span className="score-badge">{p.score}</span>
                {p.id === myId && <span className="text-xs text-white/30">אתה</span>}
              </div>
            ))}
          </div>

          {/* Chaos event banner */}
          {state.event && (
            <div className="chaos-banner mb-6 flex items-center gap-3">
              <span className="text-2xl">{state.event.emoji}</span>
              <div>
                <div className="font-black text-sm text-white">{state.event.title}</div>
                <div className="text-xs font-bold text-white/50">{state.event.description}</div>
              </div>
            </div>
          )}

          {/* Question card */}
          <div className="mb-8">
            <div className="text-xs font-black text-white/30 mb-3 tracking-widest">
              סיבוב {state.round} · שופט: {judge?.name}
            </div>
            <div className="game-card-black" style={{ maxWidth: 520, minHeight: 180 }}>
              <div className="text-xs font-black text-white/40 mb-3">שאלה</div>
              <div className="font-black text-white text-xl leading-tight flex-1">
                {state.currentQuestion}
              </div>
              <div className="text-xs font-black text-white/25 mt-4">מביך רצח™</div>
            </div>
          </div>

          {/* CHOOSE PHASE */}
          {state.phase === "choose" && (
            <div>
              {isJudge ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⚖️</div>
                  <div className="font-black text-xl mb-2">אתה השופט הסיבוב הזה</div>
                  <div className="text-white/40 font-bold">ממתין לתשובות...</div>
                  <div className="mt-4 text-sm text-white/30 font-bold">
                    {state.submissions.length} / {state.players.length - 1} תשובות התקבלו
                  </div>
                </div>
              ) : hasSubmitted ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">✅</div>
                  <div className="font-black text-xl mb-2">קלף נשלח!</div>
                  <div className="text-white/40 font-bold">ממתין לשאר השחקנים...</div>
                  <div className="mt-4 text-sm text-white/30 font-bold">
                    {state.submissions.length} / {state.players.length - 1} תשובות התקבלו
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-black text-base">בחר קלף תשובה</h2>
                    <span className="text-xs text-white/30 font-bold">{me?.hand.length || 0} קלפים ביד</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                    {me?.hand.map((card) => (
                      <button
                        key={card}
                        onClick={() => setSelectedCard(selectedCard === card ? null : card)}
                        className="game-card-white text-right"
                        style={{
                          borderColor: selectedCard === card ? "#22c55e" : "#111",
                          boxShadow: selectedCard === card ? "6px 6px 0px #22c55e" : "5px 5px 0px rgba(0,0,0,0.3)",
                          minHeight: 120,
                        }}
                      >
                        <div className="text-xs font-black text-black/30 mb-1">תשובה</div>
                        <div className="font-black text-black text-sm leading-tight flex-1">{card}</div>
                        <div className="text-xs font-black text-black/20 mt-2">מביך רצח™</div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={submitCard}
                    disabled={!selectedCard}
                    className="btn-primary"
                  >
                    {selectedCard ? `שלח: "${selectedCard.slice(0, 30)}${selectedCard.length > 30 ? "..." : ""}"` : "בחר קלף"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VOTE PHASE */}
          {state.phase === "vote" && (
            <div>
              <div className="text-xs font-black text-white/40 mb-4 tracking-widest">
                {isJudge ? "בחר את הכי טוב (או הכי גרוע)" : "השופט בוחר..."}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {shuffle(state.submissions).map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => isJudge && pickWinner(sub)}
                    className="game-card-white text-right"
                    style={{
                      cursor: isJudge ? "pointer" : "default",
                      minHeight: 140,
                      opacity: isJudge ? 1 : 0.85,
                    }}
                  >
                    <div className="text-xs font-black text-black/30 mb-1">תשובה</div>
                    <div className="font-black text-black text-sm leading-tight flex-1">{sub.card}</div>
                    <div className="text-xs font-black text-black/20 mt-2">מביך רצח™</div>
                  </button>
                ))}
              </div>
              {!isJudge && (
                <div className="mt-6 text-center text-white/40 font-bold text-sm">
                  {judge?.name} בוחר עכשיו...
                </div>
              )}
            </div>
          )}

          {/* REVEAL PHASE */}
          {state.phase === "reveal" && state.winner && (
            <div>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🏆</div>
                <div className="font-black text-2xl mb-1">
                  {state.winner.playerName} ניצח!
                </div>
                <div className="text-white/40 font-bold text-sm">
                  {state.players.find((p) => p.id === state.winner?.playerId)?.score || 0} נקודות
                </div>
              </div>

              <div className="flex justify-center mb-8">
                <div className="game-card-white winner text-right" style={{ maxWidth: 320, minHeight: 160 }}>
                  <div className="text-xs font-black text-black/30 mb-2">הקלף המנצח</div>
                  <div className="font-black text-black text-lg leading-tight flex-1">{state.winner.card}</div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-xs font-black text-black/30">מביך רצח™</div>
                    <div className="text-xs font-black text-black/50">— {state.winner.playerName}</div>
                  </div>
                </div>
              </div>

              {/* Roast */}
              {roastText && (
                <div className="roast-box max-w-lg mx-auto mb-8 text-center">
                  "{roastText}"
                </div>
              )}

              {/* All submissions */}
              <div className="mb-8">
                <h3 className="font-black text-sm text-white/40 mb-3">כל התשובות</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {state.submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="game-card-white text-right"
                      style={{
                        minHeight: 120,
                        borderColor: sub.id === state.winner?.id ? "#22c55e" : "#111",
                        boxShadow: sub.id === state.winner?.id ? "5px 5px 0px #22c55e" : "4px 4px 0px rgba(0,0,0,0.2)",
                        opacity: sub.id === state.winner?.id ? 1 : 0.6,
                      }}
                    >
                      <div className="font-black text-black text-sm leading-tight flex-1">{sub.card}</div>
                      <div className="text-xs font-black text-black/40 mt-2">— {sub.playerName}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scores */}
              <div className="border border-white/10 rounded-xl p-5 mb-8" style={{ background: "#0d0d0d" }}>
                <h3 className="font-black text-sm text-white/40 mb-3">טבלת ניקוד</h3>
                <div className="space-y-2">
                  {[...state.players].sort((a, b) => b.score - a.score).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-white/20 text-sm w-5">{i + 1}</span>
                        <span className="font-bold text-sm">{p.name}</span>
                        {p.id === myId && <span className="text-xs text-white/30">אתה</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-white/10 w-24 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white transition-all"
                            style={{ width: `${Math.min(100, (p.score / state.scoreLimit) * 100)}%` }}
                          />
                        </div>
                        <span className="score-badge">{p.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isHost && (
                <button onClick={nextRound} className="btn-primary w-full justify-center text-base py-3">
                  ➡️ סיבוב הבא
                </button>
              )}
              {!isHost && (
                <div className="text-center text-white/40 font-bold">ממתין למארח...</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== END PHASE ===== */}
      {state.phase === "end" && (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="font-black text-4xl mb-4" style={{ letterSpacing: "-0.02em" }}>
            המשחק נגמר!
          </h1>

          {(() => {
            const winner = [...state.players].sort((a, b) => b.score - a.score)[0];
            return (
              <div className="mb-8">
                <div className="font-black text-2xl text-white mb-1">{winner?.name}</div>
                <div className="text-white/40 font-bold">{titleForPlayer(winner)} · {winner?.score} נקודות</div>
              </div>
            );
          })()}

          <div className="border border-white/10 rounded-xl p-6 mb-8 text-right" style={{ background: "#0d0d0d" }}>
            <h3 className="font-black text-sm text-white/40 mb-4">תוצאות סופיות</h3>
            <div className="space-y-3">
              {[...state.players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-2xl w-8">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <div>
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-xs text-white/30 font-bold">{titleForPlayer(p)}</div>
                    </div>
                  </div>
                  <span className="score-badge text-base px-3 py-1">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="flex gap-3 justify-center">
              <button onClick={resetGame} className="btn-primary">
                🔄 משחק חדש
              </button>
              <button onClick={() => setLocation("/")} className="btn-secondary">
                🏠 דף הבית
              </button>
            </div>
          )}
          {!isHost && (
            <button onClick={() => setLocation("/")} className="btn-secondary">
              🏠 חזרה לדף הבית
            </button>
          )}
        </div>
      )}

      {/* ===== ROAST OVERLAY ===== */}
      {showRoast && (
        <div className="game-overlay" onClick={() => setShowRoast(false)}>
          <div className="reveal-box animate-reveal max-w-sm mx-4 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <div className="font-black text-black text-lg leading-snug mb-3">
              "{roastText}"
            </div>
            <div className="text-xs font-bold text-black/40">— שופט ה-AI</div>
          </div>
        </div>
      )}

      {/* ===== TOAST ===== */}
      {toast && <div className="game-toast">{toast}</div>}
    </div>
  );
}
