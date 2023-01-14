export interface Listen<T, U = undefined> {
  listen(): NonNullable<T> | U;
  defined(): boolean;
}

export type ProxyListen<O extends Listen<any, any>> = Omit<O, "listen"> & {
  (): ReturnType<O["listen"]>;
};

export function proxyListen<O extends Listen<any, any>>(
  obj: O
): ProxyListen<O> {
  return new Proxy(obj.listen, {
    get: (_target, prop, recv) => Reflect.get(obj, prop, recv),
    set: (_target, prop, value, recv) => Reflect.set(obj, prop, value, recv),
  }) as any;
}
