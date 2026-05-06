# מביך רצח — משחק קלפים ישראלי 18+

משחק הקלפים שמוכיח שלכולם יש צד אפל. בחרו חבילות, הצחיקו חברים, ותנו לשופט להחליט מי הכי מביך.

## 🎮 Features

- **9 חבילות קלפים** עם 200+ קלפים
- **עיצוב Cards Against Humanity** — רקע שחור, קלפים לבנים/שחורים
- **טיפוגרפיה Heebo Black** עברית מלאה RTL
- **זרימת משחק מלאה** — לובי, בחירה, הצבעה, חשיפה, ניקוד
- **אירועי כאוס** — אירועים מיוחדים אקראיים בכל סיבוב
- **תגובות AI שופט** — roasts מצחיקות לכל זוכה
- **localStorage Sync** — משחק מסתנכרן בין כל המכשירים בחדר

## 🚀 Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Run dev server (http://localhost:3000)
pnpm run dev

# Type check
pnpm run check

# Format code
pnpm run format
```

### Production Build

```bash
# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Start production server
NODE_ENV=production pnpm run start
```

## 📦 Tech Stack

- **React 19** + Vite 7
- **TypeScript** 5.6
- **Tailwind CSS 4**
- **shadcn/ui** components
- **Wouter** for client-side routing
- **Express** for static file serving
- **pnpm** package manager

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Connect to Vercel:
   - Go to https://vercel.com
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration
   - Click "Deploy"

3. Vercel will automatically:
   - Run `pnpm install`
   - Run `pnpm run build`
   - Serve from `dist/` directory

### Manual Deployment

```bash
# Build
pnpm run build

# Start server
NODE_ENV=production pnpm run start
```

Server runs on port 3000 (or `$PORT` env variable)

## 📁 Project Structure

```
mevich-ratzach/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities & game data
│   │   ├── contexts/      # React contexts
│   │   ├── App.tsx        # Router
│   │   ├── main.tsx       # Entry point
│   │   └── index.css      # Global styles
│   └── index.html         # HTML template
├── server/                 # Backend (Express)
│   └── index.ts           # Server entry point
├── shared/                 # Shared types & constants
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── vercel.json            # Vercel configuration
└── .npmrc                  # pnpm configuration
```

## 🎯 Game Flow

1. **צור חדר** — בחר שם, בחר חבילות, קבל קוד חדר
2. **הזמן חברים** — שתף את הקוד, הם מצטרפים
3. **התחל משחק** — כל שחקן מקבל 7 קלפים
4. **כל סיבוב** — שופט קורא שאלה, כולם בוחרים תשובה
5. **השופט בוחר** — הכי מצחיק מנצח נקודה
6. **חזור לסיבוב הבא** — עד שמישהו מגיע ל-7 נקודות

## 📝 Card Packs

- **קלאסיק** — הבסיס (25 שאלות, 30 תשובות)
- **ישראלי 100%** — רק מי שגדל כאן יבין (20 שאלות, 30 תשובות)
- **משרד הפחד** — מה שקורה בזום נשאר בזום (15 שאלות, 20 תשובות)
- **מערכות יחסים** — כי כולם עשו את זה (15 שאלות, 20 תשובות)
- **סושיאל מדיה** — 18+ כי האינטרנט מסוכן (15 שאלות, 20 תשובות)
- **משפחה** — כי כל משפחה קצת מוזרה (15 שאלות, 20 תשובות)
- **הומור שחור** — לא לכולם (15 שאלות, 20 תשובות)
- **צבא ישראל** — שלוש שנים של חומר (15 שאלות, 20 תשובות)
- **הייטק** — Startup Nation בלי סינון (15 שאלות, 20 תשובות)

## 🔧 Configuration

### Environment Variables

Optional environment variables (not required for basic functionality):

```bash
# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

### Vercel Configuration

The `vercel.json` file is pre-configured with:
- Build command: `pnpm run build`
- Install command: `pnpm install`
- Output directory: `dist/`
- Node.js runtime: 20.x

## 🐛 Troubleshooting

### Build fails with "index.html not found"
- Make sure `pnpm run build` completes successfully
- Check that `dist/index.html` exists after build

### Server can't find static files
- Verify `dist/` directory exists
- Check that Vite build output is in `dist/` (not `dist/public/`)

### Routes not working on Vercel
- The `vercel.json` file handles client-side routing
- All non-static requests are routed to `index.html`

## 📄 License

MIT

---

**מביך רצח™** — 18+ בלבד

עוד שאלות? תוודא שהבנת את זרימת המשחק ותתחיל לשחק! 🎮
