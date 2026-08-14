import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@shared/database.types";

export type AppSupabase = SupabaseClient<Database>;

export function getSupabase(): AppSupabase | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key || key.includes("xxxx")) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function apiBase(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
