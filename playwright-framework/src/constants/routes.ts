export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  ACCOUNT: "/account",
  CHECKOUT: "/checkout"
} as const;

export const DEFAULT_TIMEOUTS = {
  short: 5000,
  medium: 15000,
  long: 30000
} as const;
