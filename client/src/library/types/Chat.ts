export type ChatMessageKeys = 'message' | 'username';
export type ChatMessage = Record<ChatMessageKeys, string>;

export type ChatEventKeys = 'onSend' | 'onReceive';
export type ChatEvent = Record<ChatEventKeys, (messages: Array<ChatMessage>) => void>;
