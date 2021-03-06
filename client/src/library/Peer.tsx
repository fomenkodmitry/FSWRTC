import User from "./User";
import { Socket } from "socket.io-client";
import SimplePeer, { SignalData } from "simple-peer";
import EventHandler, { withEventHandler } from "./EventHandler";
import {HubConnection} from "@microsoft/signalr";

type PeerEvent = {
  onStream: (remoteStreams: MediaStream) => void;
};

export class Peer extends SimplePeer {
  socket: HubConnection;
  user: InstanceType<typeof User>;
  socketId: string;
  eventHandler: EventHandler<PeerEvent>;

  constructor(socket: HubConnection, socketId: string, opts?: SimplePeer.Options) {
    super({ ...opts });
    this.socket = socket;
    this.user = new User();
    this.socketId = socketId;
    this.eventHandler = new EventHandler<PeerEvent>();

    this.on("signal", this.onSignal);
    this.on("stream", this.onStream);
  }

  onSignal = (data: SignalData) => {
    this.socket.invoke("signal", {
      signal: data,
      socketId: this.socketId,
    });
  };

  onStream = (stream: MediaStream) => {
    this.eventHandler.fire("onStream", stream);
    this.user.setStream(stream);
  };

  stopStream = () => {
    this.user.getStream().stopStream();
  };

  getUser = () => {
    return this.user;
  };
}

export default withEventHandler<PeerEvent, typeof Peer>(Peer);
