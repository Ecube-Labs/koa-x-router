import type { XRouterAdaptor, JoiAdaptor as JoiAdaptorType } from 'koa-x-router';
import { Router, type ZodAdaptor } from 'koa-x-router';

export type Adaptors = [XRouterAdaptor, JoiAdaptorType, typeof ZodAdaptor];
export { Router };
