/**
 * 어댑터 인터페이스에 맞춰 Joi를 이용해 Validation을 수행할수 있게 하는 구현체
 */
import Joi from 'joi';
import j2s from 'joi-to-swagger';
import type { XRouterAdaptor } from './Router.js';

export const JoiAdaptor: XRouterAdaptor = {
    name: 'joi',

    isCompatibleSchema(schemaLike) {
        try {
            if (Joi.isSchema(schemaLike)) {
                return true;
            }
        } catch {
            return false;
        }

        try {
            if (Joi.isSchema(Joi.object(schemaLike))) {
                return true;
            }
        } catch {
            return false;
        }

        return false;
    },

    async validate(schemaLike, data) {
        const schema = Joi.isSchema(schemaLike) ? schemaLike : Joi.object(schemaLike);

        return schema.validateAsync(data);
    },

    schemaToOpenApiSchema(schemaLike) {
        const schema = Joi.isSchema(schemaLike) ? schemaLike : Joi.object(schemaLike);
        const joiToSwagger = j2s as unknown as (value: Joi.Schema) => { swagger: Record<string, unknown> };

        return joiToSwagger(schema).swagger;
    },
};
