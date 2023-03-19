export type Parameters<T extends Record<string, any>> = T extends (...args: infer T) => any ? T : never;
