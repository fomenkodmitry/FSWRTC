import React, { createContext, useState, useRef, useEffect } from 'react';
import Peer from 'simple-peer';
import * as signalR from '@microsoft/signalr';

// @ts-ignore
const SocketContext = createContext();

// const socket = io('http://localhost:5000');
const socket = new signalR.HubConnectionBuilder().withUrl('http://127.0.0.1:5000/WebRTCHub').build();

// @ts-ignore
const ContextProvider = ({ children }) => {
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState();
  const [name, setName] = useState('');
  const [call, setCall] = useState({});
  const [me, setMe] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        // @ts-ignore
        setStream(currentStream);
        // @ts-ignore
        myVideo.current.srcObject = currentStream;
      });

    socket.on('me', (id) => setMe(id));

    socket.on('callUser', ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });
  }, []);

  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on('signal', (data : any) => {
      // @ts-ignore
      socket.invoke('answerCall', { signal: data, to: call.from });
    });

    peer.on('stream', (currentStream : any) => {
      // @ts-ignore
      userVideo.current.srcObject = currentStream;
    });

    // @ts-ignore
    peer.signal(call.signal);
    // @ts-ignore
    connectionRef.current = peer;
  };

  const callUser = (id : any) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on('signal', (data : any) => {
      socket.invoke('callUser', { userToCall: id, signalData: data, from: me, name });
    });

    peer.on('stream', (currentStream : any) => {
      // @ts-ignore
      userVideo.current.srcObject = currentStream;
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);

      peer.signal(signal);
    });

    // @ts-ignore
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);

    // @ts-ignore
    connectionRef.current.destroy();

    window.location.reload();
  };

  return (
    <SocketContext.Provider value={{
      call,
      callAccepted,
      myVideo,
      userVideo,
      stream,
      name,
      setName,
      callEnded,
      me,
      callUser,
      leaveCall,
      answerCall,
    }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
