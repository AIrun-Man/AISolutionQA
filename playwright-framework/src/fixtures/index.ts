import { test as base } from "@playwright/test";
import { appEnvironment } from "./environment.js";
import { authenticateAsUser } from "./authentication.js";
import { LoginPage } from "../pages/LoginPage.js";
import { DashboardPage } from "../pages/DashboardPage.js";

export { appEnvironment, authenticateAsUser };

type ApplicationFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<ApplicationFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  }
});

export { expect } from "@playwright/test";
