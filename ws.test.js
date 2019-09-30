let client = require("socket.io-client")



let con1 = client.connect("http://localhost:8080", {
  query: { id: "1" }
})

let con2 = client.connect("http://localhost:8080", {
  query: { id: "2" }
})

con1.on("connect", () => {
  console.log("con1 connected")
  con1.send("2", { hello: "world" })
})

con2.on("connect", () => {
  console.log("con2 connected")
  con2.send("1", { hello: "world" })
})

con1.on("message", (id, data) => {
  console.log("con1", id, data)
})

con2.on("message", (id, data) => {
  console.log("con2", id, data)
})