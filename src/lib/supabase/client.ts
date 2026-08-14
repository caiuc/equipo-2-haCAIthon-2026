import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@shared/database.types";

export type BrowserSupabase = SupabaseClient<Database>;

let browserClient: BrowserSupabase | null | undefined;

export function getSupabaseBrowserClient(): BrowserSupabase | null {
  if (browserClient !== undefined) return browserClient;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    "";
  if (!url || !key || key.includes("xxxx")) {
    browserClient = null;
    return browserClient;
  }
  browserClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return browserClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseBrowserClient() !== null;
}
