let socketio = require("socket.io")

let io = socketio({})

io.listen(process.env.PORT || 8080)

/**
 * @type Map<string,Set<SocketIO.Socket>>
 */
let clientMap = new Map()

io.on("connection", socket => {
  let id = socket.handshake.query.id


  if (!clientMap.has(id)) {
    let s = new Set()
    clientMap.set(s)
  }

  clientMap.get(id).add(socket)
  socket.on("disconnected", clientMap.get(id).delete(socket))
  socket.on("message", (targetId, message) => {
    for (let soc of clientMap.get(targetId) || []) {
      soc.send("message", id, message)
    }
  })
})