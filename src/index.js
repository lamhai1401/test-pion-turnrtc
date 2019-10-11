//@ts-check
const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const querystring = require('querystring');

const server = http.createServer();
const wsSignal = require("./ws-signal")
const PORT = process.env.PORT || 8080


server.on('upgrade', function upgrade(request, socket, head) {
  let pathname = url.parse(request.url).pathname;
  const query = { ...querystring.parse(url.parse(request.url).query) }


  if(pathname.endsWith("/"))
    pathname = pathname.slice(0,-1)

  console.log({pathname})


  if(pathname == '' || pathname == "/signal"){
    console.log("start signal for", query)
    wsSignal.handleUpgrade(request, socket, head, function done(ws) {
      wsSignal.emit('connection', ws, request, { pathname, query });
    });
  }else if(pathname == 'group'){

  }
});



server.listen(PORT);
console.log("server started on port " + PORT)