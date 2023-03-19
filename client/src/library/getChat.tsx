import type { HubConnection } from "@microsoft/signalr";
import extendEventHandler from "./extendEventHandler";
import getEventHandler from "./getEventHandler";
import type { ChatEvent, ChatMessage } from "./types/Chat";

const getChat = (socket: HubConnection) => {
  const messages: Array<ChatMessage> = [];
  const { addEventListener, removeEventListener, ...eventHandler } = extendEventHandler<ChatEvent>(getEventHandler);

  const receive = (message: ChatMessage) => {
    messages.push(message);
    eventHandler.fire('onReceive', messages);
  }

  const send = (message: string) => {
    messages.push({ message, username: "Me" });
    eventHandler.fire('onSend', messages);
    socket.invoke('sendMessage', message);
  };

  socket.on('receiveMessage', receive);

  return { messages, send, addEventListener, removeEventListener };
}

export default getChat;
