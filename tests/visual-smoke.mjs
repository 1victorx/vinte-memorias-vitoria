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
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1536", width: 1536, height: 864 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];
const failures = [];

function overlaps(a, b) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

async function enterPresent(page, size) {
  const welcome = page.locator(".welcome-screen");
  await page.getByRole("heading", { name: /você está pronta para ver o seu presente/i }).waitFor();
  assert.equal(await page.locator("main").getAttribute("inert"), "", `${size.name}: presente precisa ficar inativo durante as boas-vindas`);
  assert.equal(await page.locator(".gsap-romantic-background").count(), 0, `${size.name}: fundo animado foi montado antes de entrar no presente`);
  const flowerPhoto = page.getByRole("img", { name: /flores cor-de-rosa/i });
  await flowerPhoto.waitFor();
  await flowerPhoto.evaluate((image) => image.decode());
  const photoData = await flowerPhoto.evaluate((image) => ({ src: image.getAttribute("src"), width: image.naturalWidth, height: image.naturalHeight }));
  assert.match(photoData.src ?? "", /welcome-flowers\.webp$/, `${size.name}: a foto de flores fornecida não foi usada`);
  assert.ok(photoData.width >= 800 && photoData.height >= 600 && Math.abs(photoData.width / photoData.height - 4 / 3) < 0.005, `${size.name}: a foto otimizada perdeu resolução ou proporção (${photoData.width}x${photoData.height})`);
  const flowerBounds = await flowerPhoto.boundingBox();
  assert.ok(flowerBounds && flowerBounds.x <= 0 && flowerBounds.y <= 0 && flowerBounds.x + flowerBounds.width >= size.width && flowerBounds.y + flowerBounds.height >= size.height, `${size.name}: a fotografia de flores não cobre toda a tela inicial`);
  assert.equal(await flowerPhoto.evaluate((image) => getComputedStyle(image).objectFit), "cover", `${size.name}: a fotografia de fundo não preserva o enquadramento`);

  await page.locator('main[data-interactive="true"]').waitFor();

  const noButton = page.locator(".welcome-no");
  assert.equal(await noButton.getAttribute("tabindex"), "-1", `${size.name}: botão Não não pode entrar na navegação por teclado`);
  const noBefore = await noButton.boundingBox();
  const yesBefore = await page.getByRole("button", { name: "Sim", exact: true }).boundingBox();
  assert.ok(noBefore && yesBefore, `${size.name}: botões de boas-vindas não puderam ser medidos`);
  assert.equal(overlaps(noBefore, yesBefore), false, `${size.name}: botões Sim e Não estão sobrepostos`);
  const attemptedPointer = { x: noBefore.x + noBefore.width / 2, y: noBefore.y + noBefore.height / 2 };
  await page.mouse.move(attemptedPointer.x, attemptedPointer.y, { steps: 12 });
  await page.waitForTimeout(180);
  const noAfter = await noButton.boundingBox();
  assert.match((await noButton.getAttribute("style")) ?? "", /left:/, `${size.name}: botão Não não recebeu uma nova posição`);
  assert.ok(noAfter && noAfter.x >= 45 && noAfter.y >= 45 && noAfter.x + noAfter.width <= size.width - 45 && noAfter.y + noAfter.height <= size.height - 45, `${size.name}: botão Não fugiu para fora da área segura`);
  assert.equal(noAfter && attemptedPointer.x >= noAfter.x && attemptedPointer.x <= noAfter.x + noAfter.width && attemptedPointer.y >= noAfter.y && attemptedPointer.y <= noAfter.y + noAfter.height, false, `${size.name}: botão Não permaneceu sob o cursor`);
  assert.doesNotMatch(await welcome.textContent(), /só existe uma resposta certa/i, `${size.name}: tentativa no Não não alterou a mensagem`);
  await noButton.evaluate((button) => button.click());
  assert.equal(await welcome.isVisible(), true, `${size.name}: botão Não permitiu acessar o presente`);

  await page.getByRole("button", { name: "Sim", exact: true }).click();
  await welcome.waitFor({ state: "detached" });
  await page.getByRole("main", { name: /área de trabalho/i }).waitFor();
  await page.locator('main[data-interactive="true"]').waitFor();
  assert.equal(await page.locator(".os-window").count(), 0, `${size.name}: alguma janela começou aberta`);
}

for (const size of sizes) {
  const context = await browser.newContext({ viewport: size, reducedMotion: "reduce" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(`console: ${message.text()}`); });
  page.on("response", (response) => { if (response.status() >= 400) pageErrors.push(`${response.status()} ${response.url()}`); });
  page.on("requestfailed", (request) => { if (request.failure()?.errorText !== "net::ERR_ABORTED") pageErrors.push(`${request.failure()?.errorText} ${request.url()}`); });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await enterPresent(page, size);
  await page.screenshot({ path: fileURLToPath(new URL(`${size.name}-closed.png`, outputDir)), fullPage: false });

  const quickPlayer = page.locator(".desktop-quick-player");
  await quickPlayer.waitFor();
  assert.equal(await quickPlayer.isVisible(), true, `${size.name}: tocador rápido não está visível na tela principal`);
  const gsapBackground = page.locator(".gsap-romantic-background");
  await gsapBackground.waitFor();
  const gsapBounds = await gsapBackground.boundingBox();
  assert.ok(gsapBounds && gsapBounds.width >= size.width && gsapBounds.height >= size.height - 30, `${size.name}: fundo GSAP não cobre a área de trabalho`);
  assert.equal(await gsapBackground.getAttribute("data-engine"), "gsap", `${size.name}: fundo animado não está identificado como GSAP`);
  assert.equal(await gsapBackground.locator(".gsap-flower").count(), 6, `${size.name}: flores animadas do fundo estão ausentes`);
  assert.equal(await gsapBackground.locator(".gsap-heart").count(), 8, `${size.name}: corações animados do fundo estão ausentes`);
  const gsapBackdrop = await gsapBackground.evaluate((element) => getComputedStyle(element).backgroundImage);
  assert.notEqual(gsapBackdrop, "none", `${size.name}: fundo GSAP não possui contraste visual de apoio`);
  const stampBounds = await page.locator(".desktop-stamp").boundingBox();
  const wallpaperBounds = await page.locator(".wallpaper").boundingBox();
  assert.ok(stampBounds && wallpaperBounds && Math.abs(stampBounds.x + stampBounds.width / 2 - (wallpaperBounds.x + wallpaperBounds.width / 2)) <= 2, `${size.name}: selo V + V não está centralizado horizontalmente`);
  assert.ok(stampBounds && wallpaperBounds && Math.abs(stampBounds.y + stampBounds.height / 2 - (wallpaperBounds.y + wallpaperBounds.height / 2)) <= 2, `${size.name}: selo V + V não está centralizado verticalmente`);
  const quickPlayerBounds = await quickPlayer.boundingBox();
  const dockBounds = await page.locator(".desktop-dock").boundingBox();
  const progressBounds = await quickPlayer.locator(".quick-player-progress").boundingBox();
  const optionsBounds = await quickPlayer.locator(".quick-player-options").boundingBox();
  assert.ok(quickPlayerBounds && dockBounds && quickPlayerBounds.y + quickPlayerBounds.height < dockBounds.y, `${size.name}: player rápido está sobreposto ao dock`);
  assert.ok(progressBounds && optionsBounds && progressBounds.y + progressBounds.height < optionsBounds.y, `${size.name}: progresso e volume estão sobrepostos`);
  const quickVolume = quickPlayer.getByRole("slider", { name: /volume do tocador rápido/i });
  assert.equal(await quickVolume.inputValue(), "0.72", `${size.name}: volume inicial do tocador rápido está incorreto`);
  await quickPlayer.getByRole("button", { name: /silenciar música/i }).click();
  assert.equal(await quickVolume.inputValue(), "0", `${size.name}: botão de volume não silenciou o áudio`);
  await quickPlayer.getByRole("button", { name: /ativar som/i }).click();
  assert.notEqual(await quickVolume.inputValue(), "0", `${size.name}: botão de volume não restaurou o áudio`);
  assert.equal(await quickPlayer.getByRole("button", { name: /próxima música/i }).count(), 1, `${size.name}: tocador rápido não permite trocar a faixa`);
  assert.equal(await page.getByRole("button", { name: "Carta", exact: true }).count(), 0, `${size.name}: a carta ainda aparece na navegação`);
  await quickPlayer.getByRole("button", { name: /próxima música/i }).click();
  await page.waitForFunction(() => document.querySelector("audio")?.getAttribute("src")?.includes("memory-02.mp3"));
  assert.equal(await page.locator(".music-window").count(), 0, `${size.name}: o tocador rápido abriu a janela de músicas sem pedido`);
  await quickPlayer.getByRole("button", { name: /música anterior/i }).click();
  const shuffleButton = quickPlayer.getByRole("button", { name: /ativar músicas aleatórias/i });
  await shuffleButton.click();
  assert.equal(await shuffleButton.getAttribute("aria-pressed"), "true", `${size.name}: modo aleatório não foi ativado`);
  const songBeforeShuffle = await page.locator("audio").getAttribute("src");
  await quickPlayer.getByRole("button", { name: /próxima música/i }).click();
  await page.waitForFunction((previous) => document.querySelector("audio")?.getAttribute("src") !== previous, songBeforeShuffle);
  await quickPlayer.getByRole("button", { name: /desativar músicas aleatórias/i }).click();

  assert.equal(await page.getByText("20 memórias com o meu amor!", { exact: true }).count(), 1, `${size.name}: cabeçalho novo não foi aplicado`);
  assert.equal(await page.getByText("VITÓRIA OS", { exact: true }).count(), 0, `${size.name}: nome antigo ainda aparece`);

  const quickPlayerBeforeDrag = await quickPlayer.boundingBox();
  const quickPlayerHandle = quickPlayer.getByRole("button", { name: /mover tocador rápido/i });
  const quickHandleBox = await quickPlayerHandle.boundingBox();
  assert.ok(quickPlayerBeforeDrag && quickHandleBox, `${size.name}: alça do player não pôde ser medida`);
  await page.mouse.move(quickHandleBox.x + quickHandleBox.width / 2, quickHandleBox.y + quickHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(quickHandleBox.x + quickHandleBox.width / 2 - 70, quickHandleBox.y + quickHandleBox.height / 2 - 45, { steps: 5 });
  await page.mouse.up();
  const quickPlayerAfterDrag = await quickPlayer.boundingBox();
  assert.ok(quickPlayerAfterDrag && quickPlayerAfterDrag.x <= quickPlayerBeforeDrag.x - 60 && quickPlayerAfterDrag.y <= quickPlayerBeforeDrag.y - 35, `${size.name}: player rápido não se move livremente`);
  await quickPlayerHandle.dblclick();

  const ourSongButton = page.locator(".desktop-dock").getByRole("button", { name: "Nossa música", exact: true });
  await ourSongButton.click();
  await page.waitForFunction(() => document.querySelector("audio")?.getAttribute("src")?.includes("memory-05.mp3"));
  assert.equal(await page.locator(".music-window").count(), 0, `${size.name}: Nossa música abriu a lista de CDs`);
  await quickPlayer.locator(".quick-player-disc.is-spinning").waitFor();

  const responderButton = page.locator(".desktop-dock").getByRole("button", { name: "Responder", exact: true });
  await responderButton.hover();
  assert.equal(await responderButton.evaluate((button) => getComputedStyle(button).transform), "none", `${size.name}: relevo do dock ainda desloca o bloco inteiro`);

  const appChecks = [
    ["Músicas", ".music-window"],
    ["Memória", ".memory-window"],
    ["Arquivo", ".archive-window"],
    ["Nova memória", ".new-memory-window"],
    ["Responder", ".response-window"],
    ["Encontro", ".date-window"],
  ];
  for (const [label, selector] of appChecks) {
    const dockButton = page.locator(".desktop-dock").getByRole("button", { name: label, exact: true });
    await dockButton.focus();
    await page.keyboard.press("Enter");
    const appWindow = page.locator(selector);
    await appWindow.waitFor();
    assert.equal(await dockButton.getAttribute("aria-pressed"), "true", `${size.name}: ${label} não indicou que a janela foi aberta`);
    await dockButton.focus();
    await page.keyboard.press("Enter");
    await appWindow.waitFor({ state: "detached" });
    assert.equal(await dockButton.getAttribute("aria-pressed"), "false", `${size.name}: ${label} não indicou que a janela foi fechada`);
  }
  assert.equal(await page.locator(".os-window").count(), 0, `${size.name}: uma janela permaneceu aberta após o fechamento`);

  await page.locator(".desktop-dock").getByRole("button", { name: "Músicas", exact: true }).click();
  await page.locator(".desktop-dock").getByRole("button", { name: "Memória", exact: true }).click();
  await page.locator(".desktop-dock").getByRole("button", { name: "Arquivo", exact: true }).click();
  assert.equal(await page.locator(".disc-item").count(), 20, `${size.name}: seletor precisa ter 20 músicas`);
  assert.equal(await page.locator(".archive-list button").count(), 20, `${size.name}: arquivo precisa ter 20 memórias`);
  assert.equal(await page.locator(".disc-item .compact-disc img").count(), 20, `${size.name}: CDs personalizados precisam exibir 20 capas`);
  assert.equal(await page.locator(".disc-item .compact-disc img").first().getAttribute("src").then((src) => src?.includes("/media/thumbs/")), true, `${size.name}: CDs ainda carregam fotografias grandes`);
  assert.equal(await page.locator(".archive-thumb img").first().getAttribute("src").then((src) => src?.includes("/media/thumbs/")), true, `${size.name}: arquivo ainda carrega fotografias grandes`);
  const cornerRadius = await page.locator(".memory-window").evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius));
  assert.ok(cornerRadius >= 6 && cornerRadius <= 14, `${size.name}: cantos precisam ficar entre retos e excessivamente arredondados`);
  assert.equal(await page.locator(".memory-window").evaluate((element) => getComputedStyle(element).resize), "both", `${size.name}: janela principal precisa ser redimensionável nos dois eixos`);
  const dockLabelSize = await page.locator(".desktop-dock strong").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  assert.ok(dockLabelSize >= 11, `${size.name}: rótulos inferiores continuam pequenos`);
  assert.equal(await page.locator(".large-disc").count(), 1, `${size.name}: CD grande do tocador ausente`);
  assert.equal(await page.locator(".desktop-dock button").count(), 7, `${size.name}: dock precisa exibir as sete funções do presente`);

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
  const verticalBar = await memoryWindow.locator(".window-bar").boundingBox();
  await page.mouse.move(verticalBar.x + verticalBar.width / 2, verticalBar.y + verticalBar.height / 2);
  await page.mouse.down();
  await page.mouse.move(verticalBar.x + verticalBar.width / 2, verticalBar.y + verticalBar.height / 2 - 35, { steps: 5 });
  await page.mouse.up();
  const afterVertical = await memoryWindow.boundingBox();
  assert.ok(afterVertical && afterVertical.y <= afterHorizontal.y - 28, `${size.name}: arraste vertical não funcionou`);

  await memoryWindow.getByRole("button", { name: /maximizar/i }).click();
  const maximizedBox = await memoryWindow.boundingBox();
  assert.ok(maximizedBox && maximizedBox.width >= size.width - 20 && maximizedBox.height >= size.height - 50, `${size.name}: maximização não ocupou a tela`);
  await memoryWindow.getByRole("button", { name: /restaurar/i }).click();

  await page.locator(".disc-item").nth(4).click();
  assert.ok((await page.locator("audio").getAttribute("src"))?.includes("memory-05.mp3"), `${size.name}: seleção musical não atualizou`);
  assert.ok((await page.locator(".large-disc img").getAttribute("src"))?.includes("memory-05"), `${size.name}: CD grande não acompanhou a música`);
  await page.locator(".archive-list button").nth(19).click();
  await page.getByRole("heading", { name: /até aqui/i }).waitFor();

  if (requireFeedback) {
    await page.locator(".desktop-dock").getByRole("button", { name: "Responder", exact: true }).click();
    const feedbackHost = await page.locator(".response-window form").evaluate((form) => new URL(form.action).hostname);
    assert.equal(feedbackHost, "formsubmit.co", `${size.name}: envio por e-mail não configurado`);
  }

  await page.locator(".desktop-dock").getByRole("button", { name: "Encontro", exact: true }).click();
  const dateWindow = page.locator(".date-window");
  await dateWindow.waitFor();
  assert.equal(await dateWindow.locator(".calendar-day").count(), 31, `${size.name}: agosto precisa exibir todos os 31 dias`);
  const browserToday = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const todayButton = dateWindow.locator(`.calendar-day[data-date="${browserToday}"]`);
  assert.ok((await todayButton.getAttribute("class"))?.includes("is-today"), `${size.name}: dia atual não está identificado`);
  assert.equal(await todayButton.isDisabled(), false, `${size.name}: data atual deveria continuar disponível`);
  await dateWindow.getByRole("button", { name: /mês anterior/i }).click();
  assert.match(await dateWindow.locator(".calendar-toolbar strong").textContent(), /julho de 2026/i, `${size.name}: calendário não navegou até julho`);
  assert.equal(await dateWindow.locator(".calendar-day.has-memory").count(), 3, `${size.name}: julho precisa exibir três lembranças`);
  assert.equal(await dateWindow.locator('.calendar-day[data-date="2026-07-26"]').isDisabled(), false, `${size.name}: data passada vazia precisa permitir registrar um encontro vivido`);

  const livedDay = dateWindow.locator('.calendar-day[data-memory-date="2026-07-25"]');
  await livedDay.hover();
  await dateWindow.locator(".calendar-memory-preview").waitFor();
  assert.match(await dateWindow.locator(".calendar-memory-preview").textContent(), /museu errado/i, `${size.name}: prévia da lembrança não apareceu`);
  await livedDay.focus();
  await livedDay.click();
  await dateWindow.locator(".date-record").waitFor();
  assert.equal(await dateWindow.locator(".date-details").count(), 0, `${size.name}: encontro passado abriu formulário de criação`);
  assert.match(await dateWindow.locator(".date-record").textContent(), /museu errado/i, `${size.name}: encontro passado não mostrou sua descrição`);
  await page.keyboard.press("Escape");
  await dateWindow.locator(".calendar-grid").waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-date")), "2026-07-25", `${size.name}: foco não voltou ao dia consultado`);

  if (!requireFeedback) {
    const emptyPastDay = dateWindow.locator('.calendar-day[data-date="2026-07-26"]');
    await emptyPastDay.click();
    await dateWindow.getByRole("heading", { name: /guardar o que aconteceu/i }).waitFor();
    await dateWindow.getByRole("button", { name: /sim, tenho certeza/i }).click();
    await dateWindow.getByLabel(/que tipo de encontro foi/i).selectOption({ label: "Cinema" });
    await dateWindow.getByLabel(/onde nós fomos/i).fill("Cinema do shopping");
    await dateWindow.getByLabel(/conte o que aconteceu/i).fill("Assistimos a um filme e guardamos mais um dia bonito.");
    await dateWindow.getByRole("button", { name: /guardar esta lembrança/i }).click();
    await dateWindow.locator(".date-record").waitFor();
    assert.match(await dateWindow.locator(".date-record").textContent(), /encontro vivido/i, `${size.name}: encontro passado foi salvo como agendamento futuro`);
    await dateWindow.getByRole("button", { name: /voltar ao calendário/i }).click();
    assert.ok((await emptyPastDay.getAttribute("class"))?.includes("has-memory"), `${size.name}: encontro vivido não foi marcado no calendário`);
  }

  await dateWindow.getByRole("button", { name: /próximo mês/i }).click();
  const futureDay = dateWindow.locator('.calendar-day[data-date="2026-08-10"]');
  await futureDay.click();
  await dateWindow.getByRole("heading", { name: /tem certeza dessa data/i }).waitFor();
  await dateWindow.getByRole("button", { name: /sim, tenho certeza/i }).click();
  await dateWindow.getByLabel(/onde você quer ir/i).selectOption({ label: "Restaurante" });
  await dateWindow.getByLabel(/qual é o local/i).fill("Nosso restaurante favorito");
  await dateWindow.getByLabel(/descreva o local/i).fill("Uma mesa tranquila para conversarmos e aproveitarmos a noite.");
  assert.equal(await dateWindow.locator('input[name="Data escolhida"]').inputValue(), "segunda-feira, 10 de agosto de 2026", `${size.name}: formulário não preservou a data`);

  if (requireFeedback) {
    const dateFeedbackHost = await dateWindow.locator("form").evaluate((form) => new URL(form.action).hostname);
    assert.equal(dateFeedbackHost, "formsubmit.co", `${size.name}: pedido de encontro não está ligado ao e-mail`);
  } else {
    await dateWindow.locator("form").evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
    await dateWindow.locator(".date-record").waitFor();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("encontros-agendados-vitoria") ?? "{}"));
    assert.deepEqual(Object.keys(stored).sort(), ["2026-07-26", "2026-08-10"], `${size.name}: cliques repetidos duplicaram o encontro`);
    await dateWindow.getByRole("button", { name: /voltar ao calendário/i }).click();
    assert.ok((await futureDay.getAttribute("class"))?.includes("has-scheduled"), `${size.name}: calendário não atualizou após salvar`);
    await futureDay.click();
    assert.equal(await dateWindow.locator("form").count(), 0, `${size.name}: encontro futuro existente abriu nova criação`);
    assert.match(await dateWindow.locator(".date-record").textContent(), /nosso restaurante favorito/i, `${size.name}: encontro futuro não mostrou os detalhes`);
  }

  const dateBounds = await dateWindow.boundingBox();
  assert.ok(dateBounds && dateBounds.x >= 0 && dateBounds.y >= 0 && dateBounds.x + dateBounds.width <= size.width && dateBounds.y + dateBounds.height <= size.height, `${size.name}: calendário ultrapassou a área visível`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${size.name}: existe rolagem horizontal indevida`);
  await page.screenshot({ path: fileURLToPath(new URL(`${size.name}.png`, outputDir)), fullPage: false });
  if (pageErrors.length) failures.push(`${size.name}: ${pageErrors.join(" | ")}`);
  await context.close();
}

for (const size of [
  { name: "zoom-125-effective", width: 1093, height: 614 },
  { name: "zoom-150-effective", width: 910, height: 512 },
]) {
  const context = await browser.newContext({ viewport: size, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const card = page.locator(".welcome-card");
  await card.waitFor();
  const cardBounds = await card.boundingBox();
  assert.ok(cardBounds && cardBounds.x >= 0 && cardBounds.y >= 0 && cardBounds.x + cardBounds.width <= size.width && cardBounds.y + cardBounds.height <= size.height, `${size.name}: boas-vindas ultrapassaram a tela`);
  const zoomYesButton = page.getByRole("button", { name: "Sim", exact: true });
  await page.locator('main[data-interactive="true"]').waitFor();
  await zoomYesButton.evaluate((button) => button.click());
  await page.locator(".welcome-screen").waitFor({ state: "detached" });
  assert.equal(await page.locator(".os-window").count(), 0, `${size.name}: janela começou aberta`);
  await page.locator(".desktop-dock").getByRole("button", { name: "Encontro", exact: true }).click();
  const dateWindow = page.locator(".date-window");
  const bounds = await dateWindow.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= size.width && bounds.y + bounds.height <= size.height, `${size.name}: calendário não cabe com zoom ampliado`);
  await dateWindow.getByRole("button", { name: /fechar/i }).click();
  await page.locator(".desktop-dock").getByRole("button", { name: "Nova memória", exact: true }).click();
  const newMemoryBounds = await page.locator(".new-memory-window").boundingBox();
  assert.ok(newMemoryBounds && newMemoryBounds.x >= 0 && newMemoryBounds.y >= 0 && newMemoryBounds.x + newMemoryBounds.width <= size.width && newMemoryBounds.y + newMemoryBounds.height <= size.height, `${size.name}: nova memória não cabe com zoom ampliado`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${size.name}: zoom causou rolagem horizontal`);
  await page.screenshot({ path: fileURLToPath(new URL(`${size.name}.png`, outputDir)), fullPage: false });
  await context.close();
}

const motionContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "no-preference" });
const motionPage = await motionContext.newPage();
await motionPage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await motionPage.locator('main[data-interactive="true"]').waitFor();
await motionPage.getByRole("button", { name: "Sim", exact: true }).click();
await motionPage.locator(".welcome-screen").waitFor({ state: "detached" });
await motionPage.locator('.gsap-romantic-background[data-motion-ready="true"]').waitFor();
const animatedFlowers = motionPage.locator(".gsap-flower");
assert.equal(await animatedFlowers.count(), 6, "Cenário GSAP não carregou as seis flores");
const animatedFlower = animatedFlowers.first();
const transformBefore = await animatedFlower.evaluate((element) => getComputedStyle(element).transform);
await motionPage.waitForTimeout(700);
const transformAfter = await animatedFlower.evaluate((element) => getComputedStyle(element).transform);
assert.notEqual(transformAfter, transformBefore, "GSAP não movimentou as flores quando animações estão permitidas");
await motionContext.close();
const narrowContext = await browser.newContext({ viewport: { width: 860, height: 700 } });
const narrowPage = await narrowContext.newPage();
await narrowPage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await narrowPage.getByRole("heading", { name: /feito para computador/i }).waitFor();
await narrowContext.close();
await browser.close();

assert.deepEqual(failures, [], `Erros no navegador:\n${failures.join("\n")}`);
console.log("Visual desktop aprovado em 1366x768, 1440x900, 1536x864, 1920x1080 e equivalentes de zoom 125%/150%.");