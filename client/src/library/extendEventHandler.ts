import { EventHandler } from "./types/EventHandler";

const extendEventHandler = <T extends Record<string, Function>>(getEventHandler: () => EventHandler<T>) => {
  const eventHandler = getEventHandler();

  const addEventListener = <U extends keyof T>(type: U, listener: T[U]) => {
    eventHandler.listen(type, listener);
  };

  const removeEventListener = <U extends keyof T>(type: U, listener: T[U]) => {
    eventHandler.unlisten(type, listener);
  }

  return { addEventListener, removeEventListener, ...eventHandler };
}

export default extendEventHandler;
