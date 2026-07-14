const { Router, JoiAdaptor, ZodAdaptor: SchemaAdaptor } = require("koa-x-router")
const { JoiAdaptor: OnlyJoi } = require('koa-x-router');

void [Router, JoiAdaptor, SchemaAdaptor, OnlyJoi]
