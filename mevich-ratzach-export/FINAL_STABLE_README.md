# מביך רצח — Final Stable Multiplayer

זו חבילה נקייה ויציבה יותר, לא טלאי על טלאי.

## מה תוקן

- Vercel Vite SPA rewrite.
- npm במקום pnpm lockfile.
- משתני סביבה נכונים ל־Vite:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_ENABLE_SUPABASE=true
- לובי מסתנכרן מול טבלת players.
- חדר נשמר בטבלת rooms.
- אורח לא הופך למארח.
- לינק שיתוף הוא `/room/CODE` בלי `?host=1`.
- השחקנים הם state נפרד מה־game state כדי לא לדרוס לובי.
- נוספו schema.sql ו־reset.sql.

## התקנה ל־Vercel

1. תעלה את החבילה הזאת ל־GitHub.
2. ב־Vercel שים Environment Variables:

```txt
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ENABLE_SUPABASE=true
```

3. Redeploy.

## Supabase חדש

SQL Editor → תריץ:

`supabase/schema.sql`

ואחר כך Realtime/Publications:
להוסיף את הטבלאות:
- rooms
- players

## לפני בדיקה חדשה

כדי לנקות חדרים ישנים:
SQL Editor → תריץ:

`supabase/reset.sql`

## בדיקה

1. מחשב: פתח חדר.
2. מחשב: העתק קישור.
3. טלפון: פתח את אותו קישור.
4. טלפון: הכנס שם.
5. מחשב: צריך לראות את השחקן בלובי.
6. התחל משחק.
7. כל שחקן צריך לראות יד של 7 קלפים.
