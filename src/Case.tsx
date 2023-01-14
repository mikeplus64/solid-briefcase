import { createMemo, JSX } from "solid-js";
import { Union } from "ts-toolbelt";

export default function Case<Key extends string | number | symbol>(props: {
  key: Key;
  fallback?: JSX.Element;
  children: { [K in Key]?: JSX.Element };
}): JSX.Element {
  const getter = createMemo<[Key, undefined | JSX.Element], undefined>(
    () => {
      const key = props.key;
      const elem = props.children[key];
      return [key, elem];
    },
    undefined,
    {
      equals: (a, b) => {
        const eq = a !== undefined && a[0] === b[0];
        return eq;
      },
    }
  );
  return () => {
    return getter()[1] ?? props.fallback;
  };
}
