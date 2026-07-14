# koa-x-router

<span class="badge-npmversion"><a href="https://npmjs.org/package/koa-x-router" title="View this project on NPM"><img src="https://img.shields.io/npm/v/koa-x-router.svg" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://npmjs.org/package/koa-x-router" title="View this project on NPM"><img src="https://img.shields.io/npm/dm/koa-x-router.svg" alt="NPM downloads" /></a></span>

`koa-x-router` is a library that extends the functionality of `@koa/router` by providing validation and automatic API documentation features. It simplifies the process of defining routes, validating request data, and generating API documentation.

## Features

-   **Validation**: With `koa-x-router`, you can perform validation using various validation libraries. The library provides adapters such as `JoiAdaptor` and `ZodAdaptor` that allow you to define validation schemas using popular validation libraries like `Joi` or `Zod`. You can also implement your own custom adapter by implementing the `XRouterAdaptor` interface.

-   **Automatic API Documentation**: `koa-x-router` automatically generates API documentation based on your route definitions. It extracts information about route paths, request methods, request/response data structures, and validation rules. The generated documentation can be accessed through an endpoint, making it convenient for developers to understand and consume your API.

## Installation

`koa-x-router` supports Node.js 20.19 and later and publishes both ESM and CommonJS entry points.

You can install koa-x-router with joi using npm:

```shell
npm install koa @koa/router koa-x-router joi
```

or install with zod using npm:

```shell
npm install koa @koa/router koa-x-router zod
```

### with TypeScript

```shell
npm install @types/koa @types/koa__router -D
```

## Usage

### Demos

-   [ESM](https://stackblitz.com/edit/koa-x-router-demo?file=index.ts)
-   [CommonJS](https://stackblitz.com/edit/koa-x-router-demo-cjs)

To use `koa-x-router`, import it and initialize it with an instance of `@koa/router`. Here's a basic example:

```ts
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Joi from 'joi';
import { Router } from 'koa-x-router';
import { JoiAdaptor } from 'koa-x-router/joi';
// import { ZodAdaptor } from "koa-x-router/zod";

const app = new Koa();
const router = new Router({
    adaptors: [JoiAdaptor], // <== Important!
    // adaptors: [ZodAdaptor], // If you want to use with Zod
    // adaptors: [JoiAdaptor, ZodAdaptor], // or both
});
const docRouter = new Router();

// Define a route with validation
router.add({
    method: 'get',
    path: '/users',
    validate: {
        query: Joi.object({
            name: Joi.string(),
        }),
        output: {
            200: {
                body: Joi.array().items(
                    Joi.object({
                        name: Joi.string().required(),
                        age: Joi.number().positive().required(),
                    }),
                ),
            },
        },
    },
    handler: async (ctx) => {
        // code...
    },
});

docRouter.get('/', (ctx) => {
    ctx.body = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>API Documentation</title>
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>body{margin: 0;padding: 0;}</style>
  </head>
  <body>
    <redoc spec-url='/openapi.json' lazy-rendering></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
  </body>
  </html>`;
});

docRouter.get('/openapi.json', (ctx) => {
    ctx.body = router.generateOpenApiSpecJson({
        info: {
            title: 'koa-x-router Demo API Docs',
            version: '1.0.0',
        },
    });
});

app.use(docRouter.routes());
app.use(bodyParser());
app.use(router.routes());

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
```

You can also implement your custom adapter by implementing the `XRouterAdaptor` interface.
This allows you to use your preferred validation library for route validation.

### CommonJS

```js
const { Router } = require('koa-x-router');
const { JoiAdaptor } = require('koa-x-router/joi');
const { ZodAdaptor } = require('koa-x-router/zod');
```

### Migrating to 0.1

Validation adapters are no longer exported from the package root. Import them from their dedicated entry points so applications only load the validation library they use:

```ts
import { Router } from 'koa-x-router';
import { JoiAdaptor } from 'koa-x-router/joi';
import { ZodAdaptor } from 'koa-x-router/zod';
```

Migrate JavaScript and TypeScript projects automatically with the official codemod:

```shell
npx codemod @ecube-labs/koa-x-router-v0-1-adaptor-imports@0.1.0
```

The codemod supports ESM imports and re-exports as well as CommonJS `require` calls. Review namespace imports manually. See the [codemod documentation](./codemods/v0.1-adaptor-imports/README.md) for supported patterns and local development instructions.

## Contributing

Contributions are welcome!
If you have any suggestions, bug reports, or feature requests, please open an issue.

## License

This project is licensed under the Apache License 2.0.
