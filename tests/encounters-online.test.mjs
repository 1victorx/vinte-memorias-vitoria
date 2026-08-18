import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sincroniza os encontros pelo Supabase antes de enviar o e-mail", async () => {
  const component = await readFile(
    new URL("../app/components/MemoryExperience.tsx", import.meta.url),
    "utf8",
  );
  const client = await readFile(
    new URL("../app/lib/encounters.ts", import.meta.url),
    "utf8",
  );
  const migration = await readFile(
    new URL("../supabase/migrations/202608110001_online_encounters.sql", import.meta.url),
    "utf8",
  );

  assert.match(component, /await saveOnlineEncounter/);
  assert.match(component, /form\.submit\(\)/);
  assert.ok(component.indexOf("await saveOnlineEncounter") < component.indexOf("form.submit()"));
  assert.match(component, /postgres_changes/);
  assert.match(client, /\.from\("scheduled_encounters"\)/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /encounter_date date primary key/i);
  assert.match(migration, /date '2026-11-02'/);
  assert.match(migration, /supabase_realtime/);
});

test("endurece encontros e remoção de fotos após auditoria", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/202608180001_security_hardening.sql", import.meta.url),
    "utf8",
  );
  const layout = await readFile(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );
  const component = await readFile(
    new URL("../app/components/MemoryExperience.tsx", import.meta.url),
    "utf8",
  );

  assert.match(migration, /enforce_encounter_insert_rate_limit/);
  assert.match(migration, /encounter_rate_limit_exceeded/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(layout, /Content-Security-Policy/);
  assert.match(component, /encounter_rate_limit_exceeded/);
});
