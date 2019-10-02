const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const querystring = require('querystring');

const server = http.createServer();
const wss1 = new WebSocket.Server({ noServer: true });



server.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;
  const query = {...querystring.parse(url.parse(request.url).query)}

  wss1.handleUpgrade(request, socket, head, function done(ws) {
    wss1.emit('connection', ws, request, { pathname, query });
  });

});


/**
 * @type Map<string,Set<WebSocket>>
 */
let clientMap = new Map()


wss1.on(
  'connection',
  function connection(/**@type {WebSocket} */ws, request, { pathname, query }) {
    let id = query.id
    
    if (!clientMap.has(id)) {
      let s = new Set()
      clientMap.set(id, s)
    }
  
    clientMap.get(id).add(ws)

    ws.on("close", () => clientMap.get(id).delete(ws))

    ws.on("message", function(event) {
      let [targetId, message] = JSON.parse(event)
      for (let soc of clientMap.get(targetId) || []) {
        if(targetId != id){
          console.log(id,"->",targetId)
          soc.send(JSON.stringify([id,message]))
        }
      }
    })

  }
);



server.listen(process.env.PORT || 8080);