/**
 * 어댑터 인터페이스에 맞춰 Joi를 이용해 Validation을 수행할수 있게 하는 구현체
 */
import * as Joi from "joi";
import j2s from "joi-to-swagger";
import { XRouterAdaptor } from "./Router";

export const JoiAdaptor: XRouterAdaptor = {
  name: "joi",

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
    const schema = Joi.isSchema(schemaLike)
      ? schemaLike
      : Joi.object(schemaLike);

    return await schema.validateAsync(data);
  },

  schemaToOpenApiSchema(schemaLike) {
    const schema = Joi.isSchema(schemaLike)
      ? schemaLike
      : Joi.object(schemaLike);

    return j2s(schema).swagger;
  },
};
