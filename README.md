# koa-x-router

`koa-x-router` is a library that extends the functionality of `@koa/router` by providing validation and automatic API documentation features. It simplifies the process of defining routes, validating request data, and generating API documentation.

## Features

- **Validation**: With `koa-x-router`, you can perform validation using various validation libraries. The library provides adapters such as `JoiAdaptor` and `YupAdaptor` that allow you to define validation schemas using popular validation libraries like `Joi` or `Yup`. You can also implement your own custom adapter by implementing the `XRouterAdaptor` interface.

- **Automatic API Documentation**: `koa-x-router` automatically generates API documentation based on your route definitions. It extracts information about route paths, request methods, request/response data structures, and validation rules. The generated documentation can be accessed through an endpoint, making it convenient for developers to understand and consume your API.

## Installation

You can install koa-x-router using npm:

```shell
npm install koa @koa/router koa-x-router joi
```

## Usage

[Demo](https://stackblitz.com/edit/koa-x-router-demo?file=index.ts)

To use `koa-x-router`, import it and initialize it with an instance of `@koa/router`. Here's a basic example:

```ts
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { Router, JoiAdaptor } from "koa-x-router";

const app = new Koa();
const router = new Router({
  adaptors: [JoiAdaptor], // <== Important!
});
const docRouter = new Router();

// Define a route with validation
router.add({
  method: "get",
  path: "/users",
  validate: {
    query: Joi.object({
        name: Joi.string(),
    }),
    output: {
      200: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          age: Joi.number().positive().required(),
        })
      ),
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
  console.log("Server listening on port 3000");
});
```

You can also implement your custom adapter by implementing the `XRouterAdaptor` interface.
This allows you to use your preferred validation library for route validation.

## Contributing
Contributions are welcome!
If you have any suggestions, bug reports, or feature requests, please open an issue.

## License
This project is licensed under the Apache License 2.0.
