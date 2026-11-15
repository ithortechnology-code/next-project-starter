# Optional auth recipe

The working auth implementation in `apps/api`, `apps/web`, `apps/mobile`, and `packages/shared` is the single editable source of truth. The template includes that reference implementation so its tests exercise the files contributors will actually receive. Setup selects `better-auth` or `none`; omission defaults to `none` in non-interactive use. Interactive setup asks before installing dependencies.

Selection is a one-time source generation operation, before dependency installation, migrations, or app development. A committed manifest fingerprints the files the generator can change or remove. The generator validates every affected file before writing anything and refuses changed input. It never reads or deletes database volumes. It records the choice in `.starter/auth-selection.json`; repeating that choice is a no-op, preserving user edits, and switching choices requires a fresh copy. This is deliberately not an in-place product migration tool.

The auth-selected path retains the tested reference sources. The no-auth path removes auth-specific routes, clients, tests, migration, dependencies, and environment keys, and generates small health screens. Shared API infrastructure remains in place. Explicitly delimited auth sections in mixed API/shared files allow omission without maintaining a second API implementation. Small baseline health screens are owned by the generator, not copies of the auth screens.

The tracked dependency lock starts with the reference implementation. Selection changes manifests; setup reconciles the lock with npm before installing. Generated output has its own lock. The generator and its manifest remain in a generated fork for provenance, but cannot restore removed auth sources. To add auth later, start from the reference implementation and integrate deliberately.

Verification uses disposable copies for selected/unselected generation, rerun preservation, tamper rejection, dependency installation, migration lists, and workspace quality gates. CI and staging execution are deferred by the current local-only instruction; local test evidence is recorded in the task checklist.

When changing a canonical recipe input, run `node scripts/update-auth-recipe-manifest.mjs` after reviewing the change, then run `node --test scripts/tests/auth-recipe.test.mjs`. Add new recipe-owned files to the manifest and removal list explicitly. The fingerprint is an edit-preservation guard, not a security boundary.
