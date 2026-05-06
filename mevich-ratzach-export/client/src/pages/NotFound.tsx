import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div
      className="min-h-screen bg-black text-white flex items-center justify-center"
      style={{ fontFamily: "'Heebo', sans-serif", direction: "rtl" }}
    >
      <div className="text-center px-6">
        <div className="text-8xl font-black mb-4" style={{ color: "oklch(0.55 0.22 27)" }}>
          404
        </div>
        <h1 className="text-4xl font-black mb-4">הדף לא נמצא</h1>
        <p className="mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          נראה שמישהו שלח אותך ללינק לא נכון. זה מביך.
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn-primary text-base py-3 px-8"
        >
          חזור לדף הבית
        </button>
      </div>
    </div>
  );
}
