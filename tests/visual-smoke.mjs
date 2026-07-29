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

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("main", { name: /área de trabalho/i }).waitFor();
  await page.locator('main[data-interactive="true"]').waitFor();
  assert.equal(await page.locator(".music-window").count(), 1, `${size.name}: janela de músicas ausente`);
  assert.equal(await page.locator(".memory-window").count(), 1, `${size.name}: janela de memória ausente`);
  assert.equal(await page.locator(".archive-window").count(), 1, `${size.name}: janela de arquivo ausente`);
  assert.equal(await page.locator(".disc-item").count(), 20, `${size.name}: seletor precisa ter 20 músicas`);
  assert.equal(await page.locator(".archive-list button").count(), 20, `${size.name}: arquivo precisa ter 20 memórias`);
  assert.equal(await page.locator(".disc-item .compact-disc img").count(), 20, `${size.name}: CDs personalizados precisam exibir 20 capas`);
  const cornerRadius = await page.locator(".memory-window").evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius));
  assert.ok(cornerRadius >= 6 && cornerRadius <= 14, `${size.name}: cantos precisam ficar entre retos e excessivamente arredondados`);
  const resizeMode = await page.locator(".memory-window").evaluate((element) => getComputedStyle(element).resize);
  assert.equal(resizeMode, "both", `${size.name}: janela principal precisa ser redimensionável nos dois eixos`);
  const discTitleSize = await page.locator(".disc-item strong").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const discArtistSize = await page.locator(".disc-item small").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const dockLabelSize = await page.locator(".desktop-dock strong").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  assert.ok(discTitleSize >= 11, `${size.name}: títulos dos CDs continuam pequenos`);
  assert.ok(discArtistSize >= 9, `${size.name}: artistas dos CDs continuam pequenos`);
  assert.ok(dockLabelSize >= 11, `${size.name}: rótulos inferiores continuam pequenos`);
  assert.equal(await page.locator(".large-disc").count(), 1, `${size.name}: CD grande do tocador ausente`);

  const memoryWindow = page.locator(".memory-window");
  const beforeDrag = await memoryWindow.boundingBox();
  const horizontalBar = await memoryWindow.locator(".window-bar").boundingBox();
  assert.ok(beforeDrag && horizontalBar, `${size.name}: janela principal não pôde ser medida`);
  await page.mouse.move(horizontalBar.x + horizontalBar.width / 2, horizontalBar.y + horizontalBar.height / 2);
  await page.mouse.down();
  await page.mouse.move(horizontalBar.x + horizontalBar.width / 2 + 60, horizontalBar.y + horizontalBar.height / 2, { steps: 5 });
  await page.mouse.up();
  const afterHorizontal = await memoryWindow.boundingBox();
  assert.ok(afterHorizontal && afterHorizontal.x >= beforeDrag.x + 50, `${size.name}: arraste horizontal não funcionou`);
  assert.ok(Math.abs(afterHorizontal.y - beforeDrag.y) <= 2, `${size.name}: arraste horizontal alterou o eixo vertical`);

  const verticalBar = await memoryWindow.locator(".window-bar").boundingBox();
  assert.ok(verticalBar, `${size.name}: barra ficou indisponível após movimento horizontal`);
  await page.mouse.move(verticalBar.x + verticalBar.width / 2, verticalBar.y + verticalBar.height / 2);
  await page.mouse.down();
  await page.mouse.move(verticalBar.x + verticalBar.width / 2, verticalBar.y + verticalBar.height / 2 - 35, { steps: 5 });
  await page.mouse.up();
  const afterVertical = await memoryWindow.boundingBox();
  assert.ok(afterVertical && afterVertical.y <= afterHorizontal.y - 28, `${size.name}: arraste vertical não funcionou`);
  assert.ok(Math.abs(afterVertical.x - afterHorizontal.x) <= 2, `${size.name}: arraste vertical alterou o eixo horizontal`);

  await memoryWindow.getByRole("button", { name: /maximizar/i }).click();
  const maximizedBox = await memoryWindow.boundingBox();
  assert.ok(maximizedBox && maximizedBox.width >= size.width - 20, `${size.name}: maximização não ocupou a largura da tela`);
  assert.ok(maximizedBox && maximizedBox.height >= size.height - 50, `${size.name}: maximização não ocupou a altura da tela`);
  assert.equal(await memoryWindow.evaluate((element) => getComputedStyle(element).resize), "none", `${size.name}: janela maximizada não deve exibir redimensionamento`);
  await memoryWindow.getByRole("button", { name: /restaurar/i }).click();
  assert.equal(await memoryWindow.evaluate((element) => getComputedStyle(element).resize), "both", `${size.name}: restauração não recuperou o redimensionamento`);
  await page.screenshot({ path: fileURLToPath(new URL(`${size.name}-initial.png`, outputDir)), fullPage: false });

  await page.locator(".disc-item").nth(4).click();
  assert.ok((await page.locator("audio").getAttribute("src"))?.includes("memory-05.mp3"), `${size.name}: seleção musical não atualizou`);
  await page.locator(".large-disc img").waitFor();
  assert.ok((await page.locator(".large-disc img").getAttribute("src"))?.includes("memory-05"), `${size.name}: CD grande não acompanhou a música selecionada`);
  if (!(await page.locator(".large-disc").getAttribute("class"))?.includes("is-spinning")) {
    await page.getByRole("button", { name: /tocar/i }).click();
  }
  await page.locator(".large-disc.is-spinning").waitFor();
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
await compact.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await compact.getByRole("heading", { name: /feito para computador/i }).waitFor();
await compact.close();
await browser.close();

assert.deepEqual(failures, [], `Erros no navegador:\n${failures.join("\n")}`);
console.log("Visual desktop: 1280px, 1440px e 1920px aprovados.");
