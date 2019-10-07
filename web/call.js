//@ts-check
let iceConnectionLog = document.getElementById('ice-connection-state')
let iceGatheringLog = document.getElementById('ice-gathering-state')
let id_viewer = document.getElementById('your-id')
let id_caller = document.getElementById('call-id')
let signalingLog = document.getElementById('signaling-state')

var id = ((10000) * Math.random() | 0).toString()
var broadcastId = ""

id_viewer.textContent += id

var config = {
    sdpSemantics: 'unified-plan',
    rtcpMuxPolicy: "require",
    bundlePolicy: "max-bundle",
    iceServers: [
        {
            urls: ["turn:35.247.173.254:3478"],
            username: "username",
            credential: "password"
        }
    ]
};

class WebRTCCall {
    constructor(id) {
        this.id = id
        this.ws = new WebSocket(`wss://beo-wsnative.herokuapp.com?id=${id}`)
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

            console.log("[WebRTCCall] icegatheringstatechange", this.callId, this.pc.iceGatheringState)
        }, false);

        this.pc.addEventListener('iceconnectionstatechange', () => {
            console.log("[WebRTCCall] iceconnectionstatechange", this.callId, this.pc.iceConnectionState)
        }, false);

        this.pc.addEventListener('signalingstatechange', () => {
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
        this.inStream = new MediaStream();
        this.videoElement.srcObject = this.inStream
        this.pc.ontrack = ev => this.inStream.addTrack(ev.track);
        document.body.appendChild(this.videoElement)
    }


    async initOutStream() {
        console.trace("[initOutStream]")
        this.outStream = await navigator.mediaDevices
            .getUserMedia({ video: true, audio: true });
        for (const track of this.outStream.getTracks()){
            let rtp = this.pc.addTrack(track);
            
        }
    }

    async start() {
        await this.lock()
        if (this.initiator) {

            await this.initOutStream()

            let offer = await this.pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            })

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
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            })


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

