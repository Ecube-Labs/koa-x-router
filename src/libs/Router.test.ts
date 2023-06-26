import Joi from "joi";
import request from "supertest";
import koaBodyParser from "koa-bodyparser";
import { getApp } from "../../test/app";
import { JoiAdaptor, Router } from "./";

describe("koa-router API", () => {
  it("should be defined", () => {
    expect(Router).toBeDefined();
  });

  it("should be able to create instance", () => {
    const router = new Router();
    expect(router).toBeDefined();
  });

  it("should be work with koa app", async () => {
    const app = getApp();
    const router = new Router();
    app.use(router.routes());

    router.get("/", async (ctx) => {
      ctx.body = "Hello World";
    });

    const response = await request(app.callback()).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello World");
  });

  it("should be work with koa app to create instance with options", async () => {
    const app = getApp();
    const router = new Router({ prefix: "/api" });
    app.use(router.routes());

    router.get("/path", async (ctx) => {
      ctx.body = "Hello World";
    });

    const response = await request(app.callback()).get("/api/path");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello World");
  });
});

describe("koa-x-router API work with Joi", () => {
  it("should be define validate schema", async () => {
    const app = getApp();
    const router = new Router({
      adaptors: [JoiAdaptor],
    });
    app.use(router.routes());

    router.add({
      method: "get",
      path: "/",
      validate: {
        query: Joi.object({
          name: Joi.string(),
        }),
      },
      handler: async (ctx) => {
        ctx.body = `Hello World, ${ctx.query.name}`;
      },
    });

    const [layer] = router.stack;

    expect(layer.path).toBe("/");
    expect(JSON.stringify(layer.opts.validate?.query)).toEqual(
      JSON.stringify(
        Joi.object({
          name: Joi.string(),
        })
      )
    );

    const response = await request(app.callback()).get("/?name=tim");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello World, tim");
  });

  it("throw error when empty adaptor", async () => {
    const router = new Router();

    expect(() => {
      router.add({
        method: "get",
        path: "/",
        validate: {
          query: Joi.object({
            name: "string",
          }),
        },
        handler: async (ctx) => {
          ctx.body = "Hello World";
        },
      });
    }).toThrowError(/^Not found compatible adaptor for schema/g);
  });

  it("throw error when invalid data of schema", async () => {
    const app = getApp();
    const router = new Router({
      adaptors: [JoiAdaptor],
    });
    app.use(koaBodyParser()).use(router.routes());

    router.add([
      {
        method: "get",
        path: "/query",
        validate: {
          query: Joi.object({
            name: Joi.string().required(),
          }),
        },
        handler: async (ctx) => {
          ctx.body = `Hello World, ${ctx.query.name}`;
        },
      },
      {
        method: "post",
        path: "/body",
        validate: {
          body: Joi.object({
            age: Joi.number(),
          }),
        },
        handler: async (ctx) => {
          ctx.body = `Hello World`;
        },
      },
      {
        method: "get",
        path: "/header",
        validate: {
          header: Joi.object({
            authorization: Joi.string().required(),
          }),
        },
        handler: async (ctx) => {
          ctx.body = `Hello World`;
        },
      },
      {
        method: "get",
        path: "/params/:id",
        validate: {
          params: Joi.object({
            id: Joi.valid("tim", "charlie").required(),
          }),
        },
        handler: async (ctx) => {
          ctx.body = `Hello World`;
        },
      },
      {
        method: "get",
        path: "/output1",
        validate: {
          output: {
            200: {
              body: Joi.object({
                id: Joi.valid("tim", "charlie").required(),
              }),
            },
          },
        },
        handler: async (ctx) => {
          ctx.body = {
            id: "ben",
          };
        },
      },
      {
        method: "get",
        path: "/output2",
        validate: {
          output: {
            200: {
              body: Joi.object({
                id: Joi.valid("tim", "charlie").required(),
              }),
            },
            201: {
              body: Joi.string().valid("created~~").required(),
            },
          },
        },
        handler: async (ctx) => {
          ctx.status = 201;
          ctx.body = "created^^";
        },
      },
    ]);

    const response1 = await request(app.callback()).get("/query");
    expect(response1.status).toBe(400);
    expect(response1.text).toBe('"name" is required');

    const response2 = await request(app.callback()).post("/body").send({
      age: "dasdas",
    });
    expect(response2.status).toBe(400);
    expect(response2.text).toBe('"age" must be a number');

    const response3 = await request(app.callback()).get("/header");
    expect(response3.status).toBe(400);
    expect(response3.text).toBe('"authorization" is required');

    const response4 = await request(app.callback()).get("/params/ben");
    expect(response4.status).toBe(400);
    expect(response4.text).toBe('"id" must be one of [tim, charlie]');

    const response5 = await request(app.callback()).get("/output1");
    expect(response5.status).toBe(400);
    expect(response5.text).toBe('"id" must be one of [tim, charlie]');

    const response6 = await request(app.callback()).get("/output2");
    expect(response6.status).toBe(400);
    expect(response6.text).toBe('"value" must be [created~~]');
  });

  it("should be validate ctx.request.header and cast value inject", async () => {
    const app = getApp();
    const router = new Router({
      adaptors: [JoiAdaptor],
    });
    app.use(koaBodyParser()).use(router.routes());

    router.add([
      {
        method: "get",
        path: "/header",
        validate: {
          header: Joi.object({
            numbertest: Joi.number().required(),
          }).options({
            allowUnknown: true,
          }),
        },
        handler: async (ctx) => {
          ctx.body = {
            headers: ctx.request.headers,
          };
        },
      },
    ]);

    const response = await request(app.callback()).get("/header").set({
      numbertest: "12345",
    });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      headers: expect.objectContaining({
        numbertest: 12345,
      }),
    });
  });

  it("should be validate ctx.request.query and cast value inject", async () => {
    const app = getApp();
    const router = new Router({
      adaptors: [JoiAdaptor],
    });
    app.use(koaBodyParser()).use(router.routes());

    router.add([
      {
        method: "get",
        path: "/query",
        validate: {
          query: Joi.object({
            numbertest: Joi.number().required(),
            arraytest: Joi.array().items(Joi.number()).required(),
            numbooltest1: Joi.boolean().required(),
            numbooltest2: Joi.boolean().truthy("1").falsy("0").required(),
            numbooltest3: Joi.boolean().truthy("1").falsy("0").required(),
          }).required(),
        },
        handler: async (ctx) => {
          ctx.body = {
            query: ctx.request.query,
          };
        },
      },
    ]);

    const response = await request(app.callback()).get(
      "/query?numbertest=12345&arraytest=100&arraytest=999&numbooltest1=true&numbooltest2=1&numbooltest3=0"
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      query: {
        numbertest: 12345,
        arraytest: [100, 999],
        numbooltest1: true,
        numbooltest2: true,
        numbooltest3: false,
      },
    });
  });

  it("should be validate ctx.request.params and cast value inject", async () => {
    const app = getApp();
    const router = new Router({
      adaptors: [JoiAdaptor],
    });
    app.use(koaBodyParser()).use(router.routes());

    router.add([
      {
        method: "get",
        path: "/params/:id",
        validate: {
          params: Joi.object({
            id: Joi.number().required(),
          }).required(),
        },
        handler: async (ctx) => {
          ctx.body = {
            params: ctx.request.params,
          };
        },
      },
    ]);

    const response = await request(app.callback()).get("/params/12345");
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      params: {
        id: 12345,
      },
    });
  });

  it("should be validate ctx.request.body and cast value inject", async () => {
    const app = getApp();
    const router = new Router({
      adaptors: [JoiAdaptor],
    });
    app.use(koaBodyParser()).use(router.routes());

    router.add([
      {
        method: "post",
        path: "/body",
        validate: {
          body: Joi.object({
            id: Joi.number().required(),
            collection: Joi.array().items(
              Joi.object({
                num: Joi.number().required(),
              })
            ),
          }),
        },
        handler: async (ctx) => {
          ctx.body = {
            body: ctx.request.body,
          };
        },
      },
    ]);

    const response = await request(app.callback())
      .post("/body")
      .send({
        id: "12345",
        collection: [
          {
            num: "1",
          },
          {
            num: "2",
          },
        ],
      });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      body: {
        id: 12345,
        collection: [
          {
            num: 1,
          },
          {
            num: 2,
          },
        ],
      },
    });
  });

  it("should be validate ctx.body(output) and cast value inject", async () => {
    const app = getApp();
    const router = new Router({
      adaptors: [JoiAdaptor],
    });
    app.use(koaBodyParser()).use(router.routes());

    router.add([
      {
        method: "get",
        path: "/output",
        validate: {
          output: {
            200: {
              body: Joi.object({
                id: Joi.number().required(),
                collection: Joi.array().items(
                  Joi.object({
                    num: Joi.number().required(),
                  })
                ),
              }).options({ stripUnknown: true }),
            },
          },
        },
        handler: async (ctx) => {
          ctx.body = {
            id: "12345",
            collection: [
              {
                num: "1",
              },
              {
                num: "2",
              },
            ],
            strip1: "test",
            strip2: [],
            strip3: {
              test: "test",
            },
          };
        },
      },
    ]);

    const response = await request(app.callback()).get("/output");
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      id: 12345,
      collection: [
        {
          num: 1,
        },
        {
          num: 2,
        },
      ],
    });
  });

  it("Generate OpenAPI Spec from routes", async () => {
    const router = new Router({
      adaptors: [JoiAdaptor],
    });

    router.add([
      {
        method: "get",
        path: "/",
        meta: {
          document: {
            summary: "Hello World",
            description: "this is description",
          },
        },
        validate: {
          query: Joi.object({
            name: Joi.string(),
          }),
        },
        handler: async (ctx) => {
          ctx.body = `Hello World, ${ctx.query.name}`;
        },
      },
      {
        method: "post",
        path: "/users",
        meta: {
          document: {
            summary: "Create User",
          },
        },
        validate: {
          body: Joi.object({
            name: Joi.string(),
          }),
        },
        handler: async (ctx) => {
          ctx.status = 201;
          ctx.body = `Created`;
        },
      },
      {
        method: "get",
        path: "/users",
        meta: {
          document: {
            summary: "List Users",
          },
        },
        validate: {
          output: {
            200: {
              body: Joi.array().items(
                Joi.object({
                  name: Joi.string().required(),
                  age: Joi.number().required(),
                })
              ),
            },
          },
        },
        handler: async (ctx) => {
          ctx.body = [];
        },
      },
      {
        method: "get",
        path: "/users/:id",
        meta: {
          document: {
            summary: "Details User",
          },
        },
        validate: {
          output: {
            200: {
              body: Joi.object({
                name: Joi.string().required(),
                age: Joi.number().required(),
              }),
            },
            404: {
              body: Joi.object({
                message: Joi.string().required(),
              }).description("User not found"),
            },
          },
        },
        handler: async (ctx) => {
          ctx.body = {};
        },
      },
    ]);

    const spec = router.generateOpenApiSpecJson({
      info: {
        title: "koa-x-router",
        version: "1.0.0",
      },
    });

    expect(JSON.parse(spec)).toEqual({
      openapi: "3.1.0",
      info: { title: "koa-x-router", version: "1.0.0" },
      paths: {
        "/": {
          get: {
            summary: "Hello World",
            description: "this is description",
            parameters: [
              {
                in: "query",
                name: "name",
                schema: {
                  type: "string",
                },
              },
            ],
            responses: { "200": { description: "Success" } },
          },
        },
        "/users": {
          post: {
            summary: "Create User",
            responses: { "200": { description: "Success" } },
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { name: { type: "string" } },
                    additionalProperties: false,
                  },
                },
              },
            },
          },
          get: {
            summary: "List Users",
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          age: { type: "number", format: "float" },
                        },
                        required: ["name", "age"],
                        additionalProperties: false,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/users/:id": {
          get: {
            summary: "Details User",
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        age: { type: "number", format: "float" },
                      },
                      required: ["name", "age"],
                      additionalProperties: false,
                    },
                  },
                },
              },
              "404": {
                description: "User not found",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: { message: { type: "string" } },
                      required: ["message"],
                      additionalProperties: false,
                      description: "User not found",
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it("Generate OpenAPI Spec from nested routes", async () => {
    const rootRouter = new Router({
      adaptors: [JoiAdaptor],
    });
    const childRouter1 = new Router({
      adaptors: [JoiAdaptor],
    });
    const childRouter2 = new Router({
      adaptors: [JoiAdaptor],
    });

    rootRouter.add({
      method: "get",
      path: "/",
      meta: {
        document: {
          summary: "Hello World",
          description: "this is description",
        },
      },
      validate: {
        query: Joi.object({
          name: Joi.string(),
        }),
      },
      handler: async (ctx) => {
        ctx.body = `Hello World, ${ctx.query.name}`;
      },
    });

    childRouter1.add([
      {
        method: "post",
        path: "/users",
        meta: {
          document: {
            summary: "Create User",
          },
        },
        validate: {
          body: Joi.object({
            name: Joi.string(),
          }),
        },
        handler: async (ctx) => {
          ctx.status = 201;
          ctx.body = `Created`;
        },
      },
      {
        method: "get",
        path: "/users",
        meta: {
          document: {
            summary: "List Users",
          },
        },
        validate: {
          output: {
            200: {
              body: Joi.array().items(
                Joi.object({
                  name: Joi.string().required(),
                  age: Joi.number().required(),
                })
              ),
            },
          },
        },
        handler: async (ctx) => {
          ctx.body = [];
        },
      },
    ]);
    childRouter2.add([
      {
        method: "get",
        path: "/users/:id",
        meta: {
          document: {
            summary: "Details User",
          },
        },
        validate: {
          params: Joi.object({
            id: Joi.number().positive().integer().required(),
          }),
          output: {
            200: {
              body: Joi.object({
                name: Joi.string().required(),
                age: Joi.number().required(),
              }),
            },
            404: {
              body: Joi.object({
                message: Joi.string().required(),
              }).description("User not found"),
            },
          },
        },
        handler: async (ctx) => {
          ctx.body = {};
        },
      },
    ]);

    rootRouter.use("/child1", childRouter1.routes());
    rootRouter.use("/child2", childRouter2.routes());

    const spec = rootRouter.generateOpenApiSpecJson({
      info: {
        title: "koa-x-router",
        version: "1.0.0",
      },
    });

    expect(JSON.parse(spec)).toEqual({
      openapi: "3.1.0",
      info: { title: "koa-x-router", version: "1.0.0" },
      paths: {
        "/": {
          get: {
            summary: "Hello World",
            description: "this is description",
            parameters: [
              {
                in: "query",
                name: "name",
                schema: {
                  type: "string",
                },
              },
            ],
            responses: { "200": { description: "Success" } },
          },
        },
        "/child1/users": {
          post: {
            summary: "Create User",
            responses: { "200": { description: "Success" } },
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { name: { type: "string" } },
                    additionalProperties: false,
                  },
                },
              },
            },
          },
          get: {
            summary: "List Users",
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          age: { type: "number", format: "float" },
                        },
                        required: ["name", "age"],
                        additionalProperties: false,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/child2/users/:id": {
          get: {
            summary: "Details User",
            parameters: [
              {
                in: "path",
                name: "id",
                schema: {
                  minimum: 1,
                  type: "integer",
                },
              },
            ],
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        age: { type: "number", format: "float" },
                      },
                      required: ["name", "age"],
                      additionalProperties: false,
                    },
                  },
                },
              },
              "404": {
                description: "User not found",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: { message: { type: "string" } },
                      required: ["message"],
                      additionalProperties: false,
                      description: "User not found",
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it("Generate OpenAPI Spec from nested routes with prefix", async () => {
    const rootRouter = new Router({
      adaptors: [JoiAdaptor],
    });
    const childRouter1 = new Router({
      adaptors: [JoiAdaptor],
    });
    childRouter1.prefix("/child1");
    const childRouter2 = new Router({
      adaptors: [JoiAdaptor],
    });
    childRouter2.prefix("/child2");

    rootRouter.add({
      method: "get",
      path: "/",
      meta: {
        document: {
          summary: "Hello World",
          description: "this is description",
        },
      },
      validate: {
        query: Joi.object({
          name: Joi.string(),
        }),
      },
      handler: async (ctx) => {
        ctx.body = `Hello World, ${ctx.query.name}`;
      },
    });

    childRouter1.add([
      {
        method: "post",
        path: "/users",
        meta: {
          document: {
            summary: "Create User",
          },
        },
        validate: {
          body: Joi.object({
            name: Joi.string(),
          }),
        },
        handler: async (ctx) => {
          ctx.status = 201;
          ctx.body = `Created`;
        },
      },
      {
        method: "get",
        path: "/users",
        meta: {
          document: {
            summary: "List Users",
          },
        },
        validate: {
          output: {
            200: {
              body: Joi.array().items(
                Joi.object({
                  name: Joi.string().required(),
                  age: Joi.number().required(),
                })
              ),
            },
          },
        },
        handler: async (ctx) => {
          ctx.body = [];
        },
      },
    ]);
    childRouter2.add([
      {
        method: "get",
        path: "/users/:id",
        meta: {
          document: {
            summary: "Details User",
          },
        },
        validate: {
          params: Joi.object({
            id: Joi.number().positive().integer().required(),
          }),
          output: {
            200: {
              body: Joi.object({
                name: Joi.string().required(),
                age: Joi.number().required(),
              }),
            },
            404: {
              body: Joi.object({
                message: Joi.string().required(),
              }).description("User not found"),
            },
          },
        },
        handler: async (ctx) => {
          ctx.body = {};
        },
      },
    ]);

    rootRouter.use(childRouter1.routes());
    rootRouter.use(childRouter2.routes());

    const spec = rootRouter.generateOpenApiSpecJson({
      info: {
        title: "koa-x-router",
        version: "1.0.0",
      },
    });

    expect(JSON.parse(spec)).toEqual({
      openapi: "3.1.0",
      info: { title: "koa-x-router", version: "1.0.0" },
      paths: {
        "/": {
          get: {
            summary: "Hello World",
            description: "this is description",
            parameters: [
              {
                in: "query",
                name: "name",
                schema: {
                  type: "string",
                },
              },
            ],
            responses: { "200": { description: "Success" } },
          },
        },
        "/child1/users": {
          post: {
            summary: "Create User",
            responses: { "200": { description: "Success" } },
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { name: { type: "string" } },
                    additionalProperties: false,
                  },
                },
              },
            },
          },
          get: {
            summary: "List Users",
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          age: { type: "number", format: "float" },
                        },
                        required: ["name", "age"],
                        additionalProperties: false,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/child2/users/:id": {
          get: {
            summary: "Details User",
            parameters: [
              {
                in: "path",
                name: "id",
                schema: {
                  minimum: 1,
                  type: "integer",
                },
              },
            ],
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        age: { type: "number", format: "float" },
                      },
                      required: ["name", "age"],
                      additionalProperties: false,
                    },
                  },
                },
              },
              "404": {
                description: "User not found",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: { message: { type: "string" } },
                      required: ["message"],
                      additionalProperties: false,
                      description: "User not found",
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
