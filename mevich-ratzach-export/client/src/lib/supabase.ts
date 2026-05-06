import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const enabled = import.meta.env.VITE_ENABLE_SUPABASE === "true";

export const hasSupabase = Boolean(enabled && url && anon);
export const supabase = hasSupabase ? createClient(url, anon) : null;
