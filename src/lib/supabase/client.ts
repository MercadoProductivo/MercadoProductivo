"use client";
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  // Singleton pattern: reutiliza el cliente si ya existe
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
