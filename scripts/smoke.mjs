// A walk through the app in a real browser, against the local stack:
// the pages a visitor lands on, signing in, and the log editor. Run with
// the stack up (npm run dev:local, or the -keep variant):
//
//   npm run smoke            # http://localhost:5173
//   npm run smoke -- <url>   # anywhere else
//
// Read-only: it opens the editor but saves nothing.
import { chromium } from "playwright";

const origin = process.argv[2] ?? "http://localhost:5173";
const steps = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

const step = async (name, run) => {
  try {
    await run();
    steps.push(`ok    ${name}`);
  } catch (error) {
    steps.push(`FAIL  ${name}: ${error.message.split("\n")[0]}`);
  }
};

await step("home renders for a visitor", async () => {
  await page.goto(origin);
  await page.getByRole("heading", { level: 1 }).first().waitFor();
});
await step("the library lists games", async () => {
  await page.goto(`${origin}/library`);
  await page.locator('a[href^="/game/"]').first().waitFor();
});
await step("a game page opens from the library", async () => {
  await page.locator('a[href^="/game/"]').first().click();
  await page.waitForURL(/\/game\/\d+/);
  await page.getByRole("heading", { level: 1 }).first().waitFor();
});
await step("signing in works", async () => {
  await page.goto(origin);
  await page.getByRole("button", { name: "Sign in" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByPlaceholder("you@example.com")
    .fill("tester@playrates.test");
  await dialog.locator('input[type="password"]').fill("playrates-local");
  await dialog.getByRole("button", { name: "Log in" }).click();
  // The saved session: the account menu is a tab on a phone.
  await page.waitForFunction(() =>
    Object.keys(localStorage).some((key) => key.startsWith("sb-")),
  );
});
await step("the log editor opens on a game", async () => {
  await page.goto(`${origin}/library`);
  await page.locator('a[href^="/game/"]').first().click();
  await page.waitForURL(/\/game\/\d+/);
  await page
    // Whichever the game offers: tester has logged some games and not
    // others, and a game logged already offers another platform.
    .getByRole("button", {
      name: /^(Create log|Edit your log|Add a platform)$/,
    })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
});
await step("no uncaught errors on the way", async () => {
  if (errors.length > 0) throw new Error(errors.join("; "));
});

await browser.close();
console.log(steps.join("\n"));
if (steps.some((s) => s.startsWith("FAIL"))) process.exit(1);
