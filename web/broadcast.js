
var iceConnectionLog = document.getElementById('ice-connection-state'),
    iceGatheringLog = document.getElementById('ice-gathering-state'),
    id_broadcast = document.getElementById('id-broadcast'),
    signalingLog = document.getElementById('signaling-state');

var id = ((0x10000) * Math.random() | 0).toString(16)
var viewerId = ""

let wsSignal = new WebSocket(`wss://beo-wsnative.herokuapp.com/?id=${id}`)

id_broadcast.textContent += id

console.log("id_broadcast", id_broadcast.textContent)

var config = {
    sdpSemantics: 'unified-plan',
    iceServers: [
        {
            urls: ['stun:stun.l.google.com:19302']
        },
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

pc.onicecandidate = function (event) {
    console.log("Send ICE candidate !!!")
    if (event.candidate) {
        wsSignal.send(JSON.stringify([viewerId, { candidate: event.candidate }]))
    } else {
        console.log(event)
        console.log("Send ICE candidate error !!!")
    }
}

wsSignal.onmessage = async event => {
    let [channel, data] = JSON.parse(event.data)
    viewerId = channel
    console.log(channel,data)
    try {
        if (data.viewer) {
            const gumStream = await navigator.mediaDevices.getUserMedia(
                { video: true, audio: true }
            );

            for (const track of gumStream.getTracks()) {
                pc.addTrack(track,gumStream);
            }
            
            let offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            let offers = pc.localDescription
            
            document.getElementById('offer-sdp').textContent = offers.sdp;

            wsSignal.send(JSON.stringify([channel, offers]))

            console.log("Send Offers !!!")

        } else if (data.sdp) {

            document.getElementById('answer-sdp').textContent = data.sdp;
            await pc.setRemoteDescription(data)

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
