
function convert_str_to_list(sdp_string, character) {
    return sdp_string.split(character)
}

function convert_list_to_string(sdp_list, character) {
    return sdp_list.join(character)
}

function sdp_filter(sdp_raw, engine) {
    /**
    sdp_raw : {
        a=rtpmap:96 VP8/90000
        a=rtcp-fb:96 goog-remb
        a=rtcp-fb:96 transport-cc
        a=rtcp-fb:96 ccm fir
        a=rtcp-fb:96 nack
        a=rtcp-fb:96 nack pli
        }
    engine : VP8/H.264/....
     * 
     */

    let sdp_temp = []

    let sdp_list = convert_str_to_list(sdp_raw, "\r\n")
    let engine_number = null

    let rtp_map = "a=rtpmap:"

    let rtcp_fb = "a=rtcp-fb:"
    let rtcp_fb_vp8 = null

    let fmtp = "a=fmtp:"
    let fmtp_vp8 = null

    let media_video = "m=video"
    let is_video_format = false
    let is_first_rtx = true

    //  for line in sdp_raw
    for (let i = 0; i < sdp_list.length; i++) {
        if (sdp_list[i].startsWith("m=")) {
            if (sdp_list[i].startsWith(media_video)) {
                is_video_format = true
                sdp_temp.push(sdp_list[i])
            }
            else {
                is_video_format = false
                sdp_temp.push(sdp_list[i])
            }
        }
        else if (sdp_list[i].startsWith(rtp_map)) {
            if (!is_video_format) {
                sdp_temp.push(sdp_list[i])
            }
            else if (sdp_list[i].includes(engine)) {
                var numberPattern = /\d+/g;
                engine_number = sdp_list[i].match(numberPattern)[0]
                sdp_temp.push(sdp_list[i])

                rtcp_fb_vp8 = rtcp_fb + engine_number
                fmtp_vp8 = fmtp_vp8 + engine_number
            }
            else if (sdp_list[i].includes("rtx") && engine_number != null && is_first_rtx) {
                sdp_temp.push(sdp_list[i])
                is_first_rtx = false
            }
            else {
                continue
            }
        }
        else if (sdp_list[i].startsWith(rtcp_fb)) {
            if (rtcp_fb_vp8 && sdp_list[i].startsWith(rtcp_fb_vp8)) {
                sdp_temp.push(sdp_list[i])
            }
            else {
                continue
            }
        }
        else if (sdp_list[i].startsWith(fmtp)) {
            if (fmtp_vp8 && sdp_list[i].startsWith(fmtp_vp8)) {
                sdp_temp.push(sdp_list[i])
            }
            else if (engine_number && sdp_list[i].includes(engine_number)) {
                sdp_temp.push(sdp_list[i])
            }
            else {
                continue
            }
        }
        else {
            sdp_temp.push(sdp_list[i])
        }
    }
    let new_sdp = convert_list_to_string(sdp_temp, "\r\n").replace(new RegExp(engine_number, 'g'), 96)
    let engine_number2 = parseInt(engine_number) + 1
    return new_sdp.replace(new RegExp(engine_number2 + "", 'g'), 97)
}

function IsSafari() {
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('safari') != -1) {
        if (ua.indexOf('chrome') > -1) {
            return false
        } else {
            return true
        }
    }
}


const params = {
    audioSendBitrate: undefined,
    audioSendCodec: undefined,
    // audioSendCodec: IsSafari() ? "AAC" : "OPUS",
    audioRecvBitrate: undefined,
    audioRecvCodec: undefined,
    opusMaxPbr: undefined,
    opusFec: undefined,
    opusDtx: undefined,
    opusStereo: undefined,
    videoSendBitrate: 1024000,
    videoSendInitialBitrate: undefined,
    videoSendCodec: IsSafari() ? "H264" : "VP8",
    videoRecvBitrate: 1024000,
    videoRecvCodec: "VP8",
    videoFec: undefined,
}


try {
    document.getElementsByTagName("pre")[0].textContent = JSON.stringify({
        codec: params.videoSendCodec,
        IsSafari: IsSafari()
    },null,2)
} catch (error) {

}

const sdpTransform = (sdp) => {
    try {
        sdp = maybeSetOpusOptions(sdp, params);
        sdp = maybePreferAudioSendCodec(sdp, params);
        sdp = maybePreferVideoSendCodec(sdp, params);
        sdp = maybeSetAudioSendBitRate(sdp, params);
        sdp = maybeSetVideoSendBitRate(sdp, params);
        sdp = maybeSetVideoSendInitialBitRate(sdp, params);
        sdp = maybeRemoveVideoFec(sdp, params)
        return sdp
    } catch (error) {
        console.error(error)
        return sdp
    }
}

