# CLAUDE.md

Guidance for AI agents (and humans) working on this repository.

## What this is

**mongo-adonis** — a MongoDB adapter that mimics the Lucid ORM API for AdonisJS 6. Active Record models, a fluent query builder, relationships (HasOne/HasMany/BelongsTo/BelongsToMany), lifecycle hooks, and auth integration, all backed by the official `mongodb` v6 driver.

Note: the repo directory is `mongo-lucid`, but the published npm package is **`mongo-adonis`**. TypeScript, ESM (`"type": "module"`), Node **>= 20.12** required.

## Commands

```bash
npm test              # full suite (japa). Runs FROM SOURCE via ts-node — no build needed.
npm run build         # tsc → build/ + copies stubs. Only needed for publishing.
npx tsc --noEmit      # type-check without emitting
npm run test:coverage # c8 coverage
```

**Tests require a local MongoDB** at `127.0.0.1:27017` (no auth). They use the `adonis_test` database (`DB_TEST_DATABASE` env var; `.env.test` is loaded automatically) and **drop all its collections** in teardown. `npm test` exits non-zero on failure. There is no single-file test filter; temporarily narrow the glob in `tests/setup.ts` if needed.

## Architecture

```
index.ts                    package entry: re-exports src/index.ts + configure + db singleton
src/
  connection/
    connection.ts           MongoConnection: one MongoClient, connect/disconnect, EventEmitter
    connection_manager.ts   named-connection registry; tracks node.state open/closed
    database.ts             MongoDatabase: config → registers connections, lazy-connects on access
  querybuilder/
    query_builder.ts        MongoQueryBuilder: filter building, exec/stream/count/update/…
    query_client.ts         thin per-connection client (collection(), rawQuery, rawCommand)
  model/
    base_model.ts           MongoModel: statics (find/create/…), save/delete/refresh, hydration
    decorators.ts           @column, @column.dateTime, @computed → prototype metadata Maps
    hooks.ts                @beforeSave etc. → static methods on the constructor (chained)
    adapter.ts              MongoAdapter: model class → query builder (lazy collection)
    main.ts                 barrel used by tests
  relations/                HasOne/HasMany share HasOneOrMany base (base_relation.ts)
  schema/                   collection/index creation helpers (MongoSchema, builder)
  db.ts + mongodb.ts        `db.users.find({})` direct-access proxy singleton
  mixins.ts                 withAuthFinder (AdonisJS auth)
providers/database_provider.ts  AdonisJS provider: boot connects, shutdown closes all
configure.ts + stubs/       `node ace configure mongo-adonis` codemods (env vars are DB_*)
```

## Invariants — do not break these

1. **Single hydration path.** Raw DB rows become models only via `$hydrateRow`/`$consumeAdapterResult`. `query().first()/all()/exec()` already return hydrated models — never re-wrap or re-process their results (double `consume()` corrupts values).
2. **Three value representations.** Instance properties hold `consume()`d values; `$attributes` and `$original` hold the raw DB row (column names, `prepare()`d values); `toObject()` produces the DB form from the instance. `save()` computes dirty fields by comparing `prepare(this[prop])` against `$original[columnName]` **structurally** (`isEqualValue`: deep for plain objects/arrays, by-value for Date/ObjectId) and writes **only dirty columns** via `$set`. `$original` is a deep snapshot (`deepSnapshot`) precisely so in-place mutation of nested values registers as dirty — don't replace it with a shallow copy.
3. **Driver types are opaque.** `processMongoQuery` and filter merging recurse into **plain objects only**. ObjectId, Date, Buffer, RegExp (converted), Decimal128 etc. must pass through untouched — recursing into them silently breaks every query that uses them (regression tests: `tests/querybuilder/regressions.spec.ts`).
4. **Prototype metadata needs own-property guards.** `$columnsDefinitions`, `$timestampColumns`, `$computedDefinitions` are Maps on the prototype. Always go through `ownMetadataMap()` (decorators.ts) — mutating an inherited Map leaks columns between model classes.
5. **Hooks are static methods** on the constructor (`Constructor.beforeSave`). Decorators **chain** with any existing handler (own or inherited — e.g. from `withAuthFinder`); plain static methods with hook names work without decorators. Order: `beforeSave → beforeCreate/beforeUpdate → write → afterCreate/afterUpdate → afterSave`. `beforeFind/afterFind` fire only for static `find()/findBy()`.
6. **Collection naming.** Explicit `static collection` is inherited by subclasses; auto-derived names (`pluralize(snakeCase(ClassName))`) are re-derived per class (`$collectionAutoDerived` marker). Codified in `tests/model/table_name.spec.ts`.
7. **Builders are reusable.** `first()` and `paginate()` clone; `clone()` deep-copies plain-object filter structure. Repeated `where()` on the same field ANDs (never overwrites).
8. **Connections lazy-connect and are idempotent.** `MongoDatabase.connection()` kicks off a background connect; the adapter passes the query builder an `ensureReady` thunk so the first query awaits the handshake instead of racing it. `connect()` dedupes concurrent calls via `_connecting`. The provider's `shutdown()` closes every client — anything that creates a `MongoClient` must have a close path.
9. **Fail loud on unimplemented Lucid API.** Compatibility stubs (`load`, `preload`, `loadCount`, `related`, …) throw `NotImplementedException` — never turn them into silent no-ops.
10. **`count()` is approximate without a filter** (`estimatedDocumentCount`), exact with one. Intentional.

## Conventions

- Every bug fix gets a regression test (`tests/querybuilder/regressions.spec.ts`, `tests/model/regressions.spec.ts`).
- Tests: japa `test.group` with `group.setup`/`group.teardown` using `setupTest()/teardownTest()` from `tests/helpers.ts`; fixtures in `tests/fixtures.ts`. Create throwaway models inside specs for isolated behavior tests (see regressions specs).
- Public API changes must be reflected in `docs/` (`api_reference.md` is the method-level source of truth) and, for exports, in `src/index.ts` + `index.ts`.
- `@adonisjs/core` is a peer dependency (and dev dependency for building) — never a runtime dependency.
- Errors extend `Exception` (src/errors.ts); subclasses only set `static status`.

## Docs map

`docs/api_reference.md` (methods) · `models.md` + `base_model.md` (model usage) · `relationship_methods.md` + `many_to_many_relationships.md` (relations) · `model_hooks.md` (hooks) · `serialization.md` · `direct-mongodb-access.md` (`db` proxy) · `method_comparison.md` (Lucid vs mongo-adonis parity table).

## Working style

- State assumptions; if multiple interpretations exist, present them instead of picking silently.
- Minimum code that solves the problem — no speculative abstractions, features, or configurability.
- Touch only what the task requires; match existing style; remove only orphans your own change created.
- Turn tasks into verifiable goals ("fix the bug" → "write a failing test, make it pass") and loop until the suite is green.
