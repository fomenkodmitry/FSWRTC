import type { EventHandler, EventHandlerListener } from './types/EventHandler';
import type { Parameters } from './types/Utility';

const getEventHandler = <T extends Record<string, Function>>(): EventHandler<T> => {
  const listeners: EventHandlerListener<T> = {};

  const fire = <U extends keyof T>(type: U, ...args: Parameters<T[U]>) => {
    listeners[type]?.forEach(listener => listener(...args));
  }

  const listen = <U extends keyof T>(type: U, eventHandler: T[U]) => {
    if (!listeners[type]) {
      listeners[type] = [];
    }

    listeners[type]?.push(eventHandler);
  }

  const unlisten = <U extends keyof T>(type: U, eventHandler: T[U]) => {
    listeners[type]?.forEach(listener => listener !== eventHandler);
  }

  return { listeners, fire, listen, unlisten };
}

export default getEventHandler;
