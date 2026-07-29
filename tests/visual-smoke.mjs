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
  const welcome = page.locator(".welcome-screen");
  await page.getByRole("heading", { name: /você está pronta para ver o seu presente/i }).waitFor();
  assert.equal(await page.locator("main").getAttribute("inert"), "", `${size.name}: presente precisa ficar inativo durante as boas-vindas`);
  const noButton = page.locator(".welcome-no");
  assert.equal(await noButton.getAttribute("tabindex"), "-1", `${size.name}: botão Não não pode entrar na navegação por teclado`);
  const noBefore = await noButton.boundingBox();
  const yesBefore = await page.getByRole("button", { name: "Sim", exact: true }).boundingBox();
  assert.ok(noBefore && yesBefore, `${size.name}: botões de boas-vindas não puderam ser medidos`);
  assert.ok(noBefore.x >= yesBefore.x + yesBefore.width + 10, `${size.name}: botões Sim e Não estão sobrepostos`);
  await page.mouse.move(noBefore.x - 120, noBefore.y + noBefore.height / 2, { steps: 8 });
  await page.waitForTimeout(180);
  const noAfter = await noButton.boundingBox();
  assert.match((await noButton.getAttribute("style")) ?? "", /left:/, `${size.name}: botão Não não recebeu uma nova posição`);
  assert.ok(noAfter && noAfter.x >= 45 && noAfter.y >= 45 && noAfter.x + noAfter.width <= size.width - 45 && noAfter.y + noAfter.height <= size.height - 45, `${size.name}: botão Não fugiu para fora da área segura`);
  assert.doesNotMatch(await welcome.textContent(), /só existe uma resposta certa/i, `${size.name}: tentativa no Não não alterou a mensagem`);
  await noButton.evaluate((button) => button.click());
  assert.equal(await welcome.isVisible(), true, `${size.name}: botão Não permitiu acessar o presente`);
  await page.getByRole("button", { name: "Sim", exact: true }).click();
  await welcome.waitFor({ state: "detached" });
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
  assert.equal(await page.locator(".desktop-dock button").count(), 7, `${size.name}: dock precisa conter a nova aba de encontro`);

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

  await page.getByRole("button", { name: "Encontro" }).click();
  const dateWindow = page.locator(".date-window");
  await dateWindow.waitFor();
  assert.equal(await dateWindow.locator(".calendar-day").count(), 31, `${size.name}: agosto precisa exibir todos os 31 dias`);
  await dateWindow.getByRole("button", { name: /mês anterior/i }).click();
  assert.match(await dateWindow.locator(".calendar-toolbar strong").textContent(), /julho de 2026/i, `${size.name}: calendário não navegou até julho`);
  assert.equal(await dateWindow.locator(".calendar-day.has-memory").count(), 3, `${size.name}: julho de 2026 precisa exibir três lembranças`);
  await dateWindow.locator('.calendar-day[data-memory-date="2026-07-25"]').hover();
  await dateWindow.locator(".calendar-memory-preview").waitFor();
  assert.match(await dateWindow.locator(".calendar-memory-preview").textContent(), /museu errado/i, `${size.name}: lembrança de 25 de julho não apareceu`);
  await dateWindow.getByRole("button", { name: /próximo mês/i }).click();
  assert.equal(await dateWindow.locator(".calendar-day").count(), 31, `${size.name}: agosto precisa continuar com todos os 31 dias`);
  await dateWindow.locator('.calendar-day[data-day="10"]').click();
  await dateWindow.getByRole("heading", { name: /tem certeza dessa data/i }).waitFor();
  assert.match(await dateWindow.textContent(), /10 de agosto de 2026/i, `${size.name}: confirmação não mostra a data escolhida`);
  await dateWindow.getByRole("button", { name: /sim, tenho certeza/i }).click();
  await dateWindow.getByLabel(/onde você quer ir/i).selectOption({ label: "Restaurante" });
  await dateWindow.getByLabel(/qual é o local/i).fill("Nosso restaurante favorito");
  await dateWindow.getByLabel(/descreva o local/i).fill("Uma mesa tranquila para conversarmos e aproveitarmos a noite.");
  assert.equal(await dateWindow.locator('input[name="Data escolhida"]').inputValue(), "segunda-feira, 10 de agosto de 2026", `${size.name}: formulário não preservou a data confirmada`);
  if (requireFeedback) {
    const dateFeedbackHost = await dateWindow.locator("form").evaluate((form) => new URL(form.action).hostname);
    assert.equal(dateFeedbackHost, "formsubmit.co", `${size.name}: pedido de encontro não está ligado ao e-mail`);
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
