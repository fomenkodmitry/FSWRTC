import { Parameters } from "./Utility";

export type EventHandlerListener<T extends Record<string, Function>> = { [key in keyof T]?: Array<T[keyof T]> };
export type EventHandler<T extends Record<string, Function>> = {
  listeners: EventHandlerListener<T>
  fire: <U extends keyof T>(type: U, ...args: Parameters<T[U]>) => void
  listen: <U extends keyof T>(type: U, eventHandler: T[U]) => void
  unlisten: <U extends keyof T>(type: U, eventHandler: T[U]) => void
}
