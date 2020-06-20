# gear
A body parser for koa. Support `json` and `multipart/form-data` type body.

# Usage
```js
const Koa = require('koa')
const gear = require('@iro/gear')

const app = new Koa()
app
  .use(gear())
  .use(async ctx => {
    // multipart/form-data
    /**
     * interface {
     *   name: string
     *   filename: string
     *   data: Buffer | stream
     * }
     */
    ctx.request.form

    // json
    ctx.request.json
  })
```