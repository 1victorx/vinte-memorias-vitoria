import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const livingMemoriesConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const livingMemoryBucket = "memory-photos";

export type LivingMemoryRecord = {
  id: string;
  memory_date: string;
  title: string;
  preview: string;
  story: string;
  secret: string | null;
  photo_paths: string[];
  created_at: string;
};

let browserClient: SupabaseClient | null = null;

export function getLivingMemoriesClient() {
  if (!livingMemoriesConfigured) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export function livingPhotoUrl(client: SupabaseClient, path: string) {
  return client.storage.from(livingMemoryBucket).getPublicUrl(path).data.publicUrl;
}

export async function loadLivingMemories(client: SupabaseClient) {
  const { data, error } = await client
    .from("living_memories")
    .select("id,memory_date,title,preview,story,secret,photo_paths,created_at")
    .eq("is_published", true)
    .order("memory_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as LivingMemoryRecord[];
}

export async function sessionCanEdit(client: SupabaseClient, session: Session | null) {
  if (!session?.user.email) return false;
  const { data, error } = await client
    .from("site_editors")
    .select("email")
    .eq("email", session.user.email.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}