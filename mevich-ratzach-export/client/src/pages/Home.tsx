/**
 * מביך רצח — Home Page
 * Design: Cards Against Humanity DNA
 * Pure black bg, white/black cards, Heebo Black, raw Israeli humor
 */

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { makeCode, getGuestId, PACKS } from "@/lib/gameData";

const SAMPLE_QUESTIONS = [
  "מה הדבר שאסור לומר בלוויה אבל כולם חושבים?",
  "הדבר הכי גרוע לגלות באמצע דייט:",
  "מה הדבר שהורס כל ארוחת שישי?",
  "מה כולם חושבים בזמן ישיבת צוות?",
  "מה הסיבה האמיתית שאתה לא ישן בלילה?",
];

const SAMPLE_ANSWERS = [
  "סוף סוף",
  "אקס שראה סטורי",
  "דוד שמתחיל פוליטיקה",
  "ישיבה שהייתה יכולה להיות מייל",
  "מישהו שמסביר NFT בארוחת שישי",
  "שקית גרעינים באוטו",
  "קבוצת וואטסאפ של ההורים",
];

const PACK_LIST = Object.entries(PACKS);

export default function Home() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [selectedPacks, setSelectedPacks] = useState<string[]>(["classic", "israeli", "office"]);
  const [toast, setToast] = useState<string | null>(null);
  const [heroQ, setHeroQ] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  // Rotate hero question
  useEffect(() => {
    const t = setInterval(() => setHeroQ((q) => (q + 1) % SAMPLE_QUESTIONS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Generate room code on mount
  useEffect(() => {
    setCode(makeCode());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function togglePack(id: string) {
    const pack = PACKS[id];
    if (pack?.free === false && !selectedPacks.includes(id)) {
      setSelectedPacks((p) => [...p, id]);
      return;
    }
    setSelectedPacks((p) =>
      p.includes(id) ? (p.length > 1 ? p.filter((x) => x !== id) : p) : [...p, id]
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setError("שם שחקן נדרש");
      nameRef.current?.focus();
      return;
    }
    if (n.length < 2) {
      setError("שם קצר מדי");
      return;
    }
    const guestId = getGuestId();
    const params = new URLSearchParams({
      host: "1",
      name: n,
      packs: selectedPacks.join(","),
      guestId,
    });
    setLocation(`/room/${code}?${params.toString()}`);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const c = joinCode.trim().toUpperCase();
    if (!n) {
      setError("שם שחקן נדרש");
      return;
    }
    if (!c || c.length !== 4) {
      setError("קוד חדר לא תקין");
      return;
    }
    const guestId = getGuestId();
    const params = new URLSearchParams({ name: n, guestId });
    setLocation(`/room/${c}?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Heebo', sans-serif", direction: "rtl" }}>

      {/* ===== NAV ===== */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
            <span className="text-black font-black text-sm">מ</span>
          </div>
          <span className="font-black text-xl tracking-tight">
            מביך <span style={{ color: "#e53e3e" }}>רצח</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40 font-bold">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
          18+ בלבד
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-white/60 mb-8">
                <span>🃏</span>
                <span>משחק קלפים ישראלי 18+</span>
              </div>

              <h1 className="font-black leading-none mb-6" style={{ fontSize: "clamp(3.5rem, 8vw, 6rem)", letterSpacing: "-0.03em" }}>
                מביך<br />
                <span style={{ color: "#e53e3e" }}>רצח</span>
              </h1>

              <p className="text-white/55 font-bold text-lg mb-10 leading-relaxed max-w-md">
                משחק הקלפים שמוכיח שלכולם יש צד אפל. בחרו חבילות, הצחיקו חברים, ותנו לשופט להחליט מי הכי מביך.
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-white/40 text-sm font-bold">
                  <span>👥</span>
                  <span>3–10 שחקנים</span>
                </div>
                <span className="text-white/20">·</span>
                <div className="flex items-center gap-2 text-white/40 text-sm font-bold">
                  <span>⏱️</span>
                  <span>30–90 דקות</span>
                </div>
                <span className="text-white/20">·</span>
                <div className="flex items-center gap-2 text-white/40 text-sm font-bold">
                  <span>🔥</span>
                  <span>18+ בלבד</span>
                </div>
              </div>
            </div>

            {/* Right: Scattered cards */}
            <div className="relative h-80 hidden lg:block">
              {/* Black question card */}
              <div
                className="absolute top-4 right-8 w-52 p-5 rounded-lg border-2 border-white"
                style={{
                  background: "#0a0a0a",
                  transform: "rotate(-4deg)",
                  boxShadow: "8px 8px 0px rgba(255,255,255,0.08)",
                }}
              >
                <div className="text-xs font-black text-white/40 mb-3">שאלה</div>
                <div
                  className="font-black text-white leading-tight"
                  style={{
                    fontSize: "0.85rem",
                    transition: "opacity 0.3s",
                  }}
                >
                  {SAMPLE_QUESTIONS[heroQ]}
                </div>
                <div className="mt-4 text-xs font-black text-white/30">מביך רצח™</div>
              </div>

              {/* White answer cards */}
              {SAMPLE_ANSWERS.slice(0, 4).map((ans, i) => {
                const rotations = [3, -2, 5, -3];
                const tops = [140, 60, 180, 100];
                const rights = [200, 20, 60, 160];
                return (
                  <div
                    key={i}
                    className="absolute w-40 p-4 rounded-lg border-2 border-black"
                    style={{
                      background: "#f5f5f5",
                      transform: `rotate(${rotations[i]}deg)`,
                      top: tops[i],
                      right: rights[i],
                      boxShadow: "5px 5px 0px rgba(0,0,0,0.3)",
                      zIndex: i === 1 ? 10 : 5,
                    }}
                  >
                    <div className="font-black text-black text-sm leading-tight">{ans}</div>
                    <div className="mt-3 text-xs font-black text-black/30">מביך רצח™</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* ===== GAME FORM ===== */}
          <div className="lg:col-span-2">
            <div className="border border-white/15 rounded-xl overflow-hidden" style={{ background: "#0d0d0d" }}>

              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => { setTab("create"); setError(""); }}
                  className="flex-1 py-4 text-sm font-black transition-colors"
                  style={{
                    background: tab === "create" ? "white" : "transparent",
                    color: tab === "create" ? "black" : "rgba(255,255,255,0.4)",
                  }}
                >
                  צור חדר
                </button>
                <button
                  onClick={() => { setTab("join"); setError(""); }}
                  className="flex-1 py-4 text-sm font-black transition-colors"
                  style={{
                    background: tab === "join" ? "white" : "transparent",
                    color: tab === "join" ? "black" : "rgba(255,255,255,0.4)",
                  }}
                >
                  הצטרף לחדר
                </button>
              </div>

              <div className="p-6">
                {tab === "create" ? (
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-white/50 mb-2">שם שחקן</label>
                      <input
                        ref={nameRef}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(""); }}
                        placeholder="מה קוראים לך?"
                        className="game-input"
                        maxLength={20}
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-white/50 mb-2">קוד חדר</label>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 text-center py-3 rounded-md border-2 border-white/30 font-black text-2xl tracking-widest"
                          style={{ background: "rgba(255,255,255,0.04)", letterSpacing: "0.2em" }}
                        >
                          {code}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCode(makeCode()); showToast("קוד חדש נוצר"); }}
                          className="p-3 border border-white/20 rounded-md text-white/50 hover:text-white hover:border-white/40 transition-colors text-lg"
                          title="קוד חדש"
                        >
                          🔄
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="text-red-400 text-sm font-bold">{error}</div>
                    )}

                    <button type="submit" className="btn-primary w-full justify-center text-base py-3">
                      🎮 צור חדר ושחק
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-white/50 mb-2">שם שחקן</label>
                      <input
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(""); }}
                        placeholder="מה קוראים לך?"
                        className="game-input"
                        maxLength={20}
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-white/50 mb-2">קוד חדר</label>
                      <input
                        value={joinCode}
                        onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(""); }}
                        placeholder="XXXX"
                        className="game-input text-center text-2xl tracking-widest"
                        maxLength={4}
                        autoComplete="off"
                        style={{ letterSpacing: "0.2em" }}
                      />
                    </div>

                    {error && (
                      <div className="text-red-400 text-sm font-bold">{error}</div>
                    )}

                    <button type="submit" className="btn-primary w-full justify-center text-base py-3">
                      🚀 הצטרף למשחק
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* ===== PACK SELECTOR ===== */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black text-lg">בחר חבילות</h2>
              <span className="text-xs font-bold text-white/40">
                {selectedPacks.length} נבחרו
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PACK_LIST.map(([id, pack]) => {
                const active = selectedPacks.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => togglePack(id)}
                    className="pack-card text-right"
                    style={{
                      borderColor: active ? "white" : "rgba(255,255,255,0.12)",
                      background: active ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)",
                      boxShadow: active ? "3px 3px 0px rgba(255,255,255,0.1)" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">{pack.emoji}</span>
                      {!pack.free && (
                        <span className="text-xs font-black text-white/30 border border-white/20 rounded px-1">
                          +
                        </span>
                      )}
                      {active && (
                        <span className="text-xs font-black text-white bg-white/20 rounded px-1">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="font-black text-sm text-white mb-1">{pack.name}</div>
                    <div className="text-xs text-white/40 font-bold leading-tight">{pack.tagline}</div>
                    <div className="mt-2 text-xs text-white/25 font-bold">
                      {pack.questions.length} שאלות · {pack.answers.length} תשובות
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW TO PLAY ===== */}
      <section className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-black text-2xl mb-10 text-center">איך משחקים?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: "01", title: "צרו חדר", desc: "בחרו שם, בחרו חבילות ושתפו את הקוד עם החברים.", emoji: "🏠" },
              { n: "02", title: "קבלו קלפים", desc: "כל שחקן מקבל 7 קלפי תשובה לבנים ביד.", emoji: "🃏" },
              { n: "03", title: "ענו על השאלה", desc: "השופט קורא קלף שאלה שחור. כולם בוחרים תשובה.", emoji: "✍️" },
              { n: "04", title: "השופט מחליט", desc: "השופט בוחר את הכי מצחיק. הזוכה מקבל נקודה.", emoji: "👑" },
            ].map((step) => (
              <div key={step.n} className="border border-white/10 rounded-xl p-5" style={{ background: "#0d0d0d" }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{step.emoji}</span>
                  <span className="font-black text-white/20 text-sm">{step.n}</span>
                </div>
                <h3 className="font-black text-base mb-2">{step.title}</h3>
                <p className="text-white/45 text-sm font-bold leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SAMPLE CARDS ===== */}
      <section className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-black text-2xl mb-2 text-center">טעימה מהמשחק</h2>
          <p className="text-white/40 text-sm font-bold text-center mb-10">דוגמאות מהחבילות</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Black question cards */}
            {SAMPLE_QUESTIONS.slice(0, 3).map((q, i) => (
              <div
                key={i}
                className="game-card-black"
                style={{ minHeight: 160, transform: i === 1 ? "rotate(-1deg)" : i === 2 ? "rotate(1deg)" : "none" }}
              >
                <div className="text-xs font-black text-white/40 mb-2">שאלה</div>
                <div className="font-black text-white leading-tight text-sm flex-1">{q}</div>
                <div className="text-xs font-black text-white/25 mt-3">מביך רצח™</div>
              </div>
            ))}

            {/* White answer cards */}
            {SAMPLE_ANSWERS.slice(0, 3).map((a, i) => (
              <div
                key={i}
                className="game-card-white"
                style={{ minHeight: 140, transform: i === 0 ? "rotate(1deg)" : i === 2 ? "rotate(-1deg)" : "none" }}
              >
                <div className="text-xs font-black text-black/40 mb-2">תשובה</div>
                <div className="font-black text-black leading-tight text-sm flex-1">{a}</div>
                <div className="text-xs font-black text-black/25 mt-3">מביך רצח™</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-black text-white/30 text-sm">
            מביך <span style={{ color: "#e53e3e" }}>רצח</span> — 18+ בלבד
          </div>
          <div className="text-white/20 text-xs font-bold">
            לא לקחת אחריות על מה שיצא מהפה
          </div>
        </div>
      </footer>

      {/* ===== TOAST ===== */}
      {toast && <div className="game-toast">{toast}</div>}
    </div>
  );
}
