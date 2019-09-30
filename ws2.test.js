let socketio = require("socket.io-client")


let con2 = socketio.connect("http://localhost:8080", {
  query: { id: "2" }
})


con2.on("connect", () => {
  console.log("con2 connected")
  con2.send("1", { hello: "world" })
})

con2.on("message", (id, data) => {
  console.log("con2", id, data)
})