---
name: qa
description: Full verification pipeline for mongo-adonis — type-check, test suite against live MongoDB, build, and publish-artifact sanity check. Use before committing, after any src/ change, or when asked to verify the package.
---

# QA pipeline

Run these from the repo root, in order. Stop and fix at the first failure.

## 1. Preconditions

MongoDB must be running locally: `pgrep -x mongod || brew services start mongodb-community`. Tests use the `adonis_test` database (see `.env.test`) and drop its collections — never point them at a real database.

## 2. Type-check

```bash
npx tsc --noEmit
```

## 3. Tests (from source — no build needed)

```bash
npm test
```

Exit code is meaningful (non-zero on failure). If a test fails only on the first cold run but passes on re-run, suspect a connection-readiness race — that class of bug is supposed to be fixed (adapter passes `ensureReady` to the query builder); investigate, don't shrug it off.

## 4. Build + publish artifact check

```bash
npm run build
npx npm pack --dry-run 2>&1 | tail -30
```

Verify the tarball contains only `build/` (without `build/tests/`), `stubs/`, `README.md`, `LICENSE.md`, `package.json`. If compiled tests or dead files appear, check `tsconfig.json` `exclude` and package.json `files`.

## 5. Regression discipline

Any bug fixed during the session must have a regression test in `tests/querybuilder/regressions.spec.ts` or `tests/model/regressions.spec.ts` — re-run `npm test` after adding it and confirm it fails when the fix is reverted (spot-check mentally or with `git stash`).
