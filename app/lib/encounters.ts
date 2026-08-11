import type { SupabaseClient } from "@supabase/supabase-js";

export type OnlineEncounterRecord = {
  encounter_date: string;
  kind: "lived" | "planned";
  outing: string;
  place: string;
  description: string;
  roulette_idea: string | null;
  created_at: string;
};

const encounterColumns = "encounter_date,kind,outing,place,description,roulette_idea,created_at";

export async function loadOnlineEncounters(client: SupabaseClient) {
  const { data, error } = await client
    .from("scheduled_encounters")
    .select(encounterColumns)
    .order("encounter_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OnlineEncounterRecord[];
}

export async function saveOnlineEncounter(
  client: SupabaseClient,
  encounter: Omit<OnlineEncounterRecord, "created_at">,
) {
  const { data, error } = await client
    .from("scheduled_encounters")
    .insert(encounter)
    .select(encounterColumns)
    .single();

  if (error) throw error;
  return data as OnlineEncounterRecord;
}
