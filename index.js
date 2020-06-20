const {PassThrough} = require('stream')

module.exports = function(opt) {
  return async function(ctx, next) {
    if (ctx.method !== 'POST') {
      return next()
    }

    let resolve
    const contentType = ctx.get('content-type')
    const promise = new Promise(_resolve => {
      resolve = _resolve
    })

    const boundary = contentType.startsWith('multipart/form-data') && contentType.slice(30)
    if (boundary) {
      let item, i = 0, step = 0
      const form = ctx.request.form = {}
      ctx.request.req.on('data', buffer => {
        i = 0
        while (i < buffer.length) {
          switch (step) {
            // read line
            case 0: {
              const eol = buffer.indexOf('\r\n', i)
              if (eol < 0) return
              const line = buffer.toString('utf8', i, eol)
              i = eol + 2
              if (line.startsWith('Content-Disposition')) {
                const {filename, name} = getInfo(line)
                form[name] = item = {
                  filename,
                  data: filename ? new PassThrough() : Buffer.alloc(0)
                }
                console.log(name)
              } else if (line.startsWith('Content-Type')) {
                item.contentType = line.slice(14)
              } else if (line === '') step = 1
              break
            }

            // read data
            case 1: {
              const eol = buffer.indexOf(boundary, i)
              if (eol < 0) {
                item.filename ?
                  item.data.write(buffer.slice(i)) :
                  item.data = Buffer.concat([item.data, buffer.slice(i)])
                return
              } else { // end
                const data = buffer.slice(i, eol - 4)
                item.filename ?
                  item.data.end(data) :
                  item.data = Buffer.concat([item.data, data])
                i = eol
                step = 0
              }
              break
            }
          }
        }
      }).on('end', resolve)
    } else if (contentType.startsWith('application/json')) {
      let data = ''
      ctx.request.req.on('data', buffer => {
        data += buffer.toString()
      }).on('end', () => {
        ctx.request.json = JSON.parse(data)
        resolve()
      })
    } else resolve()

    await promise
    await next()
  }
}

function getInfo(raw) {
  const name = raw.match(/name="([^"]+)"/)?.[1]
  const filename = raw.match(/filename="([^"]+)"/)?.[1]
  return {name, filename}
}