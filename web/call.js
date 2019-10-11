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
        },
        {
            urls: ["turn:35.247.173.254"],
            ...getTURNCredentials("username", "3575819665154b268af59efedee8826e")
        },
    ],
};

let stunServerList= document.getElementById('stunServerList');
let stunServer = document.getElementById('turnServer');

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


class WebRTCCall {
    constructor(id) {
        this.id = id
        this.ws = new WebSocket(`ws://localhost:8080/?id=${id}`)
        this.ws.onmessage = (event) => {
            let [channel, data] = JSON.parse(event.data)
            this.onSocketMessage(channel, data)
        }

        // setInterval(() => {})

        /**@type {Map<string,WebRTCCallPair>} */
        this.call = new Map()
    }

    onSocketMessage(sourceId, data) {
        console.log("[onSocketMessage]", sourceId, data)
        if (data.sdp) {
            if (!this.call.get(sourceId))
                this.call.set(
                    sourceId,
                    new WebRTCCallPair(
                        { callId: sourceId, initiator: false },
                        (...data) => {
                            console.log("send", sourceId, ...data)
                            this.ws.send(JSON.stringify([sourceId, ...data]))
                        }
                    )
                )
            console.log("onSocketMessage", this.call.get(sourceId))
            this.call.get(sourceId).onSDP(data)
        } else if (data.candidate) {
            this.call.get(sourceId).onCandidate(data)
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
                }
            )
        )

        await this.call.get(id).start()
    }


}

class WebRTCCallPair {
    constructor({ callId, initiator }, signal) {
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
    }


    async initOutStream() {
        console.trace("[initOutStream]")
        this.outStream = await navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true
            });
        for (const track of this.outStream.getTracks()) {
            let rtp = this.pc.addTrack(track, this.outStream);

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
        }
        this.unlock()
    }

    async onSDP(data) {
        await this.lock()

        console.log("onSDP")
        if (this.initiator) {
            await this.pc.setRemoteDescription(data)
        } else {
            await this.initOutStream()

            await this.pc.setRemoteDescription(data)

            let answer = await this.pc.createAnswer({
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
            })

            answer.sdp = sdpTransform(answer.sdp)

            await this.pc.setLocalDescription(answer)

            this.signal(this.pc.localDescription)
        }
        this.unlock()
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

    unlock() {
        this._resolve && this._resolve()
    }
}

let callrtc = new WebRTCCall(id)


function doCall() {
    let callId = id_caller.value
    callrtc.start(callId)
        .catch(e => alert(JSON.stringify(e)))
}

