# תיקון Realtime

מה היה שבור:
1. החדרים נשמרו ב-localStorage, לכן כל מכשיר ראה חדר נפרד.
2. אם פותחים לינק עם ?host=1 בטלפון, הטלפון הופך למארח נוסף.
3. Vite לא קורא NEXT_PUBLIC env vars. צריך VITE_*.

מה תוקן:
- Room.tsx עכשיו משתמש ב-Supabase אם VITE_ENABLE_SUPABASE=true.
- הלובי מסתנכרן דרך rooms + players.
- לינק השיתוף הוא רק /room/CODE בלי ?host=1.
- אורח נכנס בשם ומתווסף כ-Guest.
- נוסף vercel.json עם rewrite ל-SPA.

Environment Variables ב-Vercel:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ENABLE_SUPABASE=true

חשוב:
אם כבר שמת NEXT_PUBLIC_SUPABASE_URL — זה לא מספיק ל-Vite. תוסיף את VITE_SUPABASE_URL.
