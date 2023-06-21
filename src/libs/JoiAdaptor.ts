/**
 * 어댑터 인터페이스에 맞춰 Joi를 이용해 Validation을 수행할수 있게 하는 구현체
 */
import Joi from "joi";
import { SchemaObject, SchemaObjectType } from "openapi3-ts/oas31";
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

    await schema.validateAsync(data);
  },

  schemaToOpenApiSchema(schemaLike) {
    const schema = Joi.isSchema(schemaLike)
      ? schemaLike
      : Joi.object(schemaLike);

    return convertJoiSchemaToOpenApi(schema as Joi.ObjectSchema);
  },
};

// Joi 스키마를 OpenAPI Spec으로 변환하는 함수
function convertJoiSchemaToOpenApi(schema: Joi.ObjectSchema): SchemaObject {
  const openapiSchema: SchemaObject = {
    type: "object",
    properties: {},
    required: [],
  };

  const joiKeys = Object.keys(schema.describe().keys);
  for (const key of joiKeys) {
    const joiSchema = schema.extract(key);
    const openapiProperty: SchemaObject = {
      ...convertJoiTypeToOpenApi(joiSchema),
      description: joiSchema.describe().description,
    };

    if (joiSchema._flags.presence === "required") {
      openapiSchema.required!.push(key);
    }

    openapiSchema.properties![key] = openapiProperty;
  }

  return openapiSchema;
}

// Joi 데이터 유형을 OpenAPI Spec 데이터 유형으로 변환하는 함수
function convertJoiTypeToOpenApi(schema: Joi.Schema): Partial<SchemaObject> {
  let type: SchemaObjectType | undefined;
  let format:
    | "int32"
    | "int64"
    | "float"
    | "double"
    | "byte"
    | "binary"
    | "date"
    | "date-time"
    | "password"
    | string
    | undefined;

  if (schema.type === "string") {
    type = "string";
    if (schema._flags.insensitive) {
      format = "insensitive";
    } else if (schema._flags.email) {
      format = "email";
      // @ts-ignore
    } else if (schema._valids?.has("isoDate")) {
      format = "date-time";
    }
  } else if (schema.type === "number") {
    type = "number";
    if (schema._flags.integer) {
      format = "int32";
      // @ts-ignore
    } else if (schema._valids?.has("float")) {
      format = "float";
    } else {
      format = "double";
    }
  } else if (schema.type === "date") {
    type = "string";
    format = "date";
  } else if (schema.type === "boolean") {
    type = "boolean";
  } else if (schema.type === "array") {
    type = "array";
    const itemsSchema = (schema as Joi.ArraySchema).$_terms.items[0];
    return {
      type,
      items: convertJoiTypeToOpenApi(itemsSchema),
    };
  } else if (schema.type === "object") {
    type = "object";
    return {
      type,
      properties: convertJoiSchemaToOpenApi(schema as Joi.ObjectSchema)
        .properties,
    };
  }

  return {
    type,
    format,
  };
}
