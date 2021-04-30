import http from 'node:http'
import { watch, stat } from 'node:fs/promises'
import process from 'node:process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'

const __dirname = dirname(fileURLToPath(import.meta.url))

// import('../app/handlers/index.js')
//   .then(module => console.log(module))

const ctx = {
  port: 1337,
  host: 'localhost',
  handlers: []
}

function runAsync(fn) {
  (async () => {
    try {
      await fn()
    } catch (err) {
      console.log(err)
    }
  })()
}

runAsync(async () => {
  const filepath = `${__dirname}/../app/handlers/index.js`
  const hashed = (path) => `${path}?h=${nanoid(6)}`

  ctx.handlers = (await import(hashed(filepath))).default

  const watcher = watch(filepath)
  console.log(`start watch ${filepath}`)

  for await (const event of watcher) {
    console.log(event)
    try {
      ctx.handlers = (await import(hashed(filepath))).default
      console.log(ctx)
    } catch (err) {
      console.log(err)
    }
  }
})



function bodyReader(request) {
  return new Promise((resolve) => {
    request.setEncoding('utf8')

    let chunks = []
    request.on('data', chunk => {
      chunks.push(chunk)
    })

    request.on('end', () => {
      resolve(chunks.join(''))
    })
  })
}

function urlToMap(url)
{
  const params = Object.fromEntries(url.searchParams.entries())

  return {
    origin: url.origin,
    protocol: url.protocol,
    host: url.host,
    port: url.port,
    path: url.pathname,
    username: url.username,
    password: url.password,
    params,
    queryParams: params
  }
}

function requestToMap(request) {
  const {method, url: rawUrl, headers} = request
  const url = urlToMap(new URL(rawUrl, `http://${headers.host}`))

  return {
    method,
    url,
    headers,
    bodyReader: bodyReader(request)
  }
}

function injectHandlerResponse(response, handlerResponse) {
  const {status = 200, body = null} = handlerResponse

  response.writeHead(200, {'Content-Type': 'text/plain'})
    .write(body)

  return response
}

function matchHandler(handlers, {url: {path}}) {
  return handlers.reduce((acc, {pattern, handler}) => {
    if (acc) {
      return acc
    }

    if (typeof pattern === 'object') {
      const match = pattern.exec(path)

      if (match !== null) {
        console.log(match.groups)
        return {handler, params: match.groups}
      }
    }

    if (typeof pattern === 'string' && pattern === path) {
      return {handler, params: {}}
    }

    return acc
  }, null)
}

const server = http.createServer((req, res) => {
  try {
    console.log("New request!")
    const request = requestToMap(req)
    console.log(request)

    const {handler, params} = matchHandler(ctx.handlers, request)
    const response = handler(request, params)

    console.log(response)

    injectHandlerResponse(res, response)
      .end()
  } catch (err) {
    console.error(err)
  }
})
server.on('error', err => {
  console.error(err)
})

server.listen({
  port: ctx.port,
  host: ctx.host
}, () => {
  console.log(`Server is listening on ${ctx.host}:${ctx.port}`)
})

