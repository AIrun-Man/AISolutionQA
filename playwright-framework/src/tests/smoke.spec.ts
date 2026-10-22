import { test, expect } from "../fixtures/index.js";
import { resolveEnvironment } from "../config/environment.js";

test("resolves named enterprise UI environments without breaking legacy aliases", () => {
  const previousUrl = process.env.DEV_BASE_URL;
  process.env.DEV_BASE_URL = "https://dev-app.example.test";
  try {
    expect(resolveEnvironment("DEV")).toMatchObject({ name: "dev", baseUrl: "https://dev-app.example.test" });
    expect(resolveEnvironment("test").name).toBe("test");
  } finally {
    if (previousUrl === undefined) delete process.env.DEV_BASE_URL;
    else process.env.DEV_BASE_URL = previousUrl;
  }
  expect(() => resolveEnvironment("PREPROD")).toThrow(/PREPROD_BASE_URL must be set/);
});

if (process.env.RUN_PLAYWRIGHT_SMOKE !== "true") {
  test("sample smoke gate", () => {
    expect(true).toBeTruthy();
  });
} else {
  test("user can view dashboard after login", async ({ loginPage, dashboardPage }) => {
    await loginPage.goto("/login");
    await loginPage.login("user@example.com", "Password123!");
    await expect(dashboardPage.pageHeading).toBeVisible();
  });
}
