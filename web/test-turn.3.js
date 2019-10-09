function checkTURNServer(turnConfig, timeout){ 

  return new Promise(function(resolve, reject){

    setTimeout(function(){
        if(promiseResolved) return;
        resolve(false);
        promiseResolved = true;
    }, timeout || 5000);

    var promiseResolved = false
      , myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection   //compatibility for firefox and chrome
      , pc = new myPeerConnection({iceServers:[turnConfig]})
      , noop = function(){};
    pc.createDataChannel("");    //create a bogus data channel
    pc.createOffer(function(sdp){
      if(sdp.sdp.indexOf('typ relay') > -1){ // sometimes sdp contains the ice candidates...
        promiseResolved = true;
        resolve(true);
      }
      pc.setLocalDescription(sdp, noop, noop);
    }, noop);    // create offer and set local description
    pc.onicecandidate = function(ice){  //listen for candidate events
      if(promiseResolved || !ice || !ice.candidate || !ice.candidate.candidate || !(ice.candidate.candidate.indexOf('typ relay')>-1))  return;
      promiseResolved = true;
      resolve(true);
    };
  });   
}
  
function getTURNCredentials(name, secret){    

  var unixTimeStamp = parseInt(Date.now()/1000) + 24*3600,   // this credential would be valid for the next 24 hours
      username = [unixTimeStamp, name].join(':');
  return {
      username: username,
      credential: CryptoJS.HmacSHA1(username, secret).toString(CryptoJS.enc.Base64)
  };
}


console.log(getTURNCredentials("username","3575819665154b268af59efedee8826e"))

checkTURNServer({
    urls : 'turn:35.247.141.131',
    ...getTURNCredentials("username","3575819665154b268af59efedee8826e")
}).then(function(bool){
    console.log('is my TURN server active? ', bool? 'yes':'no');
}).catch(console.error.bind(console));