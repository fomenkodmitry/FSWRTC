import React, { useState, useMemo, useEffect, useContext } from "react";
import getChat from "../../library/getChat";
import type { ChatMessage } from "../../library/types/Chat";
import { useSocket } from "./SocketContext";

type ChatState = {
  messages: Array<ChatMessage>;
  sendMessage: (message: string) => void;
};

const ChatContext = React.createContext<ChatState | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);

  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }

  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chat = useMemo(() => getChat(socket), []);

  useEffect(() => {
    chat.addEventListener("onReceive", setMessages);
    chat.addEventListener("onSend", setMessages);

    return () => {
      chat.removeEventListener("onReceive", setMessages);
      chat.removeEventListener("onSend", setMessages);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chatContext = useMemo(() => {
    return {
      messages,
      sendMessage: chat.send,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <ChatContext.Provider value={chatContext}>{children}</ChatContext.Provider>
  );
};
