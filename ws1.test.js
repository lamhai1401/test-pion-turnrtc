let socketio = require("socket.io-client")



let con1 = socketio.connect("http://localhost:8080", {
  query: { id: "1" }
})

con1.on("connect", () => {
  console.log("con1 connected")
  con1.send("2", { hello: "world" })
})

con1.on("message", (id, data) => {
  console.log("con1", id, data)
})
