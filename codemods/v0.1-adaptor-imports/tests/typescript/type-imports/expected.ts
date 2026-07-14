import type { XRouterAdaptor } from 'koa-x-router';
import type { JoiAdaptor as JoiAdaptorType } from 'koa-x-router/joi';
import { Router } from 'koa-x-router';
import { type ZodAdaptor } from 'koa-x-router/zod';

export type Adaptors = [XRouterAdaptor, JoiAdaptorType, typeof ZodAdaptor];
export { Router };
