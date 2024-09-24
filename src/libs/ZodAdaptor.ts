/**
 * 어댑터 인터페이스에 맞춰 Zod를 이용해 Validation을 수행할수 있게 하는 구현체
 */
import { z } from 'zod';
import { extendZodWithOpenApi, OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { XRouterAdaptor } from './Router';

extendZodWithOpenApi(z);

export const ZodAdaptor: XRouterAdaptor = {
    name: 'zod',

    isCompatibleSchema(schemaLike): schemaLike is z.ZodType {
        return schemaLike instanceof z.ZodType;
    },

    async validate(schemaLike, data) {
        const schema = schemaLike instanceof z.ZodType ? schemaLike : z.object(schemaLike as Record<string, any>);

        return schema.parseAsync(data);
    },

    schemaToOpenApiSchema(schemaLike) {
        const schema = schemaLike instanceof z.ZodType ? schemaLike : z.object(schemaLike as Record<string, any>);

        const registry = new OpenAPIRegistry();

        registry.register('schema', schema);

        const generator = new OpenApiGeneratorV31(registry.definitions);

        const schemaObject = generator.generateComponents().components?.schemas?.schema;

        if (!schemaObject) {
            throw new Error('Failed to generate schema object');
        }

        if ('$ref' in schemaObject) {
            throw new Error('ReferenceObject is not supported');
        }

        return schemaObject;
    },
};
