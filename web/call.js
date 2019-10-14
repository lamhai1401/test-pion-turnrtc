//@ts-check

let iceConnectionLog = document.getElementById('ice-connection-state');
let iceGatheringLog = document.getElementById('ice-gathering-state');
let id_viewer = document.getElementById('your-id');
let id_caller = document.getElementById('call-id');
let signalingLog = document.getElementById('signaling-state');

var id = ((10000) * Math.random() | 0).toString();
var broadcastId = "";

function getTURNCredentials(name, secret) {

    var unixTimeStamp = parseInt(Date.now() / 1000) + 24 * 3600,   // this credential would be valid for the next 24 hours
        username = [unixTimeStamp, name].join(':');
    return {
        username: username,
        credential: CryptoJS.HmacSHA1(username, secret).toString(CryptoJS.enc.Base64)
    };
}

id_viewer.textContent += id;


var config = {
    sdpSemantics: 'unified-plan',
    rtcpMuxPolicy: "require",
    bundlePolicy: "max-bundle",
    iceServers: [
        {
            urls: ['stun:35.247.173.254']
        }
        // {
        //     urls: ["turn:35.247.173.254"],
        //     ...getTURNCredentials("username", "3575819665154b268af59efedee8826e")
        // },
    ],
};

let stunServerList = document.getElementById('stunServerList');
let stunServer = document.getElementById('turnServer');
let callrtc = null;

stunServerList.addEventListener("change", () => {

    config.iceServers = [
        {
            urls: [stunServerList.options[stunServerList.selectedIndex].value]
        }
    ];

    console.log(config.iceServers);
});

stunServer.addEventListener("input", () => {

    config.iceServers = [
        {
            urls: [stunServer.value]
        }
    ];

    console.log(config.iceServers);
});

let turnServerList = document.getElementById('turnServerList');
let turnServer = document.getElementById('turnServer');
let username = document.getElementById('username');
let password = document.getElementById('password');
let creadential = document.getElementById('creadential');

let turnAccount = {
    urls: [],
    username: 'test',
    credential: 'test'
};

turnServerList.addEventListener("change", () => {

    config.iceServers = [
        {
            urls: [turnServerList.options[turnServerList.selectedIndex].value],
            ...getTURNCredentials("username", "3575819665154b268af59efedee8826e")
        }
    ];

    console.log(config.iceServers);
});

turnServer.addEventListener("input", () => {
    turnAccount.urls = [turnServer.value];

    config.iceServers = [];
    config.iceServers.push(turnAccount);

    console.log(config.iceServers);
});

username.addEventListener("input", () => {
    turnAccount.username = username.value;

    config.iceServers = [];
    config.iceServers.push(turnAccount);

    console.log(config.iceServers);
});

password.addEventListener("input", () => {
    turnAccount.credential = password.value;

    config.iceServers = [];
    config.iceServers.push(turnAccount);

    console.log(config.iceServers);
});


creadential.addEventListener("input", () => {
    let temp = getTURNCredentials(username.value, creadential.value);
    turnAccount.credential = temp.credential;
    turnAccount.username = temp.username

    config.iceServers = [];
    config.iceServers.push(turnAccount);

    console.log(config.iceServers);
});

let wss_url = "";
let headers = new Headers();

headers.append('Accept', 'application/json');
headers.append('Access-Control-Allow-Origin', "*");
headers.append('Access-Control-Allow-Headers', "*");

fetch("https://testapp-dot-livestreaming-241004.appspot.com/api/config", {
    method: 'GET',
    headers: headers,
})
.then(resp => resp.json())
.then(turnConfig => {
    config.iceServers.push(turnConfig['turnServer']);
    wss_url = turnConfig['signal'];
    callrtc = new WebRTCCall(id);
})
.catch(err => alert(err));

class WebRTCCall {
    constructor(id) {
        this.id = id
        this.ws = new WebSocket(`${wss_url}/?id=${id}`);
        this.ws.onmessage = (event) => {
            let [channel, data] = JSON.parse(event.data);
            this.onSocketMessage(channel, data)
        }

        // setInterval(() => {})

        /**@type {Map<string,WebRTCCallPair>} */
        this.call = new Map()
    }

    onIncomingCall(sourceId, data) {

        let accept = confirm(`Accept call from ${sourceId}`)

        if (accept) {
            this.call.set(
                sourceId,
                new WebRTCCallPair(
                    { callId: sourceId, initiator: false },
                    (...data) => {
                        console.log("send", sourceId, ...data)
                        this.ws.send(JSON.stringify([sourceId, ...data]))
                    },
                    () => this.call.delete(sourceId)
                )
            )
            this.ws.send(JSON.stringify([sourceId, { response: "accept" }]))
        } else {
            this.ws.send(JSON.stringify([sourceId, { response: "reject" }]))
        }
    }

    async onSocketMessage(sourceId, data) {
        console.log("[onSocketMessage]", sourceId, data)
        if (data.status) {
            this.call.has(sourceId) && this.call.get(sourceId).onStatus(data)
        } else if (data.response) {
            this.call.has(sourceId) && this.call.get(sourceId).onResponse(data)
        } else if (data.sdp) {
            if (!this.call.get(sourceId))
                await this.onIncomingCall(sourceId, data)

            console.log("onSocketMessage", this.call.get(sourceId))

            this.call.has(sourceId) && this.call.get(sourceId).onSDP(data)
        } else if (data.candidate) {
            this.call.has(sourceId) && this.call.get(sourceId).onCandidate(data)
        }

    }


    async start(id) {
        this.call.set(
            id,
            new WebRTCCallPair(
                { callId: id, initiator: true },
                (...data) => {
                    console.log("send", id, ...data)
                    this.ws.send(JSON.stringify([id, ...data]))
                },
                () => this.call.delete(id)
            )
        )
        try {
            await this.call.get(id).start()
        } catch (error) {
            this.call.get(id) && this.call.get(id).destroy()
            this.call.delete(id)
        }
    }


}

class WebRTCCallPair {
    constructor({ callId, initiator }, signal, onDestroy) {
        this.event = new EventEmitter()
        this.callId = callId
        this.initiator = initiator
        this.pc = new RTCPeerConnection(config)
        this.signal = signal
        this.initDebug()
        this.initInStream()
        this.initOutStream()
        this.pc.onicecandidate = event => {
            console.log("candidate", event.candidate);
            if (event.candidate != null)
                signal({ candidate: event.candidate })
        }
        this.event.once("destroy", onDestroy)
    }

    initDebug() {
        this.pc.addEventListener('icegatheringstatechange', () => {
            iceGatheringLog.innerText += `-> ${this.pc.iceGatheringState}`
            console.log("[WebRTCCall] icegatheringstatechange", this.callId, this.pc.iceGatheringState)
        }, false);

        this.pc.addEventListener('iceconnectionstatechange', () => {
            iceConnectionLog.innerText += `-> ${this.pc.iceConnectionState}`
            console.log("[WebRTCCall] iceconnectionstatechange", this.callId, this.pc.iceConnectionState)
        }, false);

        this.pc.addEventListener('signalingstatechange', () => {
            signalingLog.innerText += `-> ${this.pc.signalingState}`
            console.log("[WebRTCCall] signalingstatechange", this.callId, this.pc.signalingState)
        }, false);
    }

    initInStream() {
        this.videoElement = document.createElement("video")
        this.videoElement.id = "call-" + this.callId
        this.videoElement.playsInline = true
        this.videoElement.autoplay = true
        this.videoElement.muted = true
        this.videoElement.controls = true
        // this.inStream = new MediaStream();
        // this.videoElement.srcObject = this.inStream
        // this.videoElement.addEventListener(
        //     "loadedmetadata",
        //     () => this.videoElement.play()
        // )
        this.pc.ontrack = ev => {
            this.videoElement.srcObject = ev.streams[0]
            // this.inStream.addTrack(ev.track);
        }
        document.body.appendChild(this.videoElement)

        this.closeButton = document.createElement("button")
        this.closeButton.innerText = `close call ${this.callId}`
        this.closeButton.onclick = () => {
            this.close()
        }
        document.body.appendChild(this.closeButton)
    }


    async initOutStream() {
        console.trace("[initOutStream]")
        this.outStream = await navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true
            }).catch(err => console.error(JSON.stringify(err)));
        for (const track of this.outStream.getTracks()) {
            let rtp = this.pc.addTrack(track, this.outStream);

        }
    }

    async onResponse(data) {
        this.event.emit("response", data.response)
        if (data.response == "reject")
            this.destroy()
    }
    async onStatus(data) {
        this.event.emit("status", data.status)
        if (data.status == "disconnect" || data.status == "closed")
            this.destroy()
    }


    async destroy() {
        if(!this.destroyed){
            this.unlock()
            this.pc.close()
            this.event.emit("destroy")
            this.event.removeAllListeners()
            this.closeButton.remove()
            this.videoElement.remove()
            this.destroyed = true
        }
    }

    async start() {
        await this.lock()
        if (this.initiator) {

            await this.initOutStream()

            let offer = await this.pc.createOffer({
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1,
            })

            offer.sdp = sdpTransform(offer.sdp)

            await this.pc.setLocalDescription(offer)

            this.signal(this.pc.localDescription)

            let res = await new Promise(
                rs => {
                    this.event.once("response", rs)
                    this.event.once("sdp-response",rs)
                }
            )
            console.log({res})

            if (res == 'reject') {
                alert(`call was rejected`)
                throw `call was rejected`
            }
        }
        this.unlock()
    }


    async onSDP(data) {
        console.log("onSDP")
        if (this.initiator) {
            this.event.emit("sdp-response")
            await this.lock()
            await this.pc.setRemoteDescription(data)
            this.unlock()
        } else {
            await this.lock()
            await this.initOutStream()

            await this.pc.setRemoteDescription(data)

            let answer = await this.pc.createAnswer({
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
            })

            answer.sdp = sdpTransform(answer.sdp)

            await this.pc.setLocalDescription(answer)

            this.signal(this.pc.localDescription)
            this.unlock()
        }
    }

    async onCandidate(data) {
        try {
            if (data.candidate) {
                await this.lock()
                await this.pc.addIceCandidate(data.candidate)
                this.unlock()
            }
        } catch (error) {
            console.error({ data, error })
        }
    }

    async lock() {
        await this._wait;
        this._wait = new Promise(r => this._resolve = r)
    }

    async unlock() {
        this._resolve && this._resolve()
    }

    async close() {
        this.signal({ status: "closed" })
        this.destroy()
    }
}


function doCall() {
    let callId = id_caller.value
    callrtc.start(callId)
        .catch(e => alert(JSON.stringify(e)))
}

