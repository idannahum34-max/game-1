# מביך רצח — Ultimate Fix

## תיקונים

1. לינקים:
   - נוסף Vercel rewrite ל־/room/CODE וגם fallback ל־index.html.
   - לינק שיתוף נשאר `/room/CODE` בלי `?host=1`.

2. סנכרון:
   - Supabase Realtime נשאר.
   - נוסף polling fallback כל 1 שנייה כדי שלא יהיה צורך ברענון גם אם הדפדפן בטלפון מפספס websocket event.

3. תוכן:
   - 300 שאלות.
   - 1200 תשובות.
   - 10 קטגוריות.
   - כולל קטגוריית טראש 18+ ותוכן בוטה/טראשי אבל בלי ללכת לאלימות/פורנוגרפיה.

4. UI:
   - קלפי תשובה חדשים `answer-card-polished`.
   - עיצוב בהיר, קלפי, כיפי יותר לעין, עם מצב selected.

## Vercel ENV

VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ENABLE_SUPABASE=true

## Supabase

הרץ:
supabase/schema.sql

הפעל Realtime/Publications על:
- rooms
- players

לפני בדיקה נקייה:
supabase/reset.sql
