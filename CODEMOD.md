# Codemod Maintenance Guide

This document defines the standard process for creating, modifying, validating, and publishing `koa-x-router` packages to the Codemod Registry. The current package is located at `codemods/v0.1-adaptor-imports` and automates the adaptor import changes introduced in `koa-x-router` v0.1.

## Principles

- A codemod must be idempotent. Running it repeatedly against the same input must not produce additional changes.
- Every supported JavaScript and TypeScript syntax must be covered by a fixture.
- Leave ambiguous code unchanged and document the required manual migration in the package README.
- Limit each codemod to one breaking change or one clearly defined migration.
- Never modify or reuse a version or Git tag that has already been published. Publish corrections as a new version.
- Pin an exact codemod version in automated migrations to keep runs reproducible.

## Repository Structure

```text
codemods/<migration>/
├── codemod.yaml        # Registry name, version, visibility, and workflow entry point
├── workflow.yaml       # Target files, language, exclusions, and execution steps
├── package.json        # Development commands and tool dependencies
├── package-lock.json   # Reproducible CI installation
├── tsconfig.json       # Transform script type checking
├── scripts/
│   └── codemod.ts      # JSSG AST transform
└── tests/
    ├── javascript/<case>/{input,expected}.*
    └── typescript/<case>/{input,expected}.*
```

Every package README must document:

- A before-and-after example
- Supported syntax and file extensions
- Intentionally unsupported syntax and its manual migration
- Registry commands, including a version-pinned example
- Local development and publishing commands

## Choosing a Tool

Use JSSG, the JavaScript ast-grep engine supported directly by the Codemod Registry, by default. It is suitable for file-level syntax changes such as imports, exports, and function calls. It handles JS, JSX, TS, and TSX in one workflow and runs from the Registry without project-specific runtime dependencies.

When a safe transformation requires type information or project-wide symbol relationships, evaluate the options in this order:

1. Determine whether JSSG file or workspace semantic analysis can handle the transformation.
2. If it cannot, leave the pattern unchanged and document a manual migration.
3. Add `ts-morph` or the TypeScript Compiler API as a separate workflow step only when a type checker is essential.

Do not apply regular expressions to an entire source file. Regular expressions are acceptable only for interpreting constrained text inside an AST node that has already been selected structurally.

## Modifying an Existing Codemod

Work from the package directory when modifying the current codemod:

```bash
cd codemods/v0.1-adaptor-imports
npm ci
```

1. Modify the transform in `scripts/codemod.ts`.
2. Add an `input.*` fixture for the syntax being changed and an `expected.*` fixture for its intended output.
3. Review mixed imports, aliases, type-only imports, CommonJS, and no-op cases in addition to the primary success case.
4. Add any newly discovered unsupported pattern to the package README.
5. Run the complete validation suite.

```bash
npm run check
```

`npm run check` performs all of the following:

- `tsc --noEmit`: transform script type checking
- `codemod workflow validate`: Registry workflow schema validation
- JavaScript fixture tests
- TypeScript and TSX fixture tests

Validate the transform against a real project before publishing it. Run it from a clean branch, inspect `git diff`, and execute the consumer project's own tests.

```bash
npx codemod workflow run \
    -w /path/to/koa-x-router/codemods/v0.1-adaptor-imports \
    -t /path/to/consumer-project
```

## Writing Fixtures

Place each test case in an independent directory:

```text
tests/typescript/new-case/input.ts
tests/typescript/new-case/expected.ts
```

Use directory snapshots for transforms that create or delete files:

```text
tests/typescript/new-case/input/
tests/typescript/new-case/expected/
```

The minimum fixture coverage is:

- The most common form of the transformation
- Syntax containing both target and non-target symbols
- Aliases and type-only syntax
- Preservation of existing style, including semicolons and quote style
- Already migrated code that must remain unchanged
- Every supported ESM and CommonJS form
- A real JSX or TSX file when JSX or TSX support is advertised

Use a no-op fixture with identical `input` and `expected` files to verify idempotence and prevent false positives. When snapshots are updated in bulk, inspect the generated diff manually.

## Creating a New Codemod

Create a separate directory and Registry package for a new breaking change instead of accumulating unrelated transforms in an existing package.

Use the following naming convention:

```text
Directory: codemods/v<target-version>-<migration-purpose>
Package:   @ecube-labs/koa-x-router-v<target-version>-<migration-purpose>
Tag:       koa-x-router-v<target-version>-<migration-purpose>@v<codemod-version>
```

The official scaffold can be used as a starting point:

```bash
npx codemod@latest init codemods/<migration> \
    --name <registry-package-name> \
    --project-type ast-grep-js \
    --package-manager npm \
    --language tsx
```

After scaffolding:

1. Set the package scope in `codemod.yaml` to `@ecube-labs`.
2. Set `registry.access` and `registry.visibility` to `public`.
3. Set the minimum Node.js version to `>=20.19.0`.
4. Include only supported extensions in `workflow.yaml`, and exclude `node_modules`, `dist`, `build`, and `coverage`.
5. Add separate JavaScript and TypeScript fixture commands to `package.json`.
6. Ensure that one `npm run check` command validates types, the workflow, and every fixture.
7. Add the new path and a dedicated tag trigger to `.github/workflows/publish-codemod.yml`. The publish step's `path` must reference the new package.
8. Add a version-pinned execution command to the migration section of the root README.

Keep `capabilities` in `codemod.yaml` as an empty array unless the transform requires `fetch`, unrestricted `fs`, or `child_process`. When adding a capability, explain why it is required and how it is used in the package README.

## Versioning

The codemod version is independent of the `koa-x-router` version. The `v0-1` segment in the package name identifies the migration target, while `0.1.0` in `codemod.yaml` is the codemod's own version.

- PATCH: bug fixes, false-positive or false-negative corrections, and documentation corrections
- MINOR: support for new syntax without breaking existing behavior
- MAJOR: incompatible changes to output, options, or existing transformation results

Keep the version synchronized in these files:

- `codemod.yaml`
- `package.json`
- `package-lock.json`

Update the npm metadata first, then set the same version in `codemod.yaml`:

```bash
cd codemods/v0.1-adaptor-imports
npm version 0.1.1 --no-git-tag-version
```

## Initial Registry Setup

Do not create a Codemod Registry package manually. The first publish creates it from `codemod.yaml`.

1. Sign in to `https://app.codemod.com` with GitHub.
2. Grant the Codemod GitHub App access to `Ecube-Labs/koa-x-router`.
3. Link the `Ecube-Labs` GitHub organization and confirm the `@ecube-labs` scope.
4. Once the organization and scope are linked, publish from GitHub Actions through OIDC without a secret.

If the first OIDC publish fails because of scope or trusted publisher configuration, publish once manually from the package directory:

```bash
npx codemod login
npx codemod whoami
npx codemod publish
```

Configure these values in Codemod's Trusted Publishers settings when required:

- Package: the complete scoped Registry package name
- Owner: `Ecube-Labs`
- Repository: `koa-x-router`
- Workflow: `.github/workflows/publish-codemod.yml`
- Ref pattern: the tag pattern for the codemod

Do not add an API key or long-lived token as a repository secret. Prefer GitHub Actions OIDC.

## Publishing

The current v0.1 codemod workflow watches this tag pattern:

```text
koa-x-router-v0-1-adaptor-imports@v*
```

1. Synchronize the versions in `codemod.yaml`, `package.json`, and `package-lock.json`.
2. Update the version-pinned command in the package README.
3. Run `npm ci && npm run check`.
4. Merge the change and confirm that the commit being published is on the default branch.
5. Create an annotated tag matching the version from that commit and push it.

```bash
git tag -a koa-x-router-v0-1-adaptor-imports@v0.1.1 \
    -m "koa-x-router v0.1 adaptor imports codemod 0.1.1"
git push origin koa-x-router-v0-1-adaptor-imports@v0.1.1
```

The GitHub Actions `Codemod` workflow type-checks the transform, validates the workflow, and runs every fixture before publishing through `codemod/publish-action@v1`.

## Verifying a Release

Verify both the Registry search result and an exact-version execution:

```bash
npx codemod search koa-x-router
npx codemod @ecube-labs/koa-x-router-v0-1-adaptor-imports@0.1.1
```

Current package page:

```text
https://app.codemod.com/registry/@ecube-labs/koa-x-router-v0-1-adaptor-imports
```

Public search engine indexing may be delayed. Treat the Codemod CLI search and Registry page as the source of truth.

## Failures and Recovery

### Workflow Validation Failure

Reproduce the complete validation from the package directory:

```bash
npm ci
npm run check:types
npm run check:workflow
npm test
```

### OIDC Publishing Failure

- Confirm that the GitHub organization and Registry scope are linked.
- Confirm that the workflow grants `id-token: write` and `contents: read`.
- Check the tag pattern, publish action `path`, and package name in `codemod.yaml`.
- Check the owner, repository, workflow path, and ref restriction configured for the Trusted Publisher.

### Version Already Exists

Do not overwrite a published version. Apply the correction, increment the PATCH version, and publish a new tag.

### A Broken Transform Was Published

Document the impact and publish a corrected version first. Remove a Registry version only when it is dangerous enough to justify removal, and review a dry run before executing the operation:

```bash
npx codemod unpublish @ecube-labs/koa-x-router-v0-1-adaptor-imports \
    --version <bad-version> \
    --dry-run
```

## Review Checklist

- [ ] The transform scope matches the breaking change.
- [ ] Required fixtures exist for both JavaScript and TypeScript.
- [ ] ESM and CommonJS support matches the implementation and documentation.
- [ ] Alias, type-only, mixed, and no-op cases are covered.
- [ ] The transform is idempotent and does not change unrelated code.
- [ ] Unsupported syntax and its manual migration are documented.
- [ ] `npm run check` passes.
- [ ] The diff and tests from a real consumer project were reviewed.
- [ ] All three version files and the README execution version match.
- [ ] The GitHub Actions tag pattern and publish path are correct.
- [ ] The workflow uses minimum permissions without a new secret.
- [ ] Registry search and exact-version execution were verified after publishing.

## References

- Codemod CLI: https://docs.codemod.com/cli
- JSSG testing: https://docs.codemod.com/jssg/testing
- Registry: https://docs.codemod.com/platform/registry
- Publishing and OIDC: https://docs.codemod.com/publishing
