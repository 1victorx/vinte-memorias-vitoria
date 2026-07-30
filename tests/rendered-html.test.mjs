import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      IMAGES: {
        input() {
          throw new Error("Image optimization should not run in this test.");
        },
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renderiza a area de trabalho do presente em portugues", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="pt-BR"/i);
  assert.match(html, /<title>20 memórias para Vitória<\/title>/i);
  assert.match(html, /20 memórias/);
  assert.match(html, /VITÓRIA OS/);
  assert.match(html, /welcome-flowers\.webp/);
  assert.match(html, /Aplicativos do presente/);
  assert.match(html, /Nossa música/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
});

test("mantem exatamente vinte capitulos editaveis", async () => {
  const content = await readFile(
    new URL("../app/data/memories.ts", import.meta.url),
    "utf8",
  );
  const ids = [...content.matchAll(/^\s+id:\s+(\d+),$/gm)].map((match) =>
    Number(match[1]),
  );

  assert.deepEqual(
    ids,
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
  assert.match(content, /No Escuro/);
  assert.match(content, /memory-20\.mp3/);
});

test("cadastra todas as datas especiais no calendário", async () => {
  const content = await readFile(
    new URL("../app/data/calendar-memories.ts", import.meta.url),
    "utf8",
  );
  const dates = [...content.matchAll(/^\s+"(\d{4}-\d{2}-\d{2})":/gm)].map(
    (match) => match[1],
  );

  assert.equal(dates.length, 36);
  assert.ok(new Set(dates).size === dates.length);
  assert.ok(dates.includes("2025-06-29"));
  assert.ok(dates.includes("2026-07-25"));
  assert.match(content, /ficamos MUITO bem/);
  assert.match(content, /Nosso primeiro beijo/);
});
test("inclui todas as fotografias e trilhas preparadas", async () => {
  const photoRoot = new URL("../public/media/photos/", import.meta.url);
  const audioRoot = new URL("../public/media/audio/", import.meta.url);
  const photos = (await readdir(photoRoot)).filter((name) =>
    name.endsWith(".jpg"),
  );
  const songs = (await readdir(audioRoot)).filter((name) =>
    name.endsWith(".mp3"),
  );

  assert.equal(photos.length, 46);
  assert.equal(songs.length, 20);

  for (const name of photos) {
    const file = await stat(new URL(name, photoRoot));
    assert.ok(file.size > 5_000, `${name} parece estar vazio ou corrompido`);
  }

  for (const name of songs) {
    const file = await stat(new URL(name, audioRoot));
    assert.ok(file.size > 100_000, `${name} parece estar vazio ou corrompido`);
  }
});

test("remove a interface temporaria e marcadores de trabalho incompleto", async () => {
  const files = [
    "../app/page.tsx",
    "../app/layout.tsx",
    "../app/components/MemoryExperience.tsx",
    "../app/data/memories.ts",
    "../app/globals.css",
  ];

  const content = (
    await Promise.all(
      files.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
    )
  ).join("\n");

  assert.doesNotMatch(content, /\b(?:TODO|FIXME)\b/);
  assert.doesNotMatch(content, /Lorem ipsum/i);
  const previewFiles = await readdir(
    new URL("../app/_sites-preview/", import.meta.url),
  ).catch(() => []);
  assert.deepEqual(previewFiles, []);
  assert.ok(projectRoot);
});

test("inclui a fotografia fornecida e as regras locais do calendário", async () => {
  const component = await readFile(
    new URL("../app/components/MemoryExperience.tsx", import.meta.url),
    "utf8",
  );
  const dateLogic = await readFile(
    new URL("../app/lib/local-date.ts", import.meta.url),
    "utf8",
  );
  const flower = await stat(
    new URL("../public/media/photos/welcome-flowers.webp", import.meta.url),
  );

  assert.ok(flower.size > 100_000 && flower.size < 400_000);
  assert.match(component, /welcome-flowers\.webp/);
  assert.match(component, /music: false, memory: false, archive: false/);
  assert.match(component, /disabled=\{isDisabled\}/);
  assert.match(component, /dateSavingRef\.current/);
  assert.match(component, /encontros-agendados-vitoria/);
  assert.match(dateLogic, /new Date\(year, month - 1, day\)/);
  assert.match(dateLogic, /parsed\.setHours\(0, 0, 0, 0\)/);
  assert.match(dateLogic, /parsed\.getTime\(\) < today\.getTime\(\)/);
});