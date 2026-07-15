import RouterDefault, { Router } from 'koa-x-router';
import { JoiAdaptor as Joi } from 'koa-x-router/joi';
import { ZodAdaptor } from 'koa-x-router/zod';

void [RouterDefault, Router, Joi, ZodAdaptor];
