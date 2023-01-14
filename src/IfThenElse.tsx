import { createMemo, JSX } from "solid-js";

export default function IfThenElse<
  Data extends { [Val in Key]: any },
  Key extends keyof Data,
  R = JSX.Element
>(props: {
  data: Data;
  key: Key;
  fallback?: (data: Data & Record<Key, Exclude<Data[Key], true>>) => R;
  children: (data: Data & Record<Key, true>) => R;
}) {
  const _getCondData = createMemo<[boolean, Data]>(() => {
    const { key, data } = props;
    return [data[key], data];
  });
  const getCondData: () =>
    | [true, Data & Record<Key, true>]
    | [false, Data & Record<Key, Exclude<Data[Key], true>>] =
    _getCondData as any;
  return () => {
    const [cond, data] = getCondData();
    if (cond === true) {
      return props.children(data);
    } else if (typeof props.fallback === "function") {
      return props.fallback(data);
    } else {
      return null;
    }
  };
}
