import type { Union } from "ts-toolbelt";
import { createMemo, JSX } from "solid-js";

export type CaseOfOpts<Data, Key extends keyof Data, Result> = Partial<
  Union.IntersectOf<
    Data[Key] extends infer Value
      ? Value extends string | symbol | number
        ? Record<Value, (data: Data & Record<Key, Value>) => Result>
        : never
      : never
  >
>;

export default function CaseOf<
  Data extends { [Val in Key]: string | number | symbol },
  Key extends keyof Data,
  R = JSX.Element
>(props: {
  data: Data | undefined;
  key: Key;
  fallback?: R;
  children: CaseOfOpts<Data, Key, JSX.Element>;
}): () => undefined | R {
  const getter = createMemo<
    [Data, undefined | ((data: Data) => R)] | undefined,
    undefined
  >(
    () => {
      const { key, data, children } = props;
      if (data === undefined) return undefined;
      const render: undefined | ((data: Data) => R) = (children as any)[
        data[key]
      ];
      return [data, render];
    },
    undefined,
    { equals: (a, b) => a !== undefined && a[0] === b?.[0] && a[1] === b?.[1] }
  );
  return () => {
    const m = getter();
    if (m !== undefined) {
      const [data, render] = m;
      return typeof render === "function" ? render(data) : props.fallback;
    } else {
      return props.fallback;
    }
  };
}
