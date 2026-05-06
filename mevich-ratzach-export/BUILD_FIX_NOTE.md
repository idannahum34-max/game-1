# Build Fix

Fixed Vercel error:

`"makeCode" is not exported by "client/src/lib/gameData.ts"`

Added exports:
- makeCode()
- getGuestId()

These are imported by `client/src/pages/Home.tsx`.
