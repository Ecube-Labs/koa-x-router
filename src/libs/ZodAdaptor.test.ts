import { z } from 'zod';
import request from 'supertest';
import koaBodyParser from 'koa-bodyparser';
import { getApp } from '../../test/app';
import { ZodAdaptor, Router } from '.';

describe('koa-x-router API work with Zod', () => {
    it('should be define validate schema', async () => {
        const app = getApp();
        const router = new Router({
            adaptors: [ZodAdaptor],
        });
        app.use(router.routes());

        router.add({
            method: 'get',
            path: '/',
            validate: {
                query: z.object({ name: z.string() }),
            },
            handler: async (ctx) => {
                ctx.body = `Hello World, ${ctx.query.name}`;
            },
        });

        const [layer] = router.stack;

        expect(layer.path).toBe('/');
        expect(JSON.stringify(layer.opts.validate?.query)).toBe(JSON.stringify(z.object({ name: z.string() })));

        const response = await request(app.callback()).get('/?name=tim');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello World, tim');
    });

    it('throw error when empty adaptor', async () => {
        const router = new Router();

        expect(() => {
            router.add({
                method: 'get',
                path: '/',
                validate: {
                    query: z.object({ name: z.string() }),
                },
                handler: async (ctx) => {
                    ctx.body = 'Hello World';
                },
            });
        }).toThrow(/^Not found compatible adaptor for schema/g);
    });

    it('throw error when invalid data of schema', async () => {
        const app = getApp();
        const router = new Router({
            adaptors: [ZodAdaptor],
        });
        app.use(koaBodyParser()).use(router.routes());

        router.add([
            {
                method: 'get',
                path: '/query',
                validate: {
                    query: z.object({ name: z.string() }),
                },
                handler: async (ctx) => {
                    ctx.body = `Hello World, ${ctx.query.name}`;
                },
            },
            {
                method: 'post',
                path: '/body',
                validate: {
                    body: z.object({ age: z.number().optional() }),
                },
                handler: async (ctx) => {
                    ctx.body = `Hello World`;
                },
            },
            {
                method: 'get',
                path: '/header',
                validate: {
                    header: z.object({ authorization: z.string() }),
                },
                handler: async (ctx) => {
                    ctx.body = `Hello World`;
                },
            },
            {
                method: 'get',
                path: '/params/:id',
                validate: {
                    params: z.object({ id: z.enum(['tim', 'charlie']) }),
                },
                handler: async (ctx) => {
                    ctx.body = `Hello World`;
                },
            },
            {
                method: 'get',
                path: '/output1',
                validate: {
                    output: {
                        200: {
                            body: z.object({ id: z.enum(['tim', 'charlie']) }),
                        },
                    },
                },
                handler: async (ctx) => {
                    ctx.body = {
                        id: 'ben',
                    };
                },
            },
            {
                method: 'get',
                path: '/output2',
                validate: {
                    output: {
                        200: {
                            body: z.object({ id: z.enum(['tim', 'charlie']) }),
                        },
                        201: {
                            body: z.enum(['created~~']),
                        },
                    },
                },
                handler: async (ctx) => {
                    ctx.status = 201;
                    ctx.body = 'created^^';
                },
            },
        ]);

        const response1 = await request(app.callback()).get('/query');
        expect(response1.status).toBe(400);
        expect(JSON.parse(response1.text)).toEqual([
            {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',
                path: ['name'],
                message: 'Required',
            },
        ]);

        const response2 = await request(app.callback()).post('/body').send({
            age: 'dasdas',
        });
        expect(response2.status).toBe(400);
        expect(JSON.parse(response2.text)).toEqual([
            {
                code: 'invalid_type',
                expected: 'number',
                received: 'string',
                path: ['age'],
                message: 'Expected number, received string',
            },
        ]);

        const response3 = await request(app.callback()).get('/header');
        expect(response3.status).toBe(400);
        expect(JSON.parse(response3.text)).toEqual([
            {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',
                path: ['authorization'],
                message: 'Required',
            },
        ]);

        const response4 = await request(app.callback()).get('/params/ben');
        expect(response4.status).toBe(400);
        expect(JSON.parse(response4.text)).toEqual([
            {
                received: 'ben',
                code: 'invalid_enum_value',
                options: ['tim', 'charlie'],
                path: ['id'],
                message: "Invalid enum value. Expected 'tim' | 'charlie', received 'ben'",
            },
        ]);

        const response5 = await request(app.callback()).get('/output1');
        expect(response5.status).toBe(400);
        expect(JSON.parse(response5.text)).toEqual([
            {
                code: 'invalid_enum_value',
                message: "Invalid enum value. Expected 'tim' | 'charlie', received 'ben'",
                options: ['tim', 'charlie'],
                path: ['id'],
                received: 'ben',
            },
        ]);

        const response6 = await request(app.callback()).get('/output2');
        expect(response6.status).toBe(400);
        expect(JSON.parse(response6.text)).toEqual([
            {
                code: 'invalid_enum_value',
                message: "Invalid enum value. Expected 'created~~', received 'created^^'",
                options: ['created~~'],
                path: [],
                received: 'created^^',
            },
        ]);
    });

    it('should be validate ctx.request.header and cast value inject', async () => {
        const app = getApp();
        const router = new Router({
            adaptors: [ZodAdaptor],
        });
        app.use(koaBodyParser()).use(router.routes());

        router.add([
            {
                method: 'get',
                path: '/header',
                validate: {
                    header: z.object({ numbertest: z.coerce.number() }),
                },
                handler: async (ctx) => {
                    ctx.body = {
                        headers: ctx.request.headers,
                    };
                },
            },
        ]);

        const response = await request(app.callback()).get('/header').set({
            numbertest: '12345',
        });
        expect(response.status).toBe(200);
        expect(response.body).toStrictEqual({
            headers: expect.objectContaining({
                numbertest: 12345,
            }),
        });
    });

    it('should be validate ctx.request.query and cast value inject', async () => {
        const app = getApp();
        const router = new Router({
            adaptors: [ZodAdaptor],
        });
        app.use(koaBodyParser()).use(router.routes());

        router.add([
            {
                method: 'get',
                path: '/query',
                validate: {
                    query: z
                        .object({
                            numbertest: z.coerce.number(),
                            arraytest: z.array(z.coerce.number()),
                            numbooltest1: z.coerce.boolean(),
                            numbooltest2: z.coerce.number().pipe(z.coerce.boolean()),
                            numbooltest3: z.coerce.number().pipe(z.coerce.boolean()),
                        })
                        .required(),
                },
                handler: async (ctx) => {
                    ctx.body = {
                        query: ctx.request.query,
                    };
                },
            },
        ]);

        const response = await request(app.callback()).get(
            '/query?numbertest=12345&arraytest=100&arraytest=999&numbooltest1=true&numbooltest2=1&numbooltest3=0',
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

    it('should be validate ctx.request.params and cast value inject', async () => {
        const app = getApp();
        const router = new Router({
            adaptors: [ZodAdaptor],
        });
        app.use(koaBodyParser()).use(router.routes());

        router.add([
            {
                method: 'get',
                path: '/params/:id',
                validate: {
                    params: z.object({ id: z.coerce.number() }),
                },
                handler: async (ctx) => {
                    ctx.body = {
                        params: ctx.request.params,
                    };
                },
            },
        ]);

        const response = await request(app.callback()).get('/params/12345');
        expect(response.status).toBe(200);
        expect(response.body).toStrictEqual({
            params: {
                id: 12345,
            },
        });
    });

    it('should be validate ctx.request.body and cast value inject', async () => {
        const app = getApp();
        const router = new Router({
            adaptors: [ZodAdaptor],
        });
        app.use(koaBodyParser()).use(router.routes());

        router.add([
            {
                method: 'post',
                path: '/body',
                validate: {
                    body: z.object({
                        id: z.coerce.number(),
                        collection: z.array(z.object({ num: z.coerce.number() })),
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
            .post('/body')
            .send({
                id: '12345',
                collection: [{ num: '1' }, { num: '2' }],
            });
        expect(response.status).toBe(200);
        expect(response.body).toStrictEqual({
            body: {
                id: 12345,
                collection: [{ num: 1 }, { num: 2 }],
            },
        });
    });

    it('should be validate ctx.body(output) and cast value inject', async () => {
        const app = getApp();
        const router = new Router({
            adaptors: [ZodAdaptor],
        });
        app.use(koaBodyParser()).use(router.routes());

        router.add([
            {
                method: 'get',
                path: '/output',
                validate: {
                    output: {
                        200: {
                            body: z.object({
                                id: z.coerce.number(),
                                collection: z.array(z.object({ num: z.coerce.number() })),
                            }),
                        },
                    },
                },
                handler: async (ctx) => {
                    ctx.body = {
                        id: '12345',
                        collection: [{ num: '1' }, { num: '2' }],
                        strip1: 'test',
                        strip2: [],
                        strip3: { test: 'test' },
                    };
                },
            },
        ]);

        const response = await request(app.callback()).get('/output');
        expect(response.status).toBe(200);
        expect(response.body).toStrictEqual({
            id: 12345,
            collection: [{ num: 1 }, { num: 2 }],
        });
    });

    it('Generate OpenAPI Spec from routes', async () => {
        const router = new Router({
            adaptors: [ZodAdaptor],
        });

        router.add([
            {
                method: 'get',
                path: '/',
                meta: {
                    document: {
                        summary: 'Hello World',
                        description: 'this is description',
                    },
                },
                validate: {
                    query: z.object({ name: z.string() }),
                },
                handler: async (ctx) => {
                    ctx.body = `Hello World, ${ctx.query.name}`;
                },
            },
            {
                method: 'post',
                path: '/users',
                meta: {
                    document: {
                        summary: 'Create User',
                    },
                },
                validate: {
                    body: z.object({ name: z.string().optional() }),
                },
                handler: async (ctx) => {
                    ctx.status = 201;
                    ctx.body = `Created`;
                },
            },
            {
                method: 'get',
                path: '/users',
                meta: {
                    document: {
                        summary: 'List Users',
                    },
                },
                validate: {
                    output: {
                        200: {
                            body: z.array(z.object({ name: z.string(), age: z.number() })),
                        },
                    },
                },
                handler: async (ctx) => {
                    ctx.body = [];
                },
            },
            {
                method: 'get',
                path: '/users/:id',
                meta: {
                    document: {
                        summary: 'Details User',
                    },
                },
                validate: {
                    output: {
                        200: {
                            body: z.object({ name: z.string(), age: z.number() }),
                        },
                        404: {
                            body: z.object({ message: z.string() }).describe('User not found'),
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
                title: 'koa-x-router',
                version: '1.0.0',
            },
        });

        expect(JSON.parse(spec)).toEqual({
            openapi: '3.1.0',
            info: { title: 'koa-x-router', version: '1.0.0' },
            paths: {
                '/': {
                    get: {
                        summary: 'Hello World',
                        description: 'this is description',
                        parameters: [
                            {
                                in: 'query',
                                name: 'name',
                                schema: {
                                    type: 'string',
                                },
                            },
                        ],
                        responses: { '200': { description: 'Success' } },
                    },
                },
                '/users': {
                    post: {
                        summary: 'Create User',
                        responses: { '200': { description: 'Success' } },
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: { name: { type: 'string' } },
                                    },
                                },
                            },
                        },
                    },
                    get: {
                        summary: 'List Users',
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    age: { type: 'number' },
                                                },
                                                required: ['name', 'age'],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                '/users/:id': {
                    get: {
                        summary: 'Details User',
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string' },
                                                age: { type: 'number' },
                                            },
                                            required: ['name', 'age'],
                                        },
                                    },
                                },
                            },
                            '404': {
                                description: 'User not found',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: { message: { type: 'string' } },
                                            required: ['message'],
                                            description: 'User not found',
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

    it('Generate OpenAPI Spec from nested routes', async () => {
        const rootRouter = new Router({
            adaptors: [ZodAdaptor],
        });
        const childRouter1 = new Router({
            adaptors: [ZodAdaptor],
        });
        const childRouter2 = new Router({
            adaptors: [ZodAdaptor],
        });

        rootRouter.add({
            method: 'get',
            path: '/',
            meta: {
                document: {
                    summary: 'Hello World',
                    description: 'this is description',
                },
            },
            validate: {
                query: z.object({ name: z.string().optional() }),
            },
            handler: async (ctx) => {
                ctx.body = `Hello World, ${ctx.query.name}`;
            },
        });

        childRouter1.add([
            {
                method: 'post',
                path: '/users',
                meta: {
                    document: {
                        summary: 'Create User',
                    },
                },
                validate: {
                    body: z.object({ name: z.string().optional() }),
                },
                handler: async (ctx) => {
                    ctx.status = 201;
                    ctx.body = `Created`;
                },
            },
            {
                method: 'get',
                path: '/users',
                meta: {
                    document: {
                        summary: 'List Users',
                    },
                },
                validate: {
                    output: {
                        200: {
                            body: z.array(z.object({ name: z.string(), age: z.number() })),
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
                method: 'get',
                path: '/users/:id',
                meta: {
                    document: {
                        summary: 'Details User',
                    },
                },
                validate: {
                    params: z.object({ id: z.number().positive().int() }),
                    output: {
                        200: {
                            body: z.object({ name: z.string(), age: z.number() }),
                        },
                        404: {
                            body: z.object({ message: z.string() }).describe('User not found'),
                        },
                    },
                },
                handler: async (ctx) => {
                    ctx.body = {};
                },
            },
        ]);

        rootRouter.use('/child1', childRouter1.routes());
        rootRouter.use('/child2', childRouter2.routes());

        const spec = rootRouter.generateOpenApiSpecJson({
            info: {
                title: 'koa-x-router',
                version: '1.0.0',
            },
        });

        expect(JSON.parse(spec)).toEqual({
            openapi: '3.1.0',
            info: { title: 'koa-x-router', version: '1.0.0' },
            paths: {
                '/': {
                    get: {
                        summary: 'Hello World',
                        description: 'this is description',
                        parameters: [
                            {
                                in: 'query',
                                name: 'name',
                                schema: {
                                    type: 'string',
                                },
                            },
                        ],
                        responses: { '200': { description: 'Success' } },
                    },
                },
                '/child1/users': {
                    post: {
                        summary: 'Create User',
                        responses: { '200': { description: 'Success' } },
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: { name: { type: 'string' } },
                                    },
                                },
                            },
                        },
                    },
                    get: {
                        summary: 'List Users',
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    age: { type: 'number' },
                                                },
                                                required: ['name', 'age'],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                '/child2/users/:id': {
                    get: {
                        summary: 'Details User',
                        parameters: [
                            {
                                in: 'path',
                                name: 'id',
                                schema: {
                                    exclusiveMinimum: 0,
                                    type: 'integer',
                                },
                            },
                        ],
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string' },
                                                age: { type: 'number' },
                                            },
                                            required: ['name', 'age'],
                                        },
                                    },
                                },
                            },
                            '404': {
                                description: 'User not found',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: { message: { type: 'string' } },
                                            required: ['message'],
                                            description: 'User not found',
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

    it('Generate OpenAPI Spec from nested routes with prefix', async () => {
        const rootRouter = new Router({
            adaptors: [ZodAdaptor],
        });
        const childRouter1 = new Router({
            adaptors: [ZodAdaptor],
        });
        childRouter1.prefix('/child1');
        const childRouter2 = new Router({
            adaptors: [ZodAdaptor],
        });
        childRouter2.prefix('/child2');

        rootRouter.add({
            method: 'get',
            path: '/',
            meta: {
                document: {
                    summary: 'Hello World',
                    description: 'this is description',
                },
            },
            validate: {
                query: z.object({
                    name: z.string(),
                }),
            },
            handler: async (ctx) => {
                ctx.body = `Hello World, ${ctx.query.name}`;
            },
        });

        childRouter1.add([
            {
                method: 'post',
                path: '/users',
                meta: {
                    document: {
                        summary: 'Create User',
                    },
                },
                validate: {
                    body: z.object({ name: z.string().optional() }),
                },
                handler: async (ctx) => {
                    ctx.status = 201;
                    ctx.body = `Created`;
                },
            },
            {
                method: 'get',
                path: '/users',
                meta: {
                    document: {
                        summary: 'List Users',
                    },
                },
                validate: {
                    output: {
                        200: {
                            body: z.array(z.object({ name: z.string(), age: z.number() }).optional()),
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
                method: 'get',
                path: '/users/:id',
                meta: {
                    document: {
                        summary: 'Details User',
                    },
                },
                validate: {
                    params: z.object({ id: z.number().positive().int() }),
                    output: {
                        200: {
                            body: z.object({ name: z.string(), age: z.number() }),
                        },
                        404: {
                            body: z.object({ message: z.string() }).optional().describe('User not found'),
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
                title: 'koa-x-router',
                version: '1.0.0',
            },
        });

        expect(JSON.parse(spec)).toEqual({
            openapi: '3.1.0',
            info: { title: 'koa-x-router', version: '1.0.0' },
            paths: {
                '/': {
                    get: {
                        summary: 'Hello World',
                        description: 'this is description',
                        parameters: [
                            {
                                in: 'query',
                                name: 'name',
                                schema: {
                                    type: 'string',
                                },
                            },
                        ],
                        responses: { '200': { description: 'Success' } },
                    },
                },
                '/child1/users': {
                    post: {
                        summary: 'Create User',
                        responses: { '200': { description: 'Success' } },
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: { name: { type: 'string' } },
                                    },
                                },
                            },
                        },
                    },
                    get: {
                        summary: 'List Users',
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    age: { type: 'number' },
                                                },
                                                required: ['name', 'age'],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                '/child2/users/:id': {
                    get: {
                        summary: 'Details User',
                        parameters: [
                            {
                                in: 'path',
                                name: 'id',
                                schema: {
                                    exclusiveMinimum: 0,
                                    type: 'integer',
                                },
                            },
                        ],
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string' },
                                                age: { type: 'number' },
                                            },
                                            required: ['name', 'age'],
                                        },
                                    },
                                },
                            },
                            '404': {
                                description: 'User not found',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: { message: { type: 'string' } },
                                            required: ['message'],
                                            description: 'User not found',
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
