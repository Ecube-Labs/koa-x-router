# koa-x-router v0.1 adaptor imports

Migrates `koa-x-router` v0.0 root adaptor imports to the optional v0.1 subpath exports.

```diff
- import { Router, JoiAdaptor, ZodAdaptor } from 'koa-x-router';
+ import { Router } from 'koa-x-router';
+ import { JoiAdaptor } from 'koa-x-router/joi';
+ import { ZodAdaptor } from 'koa-x-router/zod';
```

The transform supports JavaScript, JSX, TypeScript, TSX, and their Node-specific module extensions. It handles:

-   ESM named imports and re-exports, including aliases and type-only imports
-   CommonJS destructuring from `require('koa-x-router')`
-   Direct CommonJS access such as `require('koa-x-router').JoiAdaptor`
-   Mixed imports while preserving non-adaptor exports on the package root
-   Repeated runs without changing already migrated code

Namespace bindings such as `import * as xRouter from 'koa-x-router'` or `const xRouter = require('koa-x-router')` require manual migration because safely splitting their member references requires project-level symbol analysis.

## Run

From the project to migrate:

```bash
npx codemod @ecube-labs/koa-x-router-v0-1-adaptor-imports
```

Review the diff and run the project's tests before committing the result. Pin the codemod version in automated migrations for reproducibility:

```bash
npx codemod @ecube-labs/koa-x-router-v0-1-adaptor-imports@0.1.0
```

## Development

```bash
npm install
npm run check
```

Run the unpublished workflow against a local project:

```bash
npx codemod workflow run -w . -t /path/to/project
```

Publish it to the public Codemod Registry after linking the `Ecube-Labs` GitHub organization:

```bash
npx codemod login
npx codemod publish
```

The repository can also publish with GitHub OIDC and no registry secret. Update the version in `codemod.yaml`, then push a matching tag:

```bash
git tag koa-x-router-v0-1-adaptor-imports@v0.1.0
git push origin koa-x-router-v0-1-adaptor-imports@v0.1.0
```

## License

Apache-2.0
