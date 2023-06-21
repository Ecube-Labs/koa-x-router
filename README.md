# koa-x-router

`koa-x-router` is a library that extends the functionality of `koa-router` by providing validation and automatic API documentation features. It simplifies the process of defining routes, validating request data, and generating API documentation.

## Features

- **Validation**: With `koa-x-router`, you can perform validation using various validation libraries. The library provides adapters such as `JoiAdaptor` and `YupAdaptor` that allow you to define validation schemas using popular validation libraries like `Joi` or `Yup`. You can also implement your own custom adapter by implementing the `XRouterAdaptor` interface.

- **Automatic API Documentation**: `koa-x-router` automatically generates API documentation based on your route definitions. It extracts information about route paths, request methods, request/response data structures, and validation rules. The generated documentation can be accessed through an endpoint, making it convenient for developers to understand and consume your API.

## Installation

You can install koa-x-router using npm:

```shell
npm install koa koa-router koa-x-router joi
```

## Usage

To use `koa-x-router`, import it and initialize it with an instance of `koa-router`. Here's a basic example:

```ts
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { Router, JoiAdaptor } from "koa-x-router";

const app = new Koa();
const router = new Router({
  adaptors: [JoiAdaptor], // <== Important!
});

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

app.use(bodyParser());
app.use(router.routes());

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

You can also implement your custom adapter by implementing the XRouterAdaptor interface.
This allows you to use your preferred validation library for route validation.

## Contributing
Contributions are welcome!
If you have any suggestions, bug reports, or feature requests, please open an issue.

## License
This project is licensed under the MIT License.
