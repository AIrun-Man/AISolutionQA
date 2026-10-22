import { BasePage } from "./BasePage.js";
import type { Page } from "@playwright/test";

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get emailInput() {
    return this.page.getByLabel("Email");
  }

  get passwordInput() {
    return this.page.getByLabel("Password");
  }

  get submitButton() {
    return this.page.getByRole("button", { name: "Sign in" });
  }

  get errorMessage() {
    return this.page.getByRole("alert");
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
