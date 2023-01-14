import {
  createContext,
  createResource,
  createSignal,
  JSX,
  useContext,
} from "solid-js";

export interface ILoadingContext {
  increment(): void;
  decrement(): void;
  loading(): boolean;
}

const LoadingCounterContext = createContext<ILoadingContext>({
  increment() {},
  decrement() {},
  loading() {
    return false;
  },
});

export function LoadingCounterProvider(props: {
  name?: string;
  children: JSX.Element;
}) {
  const [counter, setCounter] = createSignal(0);
  const [loading] = createResource(
    () => counter() > 0,
    (t) => new Promise((resolve) => (!t ? resolve(true) : undefined))
  );
  return (
    <LoadingCounterContext.Provider
      value={{
        increment() {
          setCounter((s) => s + 1);
        },
        decrement() {
          setCounter((s) => s - 1);
        },
        loading() {
          return loading() === true;
        },
      }}
    >
      {props.children}
    </LoadingCounterContext.Provider>
  );
}

export function useLoadingCounter() {
  return useContext(LoadingCounterContext);
}
