import { JoiAdaptor, Router } from 'koa-x-router';

export const router = <main data-adaptor={JoiAdaptor.name}>{Router.name}</main>;
