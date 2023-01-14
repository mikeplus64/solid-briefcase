import { createMemo, For, JSX } from "solid-js";
import { Listen } from "./proxyListen";

export interface AwaitableFor<T> {
  (props: {
    each?: undefined;
    children: (val: Extract<T, any[]>[number]) => JSX.Element;
    fallback?: JSX.Element;
  }): JSX.Element;
  <S>(props: {
    each: (val: NonNullable<T>) => S[] | undefined;
    children: (val: S) => JSX.Element;
    fallback?: JSX.Element;
  }): JSX.Element;
}

export function genericFor<T, U>(self: Listen<T, U>): AwaitableFor<T> {
  return ((props: Parameters<AwaitableFor<T>>[0]): JSX.Element => {
    const array = createMemo<any>(() => {
      const each = props.each;
      const val = self.listen();
      const arr = Array.isArray(val) ? val : val === undefined ? [] : [val];
      if (typeof each === "function") return each(arr as any);
      return arr;
    });
    return (
      <For each={array()} fallback={props.fallback}>
        {props.children}
      </For>
    );
  }) as AwaitableFor<T>;
}
