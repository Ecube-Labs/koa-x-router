import { Router } from 'koa-x-router';
import { JoiAdaptor } from 'koa-x-router/joi';

export const router = <main data-adaptor={JoiAdaptor.name}>{Router.name}</main>;
