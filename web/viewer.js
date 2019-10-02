var iceConnectionLog = document.getElementById('ice-connection-state'),
    iceGatheringLog = document.getElementById('ice-gathering-state'),
    id_broadcast = document.getElementById('id-broadcast'),
    id_viewer = document.getElementById('id-viewer'),
    signalingLog = document.getElementById('signaling-state');

var id = ((0x10000) * Math.random() | 0).toString(16)
var broadcastId = ""

let wsSignal = new WebSocket(`ws://localhost:8080?id=${id}`)


id_viewer.textContent += id

var config = {
    iceServers: [
        {
            urls: ["turn:35.247.173.254:3478"],
            username: "username",
            credential: "password"
        }
    ]
};

var pc = new RTCPeerConnection(config)

// register some listeners to help debugging
pc.addEventListener('icegatheringstatechange', function () {
    iceGatheringLog.textContent += ' -> ' + pc.iceGatheringState;
}, false);
iceGatheringLog.textContent = pc.iceGatheringState;

pc.addEventListener('iceconnectionstatechange', function () {
    iceConnectionLog.textContent += ' -> ' + pc.iceConnectionState;
}, false);
iceConnectionLog.textContent = pc.iceConnectionState;

pc.addEventListener('signalingstatechange', function () {
    signalingLog.textContent += ' -> ' + pc.signalingState;
}, false);
signalingLog.textContent = pc.signalingState;

let inboundStream = null;

pc.ontrack = ev => {
    if (ev.streams && ev.streams[0]) {
        document.getElementById('video').srcObject = ev.streams[0];
    } else {
        if (!inboundStream) {
            inboundStream = new MediaStream();
            document.getElementById('video').srcObject = inboundStream;
        }
        inboundStream.addTrack(ev.track);
    }
}

pc.onicecandidate = function (event) {
    console.log("Send ICE candidate !!!")
    if (event.candidate) {
        // console.log("Send ICE candidate !!!",event)
        wsSignal.send(JSON.stringify([broadcastId, { candidate: event.candidate }]))
    } else {
        console.log(event)
        console.log("Send ICE candidate error !!!")
    }
}


wsSignal.onmessage = async event => {
    let [channel, data] = JSON.parse(event.data)
    console.log(channel,data)
    broadcastId = channel
    
    try {
        if (data.viewer) {

        } else if (data.sdp) {
            await pc.setRemoteDescription(data)

            let answer = await pc.createAnswer()

            await pc.setLocalDescription(answer)

            wsSignal.send(JSON.stringify([channel, answer]))
            console.log("Send Answer !!!")


        } else if (data.candidate) {

            try {

                await pc.addIceCandidate(data.candidate)
                console.info("add ice candidate success")
                console.info(data.candidate.candidate)
            } catch (error) {
                console.error(error)
                console.error(JSON.stringify(data.candidate))
            }
        } else {
            console.log(data)
        }
    } catch (error) {
        console.error(error)
    }
}

async function join() {
    wsSignal.send(JSON.stringify([id_broadcast.value, { viewer: true }]))
}