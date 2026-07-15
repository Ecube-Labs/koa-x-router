const { Router } = require("koa-x-router")
const { JoiAdaptor } = require("koa-x-router/joi")
const { ZodAdaptor: SchemaAdaptor } = require("koa-x-router/zod")
const { JoiAdaptor: OnlyJoi } = require('koa-x-router/joi');

void [Router, JoiAdaptor, SchemaAdaptor, OnlyJoi]
