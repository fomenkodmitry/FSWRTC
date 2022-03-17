import React, {useEffect, useRef} from 'react';
import './App.css';
import 'simple-peer'
import SimplePeer from "simple-peer";
function App() {

    // /**
    //  * Socket.io socket
    //  */
    // let socket;
    /**
     * The stream object used to send media
     */
    let localStream: MediaStream | undefined;
    /**
     * All peer connections
     */
    let peers : any = {}

    let videos = document.getElementById("videos")
    
    let muteButton = document.getElementById("muteButton")
    
    let vidButton = document.getElementById("vidButton")
    //////////// CONFIGURATION //////////////////

    /**
     * RTCPeerConnection configuration
     */

    const configuration = {
        // Using From https://www.metered.ca/tools/openrelay/
        "iceServers": [
            {
                urls: "stun:openrelay.metered.ca:80"
            },
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject"
            }
        ]
    }

    /**
     * UserMedia constraints
     */
    let constraints : MediaStreamConstraints | undefined  = {
        audio: true,
        video: {
            width: {
                max: 300
            },
            height: {
                max: 300
            },
            facingMode: {
                ideal: 'user'
            }
        }
    }
    const videoRef = useRef(null);

    useEffect(() => {
        const getUserMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                let localVideo = document.getElementById("localVideo") as HTMLVideoElement
                localVideo.srcObject = stream;

                localStream = stream;
            } catch (err) {
                console.log(err);
            }
        };
        getUserMedia();
    }, []);


    // /**
    //  * initialize the socket connections
    //  */
    // function init() {
    //     socket = io()
    //
    //     socket.on('initReceive', socket_id => {
    //         console.log('INIT RECEIVE ' + socket_id)
    //         addPeer(socket_id, false)
    //
    //         socket.emit('initSend', socket_id)
    //     })
    //     socket.on('initSend', socket_id => {
    //         console.log('INIT SEND ' + socket_id)
    //         addPeer(socket_id, true)
    //     })
    //
    //     socket.on('removePeer', socket_id => {
    //         console.log('removing peer ' + socket_id)
    //         removePeer(socket_id)
    //     })
    //
    //     socket.on('disconnect', () => {
    //         console.log('GOT DISCONNECTED')
    //         for (let socket_id in peers) {
    //             removePeer(socket_id)
    //         }
    //     })
    //
    //     socket.on('signal', data => {
    //         peers[data.socket_id].signal(data.signal)
    //     })
    // }
//
   
    /**
     * Remove a peer with given socket_id.
     * Removes the video element and deletes the connection
     * @param {String} socket_id
     */
    function removePeer(socket_id: string) {

        let videoEl = document.getElementById(socket_id) as HTMLVideoElement
        if (videoEl) {

            // @ts-ignore
            const tracks = videoEl.srcObject.getTracks();

            tracks.forEach(function (track: MediaStreamTrack) {
                track.stop()
            })

            videoEl.srcObject = null
            videoEl?.parentNode?.removeChild(videoEl)
        }
        if (peers[socket_id]) 
            peers[socket_id].destroy()
        
        delete peers[socket_id]
    }

    /**
     * Creates a new peer connection and sets the event listeners
     * @param {String} socket_id
     *                 ID of the peer
     * @param {Boolean} am_initiator
     *                  Set to true if the peer initiates the connection process.
     *                  Set to false if the peer receives the connection.
     */
    function addPeer(socket_id: string, am_initiator: boolean) {
        peers[socket_id] = new SimplePeer({
            initiator: am_initiator,
            stream: localStream,
            config: configuration
        })

        peers[socket_id].on('signal', (data: any) => {
            // socket.emit('signal', {
            //     signal: data,
            //     socket_id: socket_id
            // })
        })

        peers[socket_id].on('stream', (stream: MediaProvider | null) => {
            let newVid = document.createElement('video')
            newVid.srcObject = stream
            newVid.id = socket_id
            newVid.playsInline = false
            newVid.autoplay = true
            newVid.className = "vid"
            newVid.onclick = () => openPictureMode(newVid)
            newVid.ontouchstart = (e) => openPictureMode(newVid)
            videos?.appendChild(newVid)
        })
    }

    /**
     * Opens an element in Picture-in-Picture mode
     * @param {HTMLVideoElement} el video element to put in pip mode
     */
    function openPictureMode(el: HTMLVideoElement) {
        console.log('opening pip')
        el.requestPictureInPicture().then(r => r)
    }

    /**
     * Switches the camera between user and environment. It will just enable the camera 2 cameras not supported.
     */
    function switchMedia() {

        // @ts-ignore
        if (constraints.video.facingMode.ideal === 'user') {
            // @ts-ignore
            constraints.video.facingMode.ideal = 'environment'
        } else {
            // @ts-ignore
            constraints.video.facingMode.ideal = 'user'
        }

        const tracks = localStream?.getTracks();

        tracks?.forEach(function (track : MediaStreamTrack) {
            track.stop()
        })
        let localVideo = document.getElementById("localVideo") as HTMLVideoElement
        localVideo.srcObject = null
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            for (let socket_id in peers) {
                for (let index in peers[socket_id].streams[0].getTracks()) {
                    for (let index2 in stream.getTracks()) {
                        if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                            peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], stream.getTracks()[index2], peers[socket_id].streams[0])
                            break;
                        }
                    }
                }
            }

            localStream = stream
            localVideo.srcObject = stream

            updateButtons()
        })
    }

    /**
     * Enable screen share
     */
    function setScreen() {
        navigator.mediaDevices.getDisplayMedia().then(stream => {
            for (let socket_id in peers) {
                for (let index in peers[socket_id].streams[0].getTracks()) {
                    for (let index2 in stream.getTracks()) {
                        if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                            peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], stream.getTracks()[index2], peers[socket_id].streams[0])
                            break;
                        }
                    }
                }

            }
            localStream = stream
            let localVideo = document.getElementById("localVideo") as HTMLVideoElement
            localVideo.srcObject = localStream
            // socket.emit('removeUpdatePeer', '')
        })
        updateButtons()
    }

    /**
     * Disables and removes the local stream and all the connections to other peers.
     */
    function removeLocalStream() {
        if (localStream) {
            const tracks = localStream.getTracks();

            tracks.forEach(function (track) {
                track.stop()
            })
            let localVideo = document.getElementById("localVideo") as HTMLVideoElement

            localVideo.srcObject = null
        }

        for (let socket_id in peers) {
            removePeer(socket_id)
        }
    }

    /**
     * Enable/disable microphone
     */
    const toggleMute = () => {
        // @ts-ignore
        for (let index in localStream.getAudioTracks()) {
            // @ts-ignore
            localStream.getAudioTracks()[index].enabled = !localStream.getAudioTracks()[index].enabled
            // @ts-ignore
            muteButton.innerText = localStream.getAudioTracks()[index].enabled ? "Unmuted" : "Muted"
        }
    }
    /**
     * Enable/disable video
     */
    const toggleVid = () => {
            // @ts-ignore
        for (let index in localStream.getVideoTracks()) {
            // @ts-ignore
            localStream.getVideoTracks()[index].enabled = !localStream.getVideoTracks()[index].enabled
            // @ts-ignore
            vidButton.innerText = localStream.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
        }
    }

    /**
     * updating text of buttons
     */
    const updateButtons = () => {
        // @ts-ignore
        for (let index in localStream.getVideoTracks()) {
            // @ts-ignore
            vidButton.innerText = localStream.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
        }
        // @ts-ignore
        for (let index in localStream.getAudioTracks()) {
            // @ts-ignore
            muteButton.innerText = localStream.getAudioTracks()[index].enabled ? "Unmuted" : "Muted"
        }
    }
    
    return (
        <div className="App">
            <div id="videos" className="container">
                <video ref={videoRef} id="localVideo" className="vid" autoPlay muted/>
            </div>
            <br/>
            <div>
                <button id="switchButton" className="settings" onClick={switchMedia}>Switch
                    Camera
                </button>
                <button id="muteButton" className="settings" onClick={toggleMute}>Unmuted</button>
                <button id="vidButton" className="settings" onClick={toggleVid}>Video Enabled</button>
            </div>
        </div>
    );
}

export default App;
