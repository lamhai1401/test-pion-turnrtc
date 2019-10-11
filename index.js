//@ts-check
const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const querystring = require('querystring');

const server = http.createServer();
const wss1 = new WebSocket.Server({ noServer: true });



server.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;
  const query = { ...querystring.parse(url.parse(request.url).query) }

  wss1.handleUpgrade(request, socket, head, function done(ws) {
    wss1.emit('connection', ws, request, { pathname, query });
  });

});


function handlePingPong(/**@type {WebSocket} */ws) {
  let pingInterval = setInterval(
    () => ws.ping(),
    5000
  )

  ws.on("close", () => {
    clearInterval(pingInterval)
  })
}



/**
 * @type Map<string,WebSocket>
 */
let clientMap = new Map()



function handleSignal(/**@type {WebSocket} */ws, /**@type {string} */id) {

  if (clientMap.has(id)) {
    return ws.close(200, `Id ${id} was taken`)
  }

  clientMap.set(id, ws)

  ws.on("close", () => clientMap.delete(id))

  ws.on("message", function (event) {
    try {
      let [targetId, message] = JSON.parse(event + "")
      if (targetId != id && clientMap.has(targetId)) {
        clientMap
          .get(targetId)
          .send(JSON.stringify([id, message]))
        console.log(id, "->", targetId)
      }
    } catch (error) { }
  })
}

/**
 * @type Map<string,Set<WebSocket>>
 */
let tunnelMap = new Map()

function handleLiveConnection(/**@type {WebSocket} */ws, /**@type {string} */id) {

  if (!tunnelMap.has(id)) {
    let s = new Set()
    tunnelMap.set(id, s)
  }

  ws.on("close", () => {
    for (let soc of tunnelMap.get(id) || []) {
      soc && soc.send(JSON.stringify([id, { status: "disconnect" }]))
    }
    tunnelMap.delete(id)
  })

  ws.on("message", function (event) {
    try {
      let [targetId, message] = JSON.parse(event + '')
      if (clientMap.has(targetId)) {
        tunnelMap
          .get(id)
          .add(clientMap.get(targetId))
      }
    } catch (error) {

    }
  })
}


wss1.on(
  'connection',
  function connection(/**@type {WebSocket} */ws, request, { pathname, query }) {
    let id = query.id
    handlePingPong(ws)
    handleSignal(ws, id)
    handleLiveConnection(ws, id)
  }
);



server.listen(process.env.PORT || 8080);