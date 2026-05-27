# Fix: missing i18n packages, not a bad import

## Diagnosis

The Rollup error `Could not resolve "...t" from ".../events.tsx?tsr-split=component"` truncates the module name; the missing module is `react-i18next` (the trailing `t`). Verification:

- `src/routes/events.tsx` has the correct pattern: `import { useTranslation } from "react-i18next"` and uses `const { t } = useTranslation()` inside the component. No bad `import t from "t"` anywhere in `src` (`rg -ln 'from "t"' src` returns nothing).
- `src/i18n/index.ts` imports `i18next`, `react-i18next`, and `i18next-browser-languagedetector`.
- `package.json` lists **none** of these three packages. That's why Rollup can't resolve them.

The previous turn added only `i18next-browser-languagedetector`; `i18next` and `react-i18next` were never installed.

## Fix

Install the missing runtime deps:

- `i18next`
- `react-i18next`

`i18next-browser-languagedetector` is already added.

No source file edits needed — `events.tsx`, `src/i18n/index.ts`, and other routes already use the correct API.

## Verify

Build should complete without the `?tsr-split=component` resolve failure.
