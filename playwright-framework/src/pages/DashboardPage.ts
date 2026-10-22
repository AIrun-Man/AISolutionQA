import { BasePage } from "./BasePage.js";
import type { Page } from "@playwright/test";

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get pageHeading() {
    return this.page.getByRole("heading", { name: /Dashboard|Overview/i });
  }

  get userMenu() {
    return this.page.getByRole("button", { name: /account|profile/i });
  }
}
