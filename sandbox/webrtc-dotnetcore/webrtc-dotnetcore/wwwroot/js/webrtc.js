"use strict";

var connection = new signalR.HubConnectionBuilder().withUrl("/WebRTCHub").build();

/****************************************************************************
 * Initial setup
 ****************************************************************************/

const configuration = {
    'iceServers': [
        {
            'urls': 'stun:stun.l.google.com:19302'
        },
        {
            'urls': 'stun:stun1.l.google.com:19302'
        },
        {
            'urls': 'stun:stun2.l.google.com:19302'
        },
        {
            'urls': 'stun:stun3.l.google.com:19302'
        },
        {
            'urls': 'stun:stun4.l.google.com:19302'
        },
    ]
};
//
// [{url:'stun:stun01.sipphone.com'},
//     {url:'stun:stun.ekiga.net'},
//     {url:'stun:stun.fwdnet.net'},
//     {url:'stun:stun.ideasip.com'},
//     {url:'stun:stun.iptel.org'},
//     {url:'stun:stun.rixtelecom.se'},
//     {url:'stun:stun.schlund.de'},
//     {url:'stun:stun.l.google.com:19302'},
//     {url:'stun:stun1.l.google.com:19302'},
//     {url:'stun:stun2.l.google.com:19302'},
//     {url:'stun:stun3.l.google.com:19302'},
//     {url:'stun:stun4.l.google.com:19302'},
//     {url:'stun:stunserver.org'},
//     {url:'stun:stun.softjoys.com'},
//     {url:'stun:stun.voiparound.com'},
//     {url:'stun:stun.voipbuster.com'},
//     {url:'stun:stun.voipstunt.com'},
//     {url:'stun:stun.voxgratia.org'},
//     {url:'stun:stun.xten.com'},
//     {
//         urls: 'turn:numb.viagenie.ca',
//         credential: 'muazkh',
//         username: 'webrtc@live.com'
//     },
//     {
//         urls: 'turn:192.158.29.39:3478?transport=udp',
//         credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//         username: '28224511:1379330808'
//     },
//     {
//         urls: 'turn:192.158.29.39:3478?transport=tcp',
//         credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//         username: '28224511:1379330808'
//     }]


const peerConn = new RTCPeerConnection(configuration);

const roomNameTxt = document.getElementById('roomNameTxt');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomTable = document.getElementById('roomTable');
const connectionStatusMessage = document.getElementById('connectionStatusMessage');
const fileInput = document.getElementById('fileInput');
const sendFileBtn = document.getElementById('sendFileBtn');
const fileTable = document.getElementById('fileTable');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let myRoomId;
let localStream;
let remoteStream;
let fileReader;
let isInitiator = false;
let hasRoomJoined = false;

fileInput.disabled = true;
sendFileBtn.disabled = true;

$(roomTable).DataTable({
    columns: [
        {data: 'RoomId', "width": "30%"},
        {data: 'Name', "width": "50%"},
        {data: 'Button', "width": "15%"}
    ],
    "lengthChange": false,
    "searching": false,
    "language": {
        "emptyTable": "No room available"
    }
});

//setup my video here.
grabWebCamVideo();

/****************************************************************************
 * Signaling server
 ****************************************************************************/

// Connect to the signaling server
connection.start().then(function () {

    connection.on('updateRoom', function (data) {
        var obj = JSON.parse(data);
        $(roomTable).DataTable().clear().rows.add(obj).draw();
    });

    connection.on('created', function (roomId) {
        console.log('Created room', roomId);
        roomNameTxt.disabled = true;
        createRoomBtn.disabled = true;
        hasRoomJoined = true;
        connectionStatusMessage.innerText = 'You created Room ' + roomId + '. Waiting for participants...';
        myRoomId = roomId;
        isInitiator = true;
    });

    connection.on('joined', function (roomId) {
        console.log('This peer has joined room', roomId);
        myRoomId = roomId;
        isInitiator = false;
    });

    connection.on('error', function (message) {
        alert(message);
    });

    connection.on('ready', function () {
        console.log('Socket is ready');
        roomNameTxt.disabled = true;
        createRoomBtn.disabled = true;
        hasRoomJoined = true;
        connectionStatusMessage.innerText = 'Connecting...';
        createPeerConnection(isInitiator, configuration);
    });

    connection.on('message', function (message) {
        console.log('Client received message:', message);
        signalingMessageCallback(message);
    });

    connection.on('bye', function () {
        console.log(`Peer leaving room.`);
        // If peer did not create the room, re-enter to be creator.
        connectionStatusMessage.innerText = `Other peer left room ${myRoomId}.`;
    });

    window.addEventListener('unload', function () {
        if (hasRoomJoined) {
            console.log(`Unloading window. Notifying peers in ${myRoomId}.`);
            connection.invoke("LeaveRoom", myRoomId).catch(function (err) {
                return console.error(err.toString());
            });
        }
    });

    //Get room list.
    connection.invoke("GetRoomInfo").catch(function (err) {
        return console.error(err.toString());
    });

}).catch(function (err) {
    return console.error(err.toString());
});

/**
 * Send message to signaling server
 */
function sendMessage(message) {
    console.log('Client sending message: ', message);
    connection.invoke("SendMessage", myRoomId, message).catch(function (err) {
        return console.error(err.toString());
    });
}

/****************************************************************************
 * Room management
 ****************************************************************************/

$(createRoomBtn).click(function () {
    var name = roomNameTxt.value;
    connection.invoke("CreateRoom", name).catch(function (err) {
        return console.error(err.toString());
    });
});

$('#roomTable tbody').on('click', 'button', function () {
    if (hasRoomJoined) {
        alert('You already joined the room. Please use a new tab or window.');
    } else {
        var data = $(roomTable).DataTable().row($(this).parents('tr')).data();
        connection.invoke("Join", data.RoomId).catch(function (err) {
            return console.error(err.toString());
        });
    }
});

$(fileInput).change(function () {
    let file = fileInput.files[0];
    if (file) {
        sendFileBtn.disabled = false;
    } else {
        sendFileBtn.disabled = true;
    }
});

$(sendFileBtn).click(function () {
    sendFileBtn.disabled = true;
    sendFile();
});

/****************************************************************************
 * User media (webcam)
 ****************************************************************************/

function grabWebCamVideo() {
    console.log('Getting user media (video) ...');

    navigator.mediaDevices.enumerateDevices()
        .then(function (devices) {
            devices.forEach(function (device) {
                console.log(device.kind + ": " + device.label +
                    " id = " + device.deviceId);
            });
        })
        .catch(function (err) {
            console.log(err.name + ": " + err.message);
        });

    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
            width: 1280,
            height: 720
        }
    })
        .then(gotStream)
        .catch(function (e) {
            alert('getUserMedia() error: ' + e.name);
        });
}

function gotStream(stream) {
    console.log('getUserMedia video stream URL:', stream);
    localStream = stream;
    peerConn.addStream(localStream);
    localVideo.srcObject = stream;
}

/****************************************************************************
 * WebRTC peer connection and data channel
 ****************************************************************************/

var dataChannel;

function signalingMessageCallback(message) {
    if (message.type === 'offer') {
        console.log('Got offer. Sending answer to peer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message))
            .then(function () {
            })
            .catch(logError);

        peerConn.createAnswer()
            .then(onLocalSessionCreated)
            .catch(logError);

    } else if (message.type === 'answer') {
        console.log('Got answer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message))
            .then(function () {
            })
            .catch(logError);

    } else if (message.type === 'candidate') {
        peerConn.addIceCandidate(new RTCIceCandidate({
            candidate: message.candidate
        }));

    }
}

function createPeerConnection(isInitiator, config) {
    console.log('Creating Peer connection as initiator?', isInitiator, 'config:',
        config);

    let isConnected = false;
    // send any ice candidates to the other peer
    peerConn.onicecandidate = function (event) {
        if(isConnected)
            return;
        console.log('icecandidate event:', event);
        // if (event.candidate) {
        //     // Trickle ICE
        //     sendMessage({
        //        type: 'offer',
        //        label: event.candidate.sdpMLineIndex,
        //        id: event.candidate.sdpMid,
        //        candidate: event.candidate.candidate
        //     });
        // } else {
            // Vanilla ICE
            sendMessage(peerConn.localDescription);
        // }
            isConnected = true;
    };

    peerConn.ontrack = function (event) {
        console.log('icecandidate ontrack event:', event);
        remoteVideo.srcObject = event.streams[0];
    };

    if (isInitiator) {
        console.log('Creating Data Channel');
        dataChannel = peerConn.createDataChannel('sendDataChannel');
        onDataChannelCreated(dataChannel);

        console.log('Creating an offer');
        peerConn.createOffer()
            .then(onLocalSessionCreated)
            .catch(logError);
    } else {
        peerConn.ondatachannel = function (event) {
            console.log('ondatachannel:', event.channel);
            dataChannel = event.channel;
            onDataChannelCreated(dataChannel);
        };
    }
}

function onLocalSessionCreated(desc) {
    console.log('local session created:', desc);
    peerConn.setLocalDescription(desc).then(
        function () {
            // Trickle ICE
            //console.log('sending local desc:', peerConn.localDescription);
            //sendMessage(peerConn.localDescription);
        }
    ).catch(logError);
}

function onDataChannelCreated(channel) {
    console.log('onDataChannelCreated:', channel);

    channel.onopen = function () {
        console.log('Channel opened!!!');
        connectionStatusMessage.innerText = 'Channel opened!!';
        fileInput.disabled = false;
    };

    channel.onclose = function () {
        console.log('Channel closed.');
        connectionStatusMessage.innerText = 'Channel closed.';
    }

    channel.onmessage = onReceiveMessageCallback();
}

function onReceiveMessageCallback() {
    let count;
    let fileSize, fileName;
    let receiveBuffer = [];

    return function onmessage(event) {
        if (typeof event.data === 'string') {
            const fileMetaInfo = event.data.split(',');
            fileSize = parseInt(fileMetaInfo[0]);
            fileName = fileMetaInfo[1];
            count = 0;
            return;
        }

        receiveBuffer.push(event.data);
        count += event.data.byteLength;

        if (fileSize === count) {
            // all data chunks have been received
            const received = new Blob(receiveBuffer);
            receiveBuffer = [];

            $(fileTable).children('tbody').append('<tr><td><a></a></td></tr>');
            const downloadAnchor = $(fileTable).find('a:last');
            downloadAnchor.attr('href', URL.createObjectURL(received));
            downloadAnchor.attr('download', fileName);
            downloadAnchor.text(`${fileName} (${fileSize} bytes)`);
        }
    };
}

function sendFile() {
    const file = fileInput.files[0];
    console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);

    if (file.size === 0) {
        alert('File is empty, please select a non-empty file.');
        return;
    }

    //send file size and file name as comma separated value.
    dataChannel.send(file.size + ',' + file.name);

    const chunkSize = 16384;
    fileReader = new FileReader();
    let offset = 0;
    fileReader.addEventListener('error', error => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', e => {
        console.log('FileRead.onload ', e);
        dataChannel.send(e.target.result);
        offset += e.target.result.byteLength;
        if (offset < file.size) {
            readSlice(offset);
        } else {
            alert(`${file.name} has been sent successfully.`);
            sendFileBtn.disabled = false;
        }
    });
    const readSlice = o => {
        console.log('readSlice ', o);
        const slice = file.slice(offset, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
}

/****************************************************************************
 * Auxiliary functions
 ****************************************************************************/

function logError(err) {
    if (!err) return;
    if (typeof err === 'string') {
        console.warn(err);
    } else {
        console.warn(err.toString(), err);
    }
}

localVideo.muted = true;