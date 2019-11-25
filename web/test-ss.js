function getTURNCredentials(name, secret){    

    var unixTimeStamp = parseInt(Date.now()/1000) + 24*3600,   // this credential would be valid for the next 24 hours
        username = [unixTimeStamp, name].join(':');
    return {
        username: username,
        credential: CryptoJS.HmacSHA1(username, secret).toString(CryptoJS.enc.Base64)
    };
  }

var turnConfig = {
    sdpSemantics: 'unified-plan',
    iceServers: [
        // {
        //     urls: ["turn:35.247.173.254"],
        //     ...getTURNCredentials("username", "3575819665154b268af59efedee8826e")
        // }
        {
            urls: ["stun:stun.l.google.com:19302"]
        }
    ],
};
myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection   //compatibility for firefox and chrome
pc = new myPeerConnection(turnConfig);

pc.onicecandidate = event => {
    console.log("candidate", event.candidate);
    console.log("candidate created at: ", Date.now());
};

pc.createOffer()
.then((offer) => {
    console.log("New offer:", offer)
    console.log("offer created at: ", Date.now());
    return offer;
})
.then(offer => {
    console.log("set local at: ", Date.now());
    return pc.setLocalDescription(offer);
})
.then(() => console.log("Set local done at: ", Date.now()))
.catch((err) => {
    console.error(err);
});

navigator
.mediaDevices
.getUserMedia({
    audio: true,
    video: true
})
.then(media => {
    for (const track of media.getTracks()) {
        let rtp = pc.addTrack(track, this.outStream);
    }
})