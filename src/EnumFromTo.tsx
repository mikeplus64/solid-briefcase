import { createMemo, JSX, untrack } from "solid-js";

export default function EnumFromTo(props: {
  /** Default: false. Not a reactive property */
  cache?: boolean;
  /** Default: 0 */
  from?: number;
  /** Non-inclusive upper bound */
  to: number;
  /** Render an index */
  children: (value: number) => JSX.Element;
}): JSX.Element {
  if (untrack(() => props.cache) === true) {
    return CachingEnumFromTo(props);
  }
  return createMemo(() => {
    const { from = 0, to, children: render } = props;
    const n = to - from;
    if (n <= 0) return undefined;
    const r: JSX.Element[] = [];
    for (let i = from; i < to; i++) {
      r.push(render(i));
    }
    return r;
  });
}

function CachingEnumFromTo(props: {
  /** Default: 0 */
  from?: number;
  to: number;
  children: (value: number, iteration: number) => JSX.Element;
}): JSX.Element {
  const memo = createMemo<
    | {
        from: number;
        to: number;
        r: JSX.Element[];
        iteration: number;
      }
    | undefined
  >((prev) => {
    const { from = 0, to, children: render } = props;
    const n = to - from;
    if (n <= 0) return undefined;
    return cachedRangeArray(prev, from, to, render);
  });
  return () => memo()?.r;
}

////////////////////////////////////////////////////////////////////////////////

export function cachedRangeArray<T>(
  prev: undefined | { from: number; to: number; iteration: number; r: T[] },
  nextFrom: number,
  nextTo: number,
  generate: (value: number, iteration: number) => T
): { from: number; to: number; iteration: number; r: T[] } {
  const r: T[] = [];
  let iteration = 0;
  if (prev === undefined) {
    for (let i = nextFrom; i < nextTo; i++) {
      r.push(generate(i, iteration));
    }
  } else {
    iteration = prev.iteration + 1;
    const overlapFrom = Math.max(nextFrom, prev.from);
    const overlapTo = Math.min(nextTo, prev.to);
    if (overlapFrom < overlapTo) {
      for (let i = nextFrom; i < overlapFrom; i++) {
        r.push(generate(i, iteration));
      }
      r.push(...prev.r.slice(overlapFrom - prev.from, overlapTo - prev.from));
      for (let i = overlapTo; i < nextTo; i++) {
        r.push(generate(i, iteration));
      }
    } else {
      for (let i = nextFrom; i < nextTo; i++) {
        r.push(generate(i, iteration));
      }
    }
  }
  return { from: nextFrom, to: nextTo, iteration, r };
}
