import cloneDeep from "lodash/cloneDeep";
import deepIsEqual from "lodash/isEqual";
import {
  Accessor,
  batch,
  createComputed,
  createMemo,
  createResource,
  createSignal,
  getOwner,
  JSX,
  Resource,
  runWithOwner,
  untrack,
} from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { Counter, useCounter } from "../counting/DebouncedCounter";
import { genericAwait } from "./Await";
import { genericFor } from "./For";
import { Listen, proxyListen, ProxyListen } from "./proxyListen";

export type Awaitable<T, U = undefined> = ProxyListen<
  AwaitableCls<NonNullable<T>, U>
>;

export type AwaitableI<R> = Awaitable<R, NonNullable<R>>;

let globalPause = false;

export function pauseAwaitables() {
  globalPause = true;
}

export function unpauseAwaitables() {
  globalPause = false;
}

export class AwaitableCls<T, U = undefined> implements Listen<T, U> {
  constructor(asyncFn: (ref?: boolean) => Promise<T>);
  constructor(
    asyncFn: (ref?: boolean) => Promise<T>,
    def: U,
    counter?: Counter,
    isEqual?: (a: T, b: T) => boolean
  );
  constructor(
    asyncFn: (ref?: boolean) => Promise<T>,
    def?: U,
    counter: Counter = useCounter(),
    isEqual: (a: T, b: T) => boolean = deepIsEqual
  ) {
    const [state, setState] = createStore<{ current: T | undefined }>({
      current: undefined,
    });

    function getValue(): T | undefined {
      untrack(() => setLazy(false));
      return state.current;
    }

    let init = false;

    const setValue = (next: T) => {
      if (globalPause && init) return;
      untrack(() => {
        const nextCopy = cloneDeep(unwrap(next));
        setState("current", (current) =>
          current === undefined
            ? nextCopy
            : isEqual(unwrap(current), nextCopy)
            ? current
            : reconcile(nextCopy, { merge: false, key: null })(current)
        );
      });
    };

    const [getLoading, setLoading] = createSignal<boolean>(false);
    const [getLazy, setLazy] = createSignal<boolean>(true);

    const defined = createMemo(() => getValue() !== undefined);

    let _initResolve: undefined | ((val: T) => void);
    const initPromise = new Promise<T>((resolve) => {
      _initResolve = resolve;
    });

    function initResolve(val: T) {
      if (!init && val !== undefined) {
        _initResolve!(val);
        init = true;
      }
    }

    createComputed(() => {
      if (getLazy()) return;
      setLoading(true);
      const refresh = counter.leadingEdge();
      const result = asyncFn(refresh);
      untrack(() => {
        result.then((value) => {
          untrack(() => {
            batch(() => {
              setValue(value);
              setLoading(false);
            });
          });
          initResolve(value);
        });
      });
    });

    this.then = async function then() {
      if (!init) {
        getValue();
        return initPromise;
      }
      return getValue()!;
    };

    this.listen = () => (getValue() ?? def) as NonNullable<T> | U;
    this.update = counter.signal.increment;
    this.def = def as U;
    this.defined = defined;
    this.loading = getLoading;
    this.startInterval = (sec) => counter.signal.startInterval(sec);
    this.stopInterval = () => counter.signal.stopInterval();
  }

  def: U;
  then: () => Promise<T>;
  loading: () => boolean;
  defined: () => boolean;
  update: () => void;
  startInterval: (sec: number) => void;
  stopInterval: () => void;

  listen: Listen<T, U>["listen"];
  For = genericFor<T, U>(this);
  Await = genericAwait<T, U>(this);

  Load = (p: { children: JSX.Element; fallback?: JSX.Element }) => () =>
    this.defined() ? p.children : p.fallback;
}

export function useAsync<T>(
  asyncFn: (ref?: boolean) => Promise<T>
): Awaitable<T>;

export function useAsync<T, U = undefined>(
  asyncFn: (ref?: boolean) => Promise<T>,
  def: U,
  counter?: Counter,
  isEqual?: (a: T, b: T) => boolean
): Awaitable<T, U>;

export function useAsync<T, U = undefined>(
  asyncFn: (ref?: boolean) => Promise<T>,
  def?: U,
  counter?: Counter,
  isEqual?: (a: T, b: T) => boolean
): Awaitable<T, U> {
  return proxyListen(new AwaitableCls(asyncFn, def, counter, isEqual)) as any;
}

export function useAsyncI<T>(
  asyncFn: (ref?: boolean) => Promise<T>,
  def?: T,
  counter?: Counter
): AwaitableI<T> {
  return useAsync(asyncFn, cloneDeep(def), counter) as AwaitableI<T>;
}

export type UsePromise<T> = Resource<T | undefined> & {
  (): T | undefined;
  refetch(): void;
};

export function usePromise<T>(
  p: Promise<T> | ((ref?: boolean) => Promise<T>)
): UsePromise<T> {
  const counter = useCounter();
  const fetch: (ref?: boolean) => Promise<T> =
    typeof p === "function" ? p : () => p;
  const [getter, { refetch }] = createResource(
    () => {
      const refresh = counter.leadingEdge();
      return fetch(refresh);
    },
    (t) => t
  );
  return Object.assign(getter, { refetch });
}

export function createLazyMemo<T>(fn: () => T): Accessor<T> {
  const owner = getOwner();
  let called = false;
  let memo: Accessor<T> | undefined = undefined;
  if (owner === null) {
    throw new Error("createLazyMemo needs an owner");
  }
  function delay(): T {
    if (called) return memo!();
    called = true;
    memo = runWithOwner(owner!, () => createMemo(fn));
    return memo!();
  }
  return delay;
}
