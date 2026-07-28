import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const requireFeedback = process.env.REQUIRE_FEEDBACK === "true";
const outputDir = new URL("../test-results/", import.meta.url);

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
});

const sizes = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

const failures = [];

for (const size of sizes) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      pageErrors.push(message.text());
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      pageErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText === "net::ERR_ABORTED") {
      return;
    }
    pageErrors.push(
      `${request.failure()?.errorText ?? "request failed"} ${request.url()}`,
    );
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /20 memórias/i }).waitFor();
  await page.screenshot({
    path: fileURLToPath(new URL(`${size.name}-welcome.png`, outputDir)),
    fullPage: true,
  });

  await page.getByRole("button", { name: /abrir nosso álbum/i }).click();
  await page.getByRole("heading", { name: /os nossos 20 capítulos/i }).waitFor();

  assert.equal(
    await page.locator(".chapter-card").count(),
    20,
    `${size.name}: a central precisa exibir 20 capítulos`,
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.ok(overflow <= 1, `${size.name}: conteúdo vazando ${overflow}px na horizontal`);

  await page.screenshot({
    path: fileURLToPath(new URL(`${size.name}-hub.png`, outputDir)),
    fullPage: true,
  });

  await page.locator(".chapter-card").first().click();
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.getByRole("button", { name: /descobrir/i }).click();
  await page.locator(".secret-message").waitFor();

  await page.goto(`${baseUrl}/#memoria-20`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /abrir a carta/i }).click();
  await page.getByRole("button", { name: /abrir minha carta/i }).click();
  await page.getByRole("textbox", { name: /sua mensagem/i }).waitFor();
  if (requireFeedback) {
    const feedbackHost = await page
      .locator(".response-section form")
      .evaluate((form) => new URL(form.action).hostname);
    assert.equal(
      feedbackHost,
      "formsubmit.co",
      `${size.name}: o envio por e-mail precisa estar configurado`,
    );
  }
  await page.waitForTimeout(400);

  await page.screenshot({
    path: fileURLToPath(new URL(`${size.name}-final.png`, outputDir)),
    fullPage: true,
  });

  if (pageErrors.length > 0) {
    failures.push(`${size.name}: ${pageErrors.join(" | ")}`);
  }

  await context.close();
}

await browser.close();

assert.deepEqual(failures, [], `Erros no navegador:\n${failures.join("\n")}`);
console.log("Visual smoke: 360px, 768px e 1440px aprovados.");
