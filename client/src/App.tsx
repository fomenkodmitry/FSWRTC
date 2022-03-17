import React, {useEffect, useRef} from 'react';
import './App.css';

import {HubConnectionBuilder} from "@microsoft/signalr";

function App() {

    // /**
    //  * Socket.io socket
    //  */
    // let socket;
 
    /**
     * All peer connections
     */
    let peers : any = {}

    let videos = document.getElementById("videos")
    
    let muteButton = document.getElementById("muteButton")
    
    let vidButton = document.getElementById("vidButton")

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
    const localStream = useRef<MediaStream | undefined>(undefined);
    let connection = new HubConnectionBuilder().withUrl("https://192.168.50.52:5001/WebRTCHub").build();

    useEffect(() => {
        const getUserMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                // @ts-ignore
                videoRef.current.srcObject =
                localStream.current = stream;
                init()
            } catch (err) {
                console.log(err);
            }
        };
        getUserMedia();
    }, []);

    const init = () => {
        // Connect to the signaling server
        connection.start().then(function () {

            connection.on('initReceive', function (socket_id) {
                console.log('INIT RECEIVE ' + socket_id)
                addPeer(socket_id, false)
                connection.invoke("InitSend", socket_id).catch(function (err) {
                    return console.error(err.toString());
                });
            });

            connection.on('initSend', function (socket_id) {
                console.log('INIT SEND ' + socket_id)
                addPeer(socket_id, true)
            });

            connection.on('removePeer', function (socket_id) {
                console.log('removing peer ' + socket_id)
                removePeer(socket_id)
            });

            connection.on('disconnect', function () {
                console.log('GOT DISCONNECTED')
                for (let socket_id in peers) {
                    removePeer(socket_id)
                }
            });

            connection.on('disconnect', function () {
                console.log('GOT DISCONNECTED')
                for (let socket_id in peers) {
                    removePeer(socket_id)
                }
            });

            connection.on('disconnect', function () {
                console.log('GOT DISCONNECTED')
                for (let socket_id in peers) {
                    removePeer(socket_id)
                }
            });
            connection.on('signal', function (data) {
                peers[data.socket_id].signal(data.signal)
            });
            
        }).catch(function (err) {
            return console.error(err.toString());
        });
    }
   
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
        // @ts-ignore
        peers[socket_id] = new SimplePeer({
            initiator: am_initiator,
            stream: localStream,
            config: configuration
        })

        peers[socket_id].on('signal', (data: any) => {

            connection.invoke("signal", {
                    signal: data,
                    socket_id: socket_id
            }).catch(function (err) {
                return console.error(err.toString());
            });
            
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

        const tracks = localStream?.current?.getTracks();

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

            localStream.current = stream
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
            localStream.current = stream
            let localVideo = document.getElementById("localVideo") as HTMLVideoElement
            localVideo.srcObject = localStream.current
            // socket.emit('removeUpdatePeer', '')
        })
        updateButtons()
    }

    /**
     * Disables and removes the local stream and all the connections to other peers.
     */
    function removeLocalStream() {
        if (localStream) {
            const tracks = localStream?.current?.getTracks();

            tracks?.forEach(function (track) {
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
        for (let index in localStream.current.getVideoTracks()) {
            // @ts-ignore
            localStream.current.getVideoTracks()[index].enabled = !localStream.current.getVideoTracks()[index].enabled
            // @ts-ignore
            vidButton.innerText = localStream.current.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
        }
    }

    /**
     * updating text of buttons
     */
    const updateButtons = () => {
        // @ts-ignore
        for (let index in localStream.current.getVideoTracks()) {
            // @ts-ignore
            vidButton.innerText = localStream.current.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
        }
        // @ts-ignore
        for (let index in localStream.current.getAudioTracks()) {
            // @ts-ignore
            muteButton.innerText = localStream.current.getAudioTracks()[index].enabled ? "Unmuted" : "Muted"
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
