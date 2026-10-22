import type { Page } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage.js";

export async function authenticateAsUser(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto("/login");
  await loginPage.login(email, password);
  return loginPage;
}
