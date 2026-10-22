# Locator Governance

| Strategy | Base score | Standard |
|---|---:|---|
| `getByTestId` | 100 | Preferred stable automation contract |
| `getByRole` | 90 | Semantic role plus stable accessible name |
| `getByLabel` | 85 | Associated form label |
| `getByPlaceholder` | 70 | Stable fallback for input identity |
| CSS | 45 | Exception with documented stable contract |
| XPath | 20 | Last-resort reviewed exception |

New locators require a score of at least 70. Generated attributes, absolute XPath, positional CSS, arbitrary indexing, and ambiguity suppression are forbidden. The executable policy is in `platform-core/src/governance/locator.ts`.
