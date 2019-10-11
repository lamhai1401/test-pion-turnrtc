//@ts-check
const WebSocket = require('ws');
// const events = require("events")

const wssGroup = new WebSocket.Server({ noServer: true });


/**
 * @type Map<string,Set<WebSocket>>
 */
let clientMap = new Map()

// let closedEvent = new events.EventEmitter()

function handleSignal(/**@type {WebSocket} */ws, /**@type {string} */id) {

  if (!clientMap.has(id)) {
    clientMap.set(id, new Set())
  }

  clientMap.get(id).add(ws)

  ws.on("close", () => {
    if (clientMap.has(id)) {
      clientMap.get(id).delete(ws)
      clientMap.get(id).size == 0 && clientMap.delete(id)
    }
  })

  ws.on("message", function (event) {
    try {
      let [targetId, message] = JSON.parse(event + "")

      for (let sock of clientMap.get(targetId) || []) {
        if (sock != ws) {
          sock.send(JSON.stringify([id, message]))
        }
      }
      console.log(id, "::: -> ", targetId)
    } catch (error) { 
      console.error(error)
    }
  })
}

/**
 * @type Map<string,Set<string>>
 */
let tunnelMap = new Map()

function handleLiveConnection(/**@type {WebSocket} */ws, /**@type {string} */id) {

  ws.on("close", () => {
    if (clientMap.has(id)) {
      clientMap.get(id).delete(ws)
      clientMap.get(id).size == 0 && clientMap.delete(id)
    }

    if (!clientMap.has(id)) {
      let allConnectedWs = [].concat(...[...tunnelMap.get(id)].map(e => [...clientMap.get(e) || []]))
      for (let sock of allConnectedWs)
        if (sock != ws)
          sock.send(JSON.stringify([id, { status: "disconnect" }]))
      tunnelMap.delete(id)
    }
  })

  ws.on("message", function (event) {
    try {
      let [targetId] = JSON.parse(event + '')
      if (clientMap.has(targetId)) {
        tunnelMap
          .get(id)
          .add(targetId)
      }
    } catch (error) {
      console.error(error)
    }
  })
}


wssGroup.on(
  'connection',
  function connection(/**@type {WebSocket} */ws, request, { pathname, query }) {
    let id = query.id
    if(pathname == '/call-group'){
      if(clientMap.has(id))
        return ws.close(200, `Id ${id} was taken`)
    }
    handleSignal(ws, id)
    handleLiveConnection(ws, id)
  }
);



module.exports = wssGroup