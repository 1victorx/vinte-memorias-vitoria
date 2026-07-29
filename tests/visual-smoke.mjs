import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const requireFeedback = process.env.REQUIRE_FEEDBACK === "true";
const outputDir = new URL("../test-results/", import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const sizes = [
  { name: "desktop-1280", width: 1280, height: 720 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];
const failures = [];

for (const size of sizes) {
  const context = await browser.newContext({ viewport: size, reducedMotion: "reduce" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) pageErrors.push(`${response.status()} ${response.url()}`); });
  page.on("requestfailed", (request) => { if (request.failure()?.errorText !== "net::ERR_ABORTED") pageErrors.push(`${request.failure()?.errorText} ${request.url()}`); });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("main", { name: /área de trabalho/i }).waitFor();
  assert.equal(await page.locator(".music-window").count(), 1, `${size.name}: janela de músicas ausente`);
  assert.equal(await page.locator(".memory-window").count(), 1, `${size.name}: janela de memória ausente`);
  assert.equal(await page.locator(".archive-window").count(), 1, `${size.name}: janela de arquivo ausente`);
  assert.equal(await page.locator(".disc-item").count(), 20, `${size.name}: seletor precisa ter 20 músicas`);
  assert.equal(await page.locator(".archive-list button").count(), 20, `${size.name}: arquivo precisa ter 20 memórias`);
  await page.screenshot({ path: fileURLToPath(new URL(`${size.name}-initial.png`, outputDir)), fullPage: false });

  await page.locator(".disc-item").nth(4).click();
  assert.ok((await page.locator("audio").getAttribute("src"))?.includes("memory-05.mp3"), `${size.name}: seleção musical não atualizou`);
  await page.locator(".archive-list button").nth(19).click();
  await page.getByRole("heading", { name: /até aqui/i }).waitFor();
  await page.getByRole("button", { name: /abrir segredo/i }).click();
  await page.locator(".secret-file.is-open").waitFor();
  await page.getByRole("button", { name: "Carta" }).click();
  await page.locator(".letter-window").waitFor();
  await page.getByRole("button", { name: /responder ao victor/i }).click();
  await page.getByRole("textbox", { name: /para: victor/i }).waitFor();

  if (requireFeedback) {
    const feedbackHost = await page.locator(".response-window form").evaluate((form) => new URL(form.action).hostname);
    assert.equal(feedbackHost, "formsubmit.co", `${size.name}: envio por e-mail não configurado`);
  }

  await page.screenshot({ path: fileURLToPath(new URL(`${size.name}.png`, outputDir)), fullPage: false });
  if (pageErrors.length) failures.push(`${size.name}: ${pageErrors.join(" | ")}`);
  await context.close();
}

const compact = await browser.newPage({ viewport: { width: 900, height: 700 } });
await compact.goto(baseUrl, { waitUntil: "networkidle" });
await compact.getByRole("heading", { name: /feito para computador/i }).waitFor();
await compact.close();
await browser.close();

assert.deepEqual(failures, [], `Erros no navegador:\n${failures.join("\n")}`);
console.log("Visual desktop: 1280px, 1440px e 1920px aprovados.");
