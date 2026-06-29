#!/usr/bin/env node
/**
 * ODRÉ GANGWON 설문용 스크린샷 8장 캡처
 * Usage: npm run capture:survey-screenshots
 * Requires: dev server on BASE_URL (default http://127.0.0.1:3000)
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../docs/survey/screenshots");
const BASE_URL = process.env.SURVEY_CAPTURE_URL ?? "http://127.0.0.1:3002";
const VIEWPORT = { width: 430, height: 860 };

const ONBOARDING_KEY = "odre-onboarded";

async function waitForServer(url, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok || res.status === 405) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `Dev server not reachable at ${url}. Run:\n  NEXT_PUBLIC_SHOW_PITCH_DEMO=true npm run build\n  PORT=3002 NEXT_PUBLIC_SHOW_PITCH_DEMO=true npm run start\n  SURVEY_CAPTURE_URL=http://127.0.0.1:3002 npm run capture:survey-screenshots`,
  );
}

async function skipOnboarding(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const startButton = page.getByRole("button", { name: /시작하기/ });
  if (await startButton.isVisible().catch(() => false)) {
    await startButton.click();
  } else {
    await page.evaluate((key) => {
      sessionStorage.setItem(key, "1");
    }, ONBOARDING_KEY);
    await page.reload({ waitUntil: "domcontentloaded" });
  }

  await page.waitForFunction(
    () => document.querySelector("nav button") !== null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(800);
}

async function shot(page, name) {
  const frame = page.locator(".max-w-\\[430px\\]").first();
  await frame.waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({
    path: path.join(OUT_DIR, name),
    type: "png",
    animations: "disabled",
    clip: await frame.boundingBox(),
  });
  console.log(`  ✓ ${name}`);
}

async function clickNav(page, label) {
  await page.locator("nav").getByRole("button", { name: label }).click();
  await page.waitForTimeout(600);
}

async function advanceWizard(page, targetStep = 4) {
  await page.getByRole("button", { name: "AI 계획" }).click();
  await page.waitForTimeout(800);
  for (let i = 1; i < targetStep; i += 1) {
    const next = page.getByRole("button", { name: "다음" });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(400);
    }
  }
}

async function completeWizardToTripPlaces(page) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (await page.getByRole("button", { name: /식당 추천으로 이동/ }).isVisible().catch(() => false)) {
      return;
    }
    const generate = page.getByRole("button", { name: "맞춤 일정 생성" });
    if (await generate.isVisible().catch(() => false)) {
      await generate.click();
    } else {
      const next = page.getByRole("button", { name: "다음" });
      if (await next.isVisible().catch(() => false)) {
        await next.click();
      }
    }
    await page.waitForTimeout(600);
  }

  throw new Error("장소 선택(trip-places) 화면에 도달하지 못했습니다.");
}

async function capturePlaceCardsScreen(page) {
  const search = page.getByPlaceholder(/장소 이름·키워드/);
  await search.fill("삼척해상케이블카");
  await page.waitForTimeout(2500);

  const cableCard = page.getByRole("button", { name: /삼척해상케이블카/ }).first();
  await cableCard.waitFor({ state: "visible", timeout: 20000 });

  await page
    .waitForFunction(
      () => {
        const imgs = [...document.querySelectorAll("img")];
        return imgs.some((img) => img.naturalWidth > 80);
      },
      { timeout: 15000 },
    )
    .catch(() => {});

  await cableCard.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const scrollRoot = document.querySelector(".overflow-y-auto");
    if (scrollRoot) scrollRoot.scrollTop = Math.max(0, scrollRoot.scrollTop - 24);
  });
  await cableCard.getByRole("button", { name: "꼭 갈래요", exact: true }).click({ force: true });
  await page.waitForTimeout(500);
  await shot(page, "03-place-cards.png");
}


async function appScroll(page) {
  return page.locator(".overflow-y-auto").first();
}

async function scrollAppTo(page, top) {
  const scroller = await appScroll(page);
  await scroller.evaluate((el, value) => {
    el.scrollTop = value;
  }, top);
  await page.waitForTimeout(450);
}

async function runPitchDemo(page) {
  const cta = page.getByRole("button", { name: "피치 데모 일정 만들기" });
  await cta.waitFor({ state: "visible", timeout: 15000 });
  await cta.click();

  await page.waitForSelector("text=추천일정", { timeout: 120000 }).catch(async () => {
    await page.waitForSelector("h1", { timeout: 120000 });
  });

  await page
    .waitForResponse(
      (response) =>
        response.url().includes("/api/ai/itinerary") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 120000 },
    )
    .catch(() => {});

  await page
    .waitForResponse(
      (response) => response.url().includes("enrich-routes") && response.ok(),
      { timeout: 90000 },
    )
    .catch(() => {});

  await page
    .waitForResponse(
      (response) => response.url().includes("/api/ai/itinerary/enrich") && response.ok(),
      { timeout: 60000 },
    )
    .catch(() => {});

  await page.waitForTimeout(2500);
}

/** 04: 날짜별 일정 타임라인(장소 카드·이동·혼잡) */
async function captureItineraryTimeline(page) {
  const timelineStop = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { level: 3, name: /환선굴|삼척해상케이블카/ }) })
    .first();

  await timelineStop.waitFor({ state: "visible", timeout: 60000 });
  await timelineStop.scrollIntoViewIfNeeded();

  const scroller = await appScroll(page);
  await scroller.evaluate((el) => {
    el.scrollTop = Math.min(el.scrollTop + 100, el.scrollHeight);
  });
  await page.waitForTimeout(800);

  await page
    .locator("article")
    .filter({ hasText: /예약 필요|제휴|혼잡/ })
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});

  await shot(page, "04-itinerary.png");
}

/** 05: 지도 + 방문 순서·경로 (상단 RoutePreview) */
async function captureMapRoute(page) {
  await scrollAppTo(page, 0);

  const mapCanvas = page.locator(".overflow-y-auto canvas").first();
  const hasCanvas = await mapCanvas
    .waitFor({ state: "visible", timeout: 35000 })
    .then(() => true)
    .catch(() => false);

  if (!hasCanvas) {
    const mapFallback = page.locator(".h-52").first();
    await mapFallback.scrollIntoViewIfNeeded().catch(() => {});
  }

  await page.waitForTimeout(hasCanvas ? 3000 : 1000);
  await shot(page, "05-map-route.png");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Capturing survey screenshots → ${OUT_DIR}`);
  await waitForServer(BASE_URL);

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    permissions: ["geolocation"],
    geolocation: { latitude: 37.38, longitude: 129.17 },
  });
  const page = await context.newPage();

  try {
    await skipOnboarding(page);
    await shot(page, "01-home-zone.png");

    await advanceWizard(page, 4);
    await shot(page, "02-plan-wizard.png");

    await completeWizardToTripPlaces(page);
    await capturePlaceCardsScreen(page);

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate((key) => sessionStorage.setItem(key, "1"), ONBOARDING_KEY);
    await page.reload({ waitUntil: "domcontentloaded" });
    await runPitchDemo(page);
    await captureItineraryTimeline(page);
    await captureMapRoute(page);

    await clickNav(page, "예약");
    await page.waitForTimeout(1000);
    await shot(page, "06-reservation.png");

    await clickNav(page, "케어");
    await page.waitForTimeout(1000);
    await shot(page, "07-care.png");

    await clickNav(page, "뉴스레터");
    await page.waitForTimeout(1000);
    await shot(page, "08-regional.png");

    console.log("\nDone. Upload images from docs/survey/screenshots/ to Google Forms.");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
