const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const appUrl = process.env.SMOKE_WEB_URL || "http://localhost:8086/";
const outputDir = path.join(process.cwd(), "dist-web-check");
const screenshotPath = path.join(outputDir, "smoke-after-refactor.png");

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const logs = [];
  page.on("console", (message) => {
    const text = message.text();
    if (!text.includes("Download the React DevTools")) {
      logs.push(`${message.type()}: ${text}`);
    }
  });
  page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));

  await page.goto(appUrl, { waitUntil: "networkidle", timeout: 30000 });
  const title = await page.title();
  const firstText = await page.locator("body").innerText({ timeout: 10000 });
  const labels = ["IA", "Abastecimentos", "Postos", "Veículos", "Resumo"];
  const clicked = [];

  for (const label of labels) {
    const target = page.getByText(label, { exact: true }).last();
    if (await target.count()) {
      await target.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      clicked.push(label);
    }
  }

  const finalText = await page.locator("body").innerText({ timeout: 10000 });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  const result = {
    title,
    clicked,
    hasVisibleAppText: firstText.includes("Resumo") || firstText.includes("Abastecimentos"),
    hasResumo: finalText.includes("Resumo"),
    logCount: logs.length,
    logs: logs.slice(0, 12),
    screenshot: screenshotPath
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.hasVisibleAppText || !result.hasResumo || clicked.length < labels.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
