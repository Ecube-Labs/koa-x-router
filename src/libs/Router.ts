import KoaRouter from "@koa/router";
import {
  ComponentsObject,
  ExternalDocumentationObject,
  InfoObject,
  OpenApiBuilder,
  ParameterObject,
  PathItemObject,
  PathsObject,
  RequestBodyObject,
  ResponsesObject,
  SchemaObject,
  SecurityRequirementObject,
  ServerObject,
  TagObject,
} from "openapi3-ts/oas31";

declare module "@koa/router" {
  export interface LayerOptions {
    validate?: XRouterValidateProperties;
  }

  export interface Layer {
    meta?: {
      // compatible for `koa-joi-router-docs`
      swagger?: SchemaMetadata; // === document
      document?: SchemaMetadata; // === swagger
    };
  }
}

export interface SchemaLike {}

type SupportMethod =
  | "get"
  | "post"
  | "delete"
  | "put"
  | "options"
  | "head"
  | "patch"
  | "trace";

type SchemaMetadata = {
  summary: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  [key: string]: any;
};

export interface RouteLayerSpec<StateT = any, CustomT = {}> {
  method: SupportMethod | Uppercase<SupportMethod>;
  path: string;
  meta?: {
    // compatible for `koa-joi-router-docs`
    swagger?: SchemaMetadata; // === document
    document?: SchemaMetadata; // === swagger
  };
  validate?: XRouterValidateProperties;
  handler: KoaRouter.Middleware<StateT, CustomT>;
}

/**
 * 공통 인터페이스를 기반으로 validation을 수행하는 koa-router 기반의 라우터
 * 각 route handler의 validate.[header | query | params | body | output]에 대한 validation을 수행한다.
 */
export class Router<StateT = any, CustomT = {}> extends KoaRouter<
  StateT,
  CustomT
> {
  adaptors: Record<string, XRouterAdaptor>;

  constructor({
    adaptors,
    ...pt
  }: KoaRouter.RouterOptions & { adaptors?: XRouterAdaptor[] } = {}) {
    super(pt);

    this.adaptors =
      adaptors?.reduce(
        (acc, adaptor) => ({
          ...acc,
          [adaptor.name]: adaptor,
        }),
        {}
      ) || {};
  }

  add(
    spec: RouteLayerSpec<StateT, CustomT> | RouteLayerSpec<StateT, CustomT>[]
  ) {
    const specs = Array.isArray(spec) ? spec : [spec];
    specs.forEach((spec) => {
      const { validate, meta } = spec;

      const layer = super.register(spec.path, [spec.method], [spec.handler], {
        name: spec.path,
      });

      layer.meta = meta;

      this.registerValidator(layer, validate);
    });
  }

  generateOpenApiSpecJson(metadata: {
    info: InfoObject;
    servers?: ServerObject[];
    paths?: PathsObject;
    components?: ComponentsObject;
    security?: SecurityRequirementObject[];
    tags?: TagObject[];
    externalDocs?: ExternalDocumentationObject;
    webhooks?: PathsObject;
  }): string {
    const builder = OpenApiBuilder.create({
      openapi: "3.1.0",
      ...metadata,
    });

    const paths = this.getRoutePaths(this.stack);
    Object.entries(paths).forEach(([path, pathItem]) => {
      builder.addPath(path, pathItem);
    });

    return builder.getSpecAsJson();
  }

  private getRoutePaths(stack: KoaRouter.Layer[]) {
    const pathItemByPath: Record<string, PathItemObject> = {};
    stack.forEach((layer) => {
      if (layer.path && layer.methods) {
        const pathItem: PathItemObject = pathItemByPath[layer.path] || {};

        const docMetadata = layer.meta?.document || layer.meta?.swagger;
        layer.methods.forEach((method) => {
          if (layer.methods.length > 1 && method.toLowerCase() === "head")
            return;

          pathItem[
            method.toLowerCase() as SupportMethod | Uppercase<SupportMethod>
          ] = {
            summary: docMetadata?.summary,
            description: docMetadata?.description,
            deprecated: docMetadata?.deprecated,
            tags: docMetadata?.tags,
            responses: this.getOASResponseSchema(layer),
            requestBody: this.getOASRequestBodySchema(layer),
            parameters: this.getOASRequestParameterSchema(layer),
          };
        });

        pathItemByPath[layer.path] = pathItem;
      }
    });
    return pathItemByPath;
  }

  private getOASRequestParameterSchema(
    layer: KoaRouter.Layer
  ): ParameterObject[] | undefined {
    const {
      header,
      _headerAdaptor,
      query,
      _queryAdaptor,
      params,
      _paramsAdaptor,
    } = layer.opts.validate || {};

    const parameters: ParameterObject[] = [];

    if (header && _headerAdaptor) {
      const schema = _headerAdaptor.schemaToOpenApiSchema(header);
      if (schema.properties) {
        parameters.push(
          ...Object.entries(schema.properties).map(([name, schema2]) => ({
            name,
            in: "header" as const,
            schema: schema2,
          }))
        );
      }
    }

    if (query && _queryAdaptor) {
      const schema = _queryAdaptor.schemaToOpenApiSchema(query);
      if (schema.properties) {
        parameters.push(
          ...Object.entries(schema.properties).map(([name, schema2]) => ({
            name,
            in: "query" as const,
            schema: schema2,
          }))
        );
      }
    }

    if (params && _paramsAdaptor) {
      const schema = _paramsAdaptor.schemaToOpenApiSchema(params);
      if (schema.properties) {
        parameters.push(
          ...Object.entries(schema.properties).map(([name, schema2]) => ({
            name,
            in: "path" as const,
            schema: schema2,
          }))
        );
      }
    }

    return parameters.length ? parameters : undefined;
  }

  private getOASRequestBodySchema(
    layer: KoaRouter.Layer
  ): RequestBodyObject | undefined {
    const { body, _bodyAdaptor } = layer.opts.validate || {};

    if (!body) {
      return;
    }

    return {
      content: {
        // TODO: json 말고 multipart같은 다른 타입도 지원해야 하는가?
        "application/json": {
          schema: _bodyAdaptor?.schemaToOpenApiSchema(body),
        },
      },
    };
  }

  private getOASResponseSchema(layer: KoaRouter.Layer): ResponsesObject {
    const { output, _outputAdaptor } = layer.opts.validate || {};

    // NOTE: 스펙상 필수 값이기 때문에 기본 응답으로 넣는다.
    if (!output) {
      return {
        200: {
          description: "Success",
        },
      };
    }

    return Object.entries(output).reduce(
      (acc, [statusCode, schemaLike]) => ({
        ...acc,
        [String(statusCode).split("-")[0]]: ((schema) => ({
          description: schema?.description || "Success",
          content: {
            "application/json": {
              schema,
            },
          },
        }))(_outputAdaptor?.schemaToOpenApiSchema(schemaLike)),
      }),
      {}
    );
  }

  private registerValidator(
    layer: KoaRouter.Layer,
    validate?: XRouterValidateProperties
  ) {
    if (validate) {
      layer.opts.validate = validate;
      if (layer.opts.validate.header) {
        layer.opts.validate._headerAdaptor = this.getAdaptorFromSchema(
          layer.opts.validate.header
        );
      }
      if (layer.opts.validate.query) {
        layer.opts.validate._queryAdaptor = this.getAdaptorFromSchema(
          layer.opts.validate.query
        );
      }
      if (layer.opts.validate.params) {
        layer.opts.validate._paramsAdaptor = this.getAdaptorFromSchema(
          layer.opts.validate.params
        );
      }
      if (layer.opts.validate.body) {
        layer.opts.validate._bodyAdaptor = this.getAdaptorFromSchema(
          layer.opts.validate.body
        );
      }
      if (layer.opts.validate.output) {
        layer.opts.validate._outputAdaptor = this.getAdaptorFromSchema(
          Object.values(layer.opts.validate.output)[0]
        );
      }

      layer.stack.unshift(this.makeValidateMiddleware(layer));
    }
  }

  private getAdaptorFromSchema(schema: any): XRouterAdaptor | undefined {
    const adaptor = Object.values(this.adaptors).find((adaptor) =>
      adaptor.isCompatibleSchema(schema)
    );

    if (!adaptor) {
      throw new Error(
        `Not found compatible adaptor for schema: ${JSON.stringify(schema)}`
      );
    }

    return adaptor;
  }

  private makeValidateMiddleware(
    layer: KoaRouter.Layer
  ): KoaRouter.Middleware<any, any> {
    return async (ctx, next) => {
      const {
        opts: { validate },
      } = layer;
      if (!validate) return await next();

      const {
        body,
        _bodyAdaptor,
        query,
        _queryAdaptor,
        header,
        _headerAdaptor,
        params,
        _paramsAdaptor,
        output,
        _outputAdaptor,
      } = validate;

      const errorHandler = (err: any) => {
        err.status = 400;
        return ctx.throw(err);
      };

      await _headerAdaptor
        ?.validate(header!, ctx.request.headers)
        .catch(errorHandler);
      await _paramsAdaptor
        ?.validate(params!, ctx.request.params)
        .catch(errorHandler);
      await _queryAdaptor
        ?.validate(query!, ctx.request.query)
        .catch(errorHandler);
      await _bodyAdaptor?.validate(body!, ctx.request.body).catch(errorHandler);

      await next();

      if (_outputAdaptor && output) {
        const [_, outputSchema] =
          Object.entries(output).find(([statusCodeRange]) =>
            this.isIncludedStatusCodeRange(statusCodeRange, Number(ctx.status))
          ) || [];

        if (outputSchema) {
          await _outputAdaptor
            .validate(outputSchema, ctx.body)
            .catch(errorHandler);
        }
      }
    };
  }

  private isIncludedStatusCodeRange(
    // ex) '200', '400-499', '500-599'
    range: string,
    statusCode: number
  ) {
    const [min, max] = range.split("-").map(Number);
    if (!max) return statusCode === min;
    return statusCode >= min && statusCode <= max;
  }
}

interface XRouterValidateProperties {
  header?: SchemaLike;
  _headerAdaptor?: XRouterAdaptor; // Router에 route 추가할때 스키마 기반으로 추론하여 지정

  query?: SchemaLike;
  _queryAdaptor?: XRouterAdaptor; // Router에 route 추가할때 스키마 기반으로 추론하여 지정

  params?: SchemaLike;
  _paramsAdaptor?: XRouterAdaptor; // Router에 route 추가할때 스키마 기반으로 추론하여 지정

  body?: SchemaLike;
  _bodyAdaptor?: XRouterAdaptor; // Router에 route 추가할때 스키마 기반으로 추론하여 지정

  /**
   * @example { 200: { ... }, '400-499': { ... } }
   */
  output?: {
    [statusCode: number | string]: SchemaLike;
  };
  _outputAdaptor?: XRouterAdaptor; // Router에 route 추가할때 스키마 기반으로 추론하여 지정

  [key: string]: any;
}

export interface XRouterAdaptor {
  /**
   * Adaptor name
   */
  name: string;

  /**
   * This method checks whether the schema is compatible with the adaptor.
   */
  isCompatibleSchema(schemaLike: SchemaLike): boolean;

  /**
   * This method validates the data with the schema.
   */
  validate(schemaLike: SchemaLike, data: any): Promise<void>;

  /**
   * This method converts the schema to OpenAPI schema.
   */
  schemaToOpenApiSchema(schemaLike: SchemaLike): SchemaObject;
}
