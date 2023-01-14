import { createMemo, JSX } from "solid-js";
import { Listen } from "./proxyListen";

export type NonUndefined<T> = T extends undefined ? never : T;

export default function Await<T>(props: {
  data: () => T | undefined;
  children: (val: NonUndefined<T>) => JSX.Element;
  fallback?: JSX.Element;
}) {
  return createMemo(() => {
    const data = props.data();
    if (data !== undefined) {
      return props.children(data as NonUndefined<T>);
    } else {
      return props.fallback;
    }
  });
}

export function genericAwait<T, U>(
  self: Listen<T, U>
): (props: {
  children: (val: NonNullable<T>) => JSX.Element;
  fallback?: JSX.Element;
}) => JSX.Element {
  return (props) => {
    return createMemo(() => {
      if (self.defined()) {
        const data = self.listen() as NonNullable<T>;
        return props.children(data);
      } else {
        return props.fallback;
      }
    });
  };
}
