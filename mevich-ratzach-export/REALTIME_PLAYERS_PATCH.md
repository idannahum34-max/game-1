# Realtime Players Patch

## What was wrong

The lobby displayed stale `rooms.game_state.players`.
When a guest joined, the client also updated `rooms.game_state` using its local state, which could overwrite/delete other players from the lobby.

## What changed

- In lobby, `players` table is now the source of truth.
- `pullRemote()` always merges players from Supabase `players`.
- Guest join only writes to `players`, not to `rooms.game_state`.
- Invite link remains `/room/CODE` without `?host=1`.

## Required Vercel env vars for Vite

VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ENABLE_SUPABASE=true

## If old test rooms are stuck

Run `supabase/reset_test_rooms.sql` in SQL Editor to clear old rooms and players.
