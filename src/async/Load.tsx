import {
  Component,
  createMemo,
  createSignal,
  JSX,
  splitProps,
  untrack,
} from "solid-js";

type AsyncPropsOf<Props extends {}> = {
  [Key in keyof Props]: AsyncProp<Props[Key], Props>;
};

export type AsyncProp<Prop, Props> =
  | Prop
  | MemoPropFetch<Prop, Props>
  | (Prop extends () => boolean ? IsLoadingProp : never)
  | (Prop extends () => void ? RefreshProp : never);

function Load<
  Comp extends Component<any>,
  Props extends Parameters<Comp>[0] = Parameters<Comp>[0]
>(
  props__: {
    component: Component<Props>;
    fallback?: () => JSX.Element;
  } & AsyncPropsOf<Props>
) {
  const [readySignal, setReadySignal] = createSignal(false);
  const [loadProps, props_] = splitProps(props__, ["component", "fallback"]);
  const props: AsyncPropsOf<Props> = props_ as any;
  const allFetchProps: string[] = [];

  const [listenRefresh, refresh] = createSignal(false, { equals: false });

  const cmpProps: Props = {} as any;

  const guardedProps = createMemo<false | Props>(() => {
    if (!readySignal()) return false;
    for (const key of allFetchProps) {
      if (cmpProps[key] === undefined) return false;
    }
    return cmpProps;
  });

  untrack(() => {
    // First just collect all the fetch prop names
    for (const key in props) {
      const prop = props[key];
      if (prop instanceof MemoPropFetch) {
        allFetchProps.push(key as string);
      }
    }

    for (const key in props) {
      const prop = props[key];
      if (prop instanceof MemoPropFetch) {
        // Memo prop
        const res = createMemo((prev) => {
          listenRefresh();
          if (!readySignal()) return prev;
          return prop.fetch(cmpProps);
        }, prop.defaultValue);
        Object.defineProperty(cmpProps, key, {
          get: res,
        });
      } else if (prop instanceof RefreshProp) {
        // Refresh prop
        Object.defineProperty(cmpProps, key, {
          get: () => () => refresh(true),
        });
      } else if (prop instanceof IsLoadingProp) {
        // Test if loading
        Object.defineProperty(cmpProps, key, {
          get: () => () => guardedProps() === false,
        });
      } else {
        // Raw props
        Object.defineProperty(cmpProps, key, {
          get: () => props[key],
        });
      }
    }
    setReadySignal(true);
  });

  return createMemo(() => {
    const ps = guardedProps();
    if (ps === false) return loadProps.fallback;
    return <loadProps.component {...ps} />;
  });
}

class IsLoadingProp {}

class RefreshProp {}

class MemoPropFetch<Prop, Props> {
  constructor(
    public fetch: (props: MaybePropsOf<Props>) => Prop | undefined,
    public defaultValue: undefined | Prop,
    public haveDefaultValue: boolean
  ) {}
}

export type MaybePropsOf<Props extends {}> = {
  [Key in keyof Props]: undefined | Props[Key];
};

export type PropsAsPromises<Props extends {}> = {
  [Key in keyof Props]: Props[Key] extends infer Value
    ? Value extends Promise<any>
      ? Value
      : Promise<Value>
    : never;
};

namespace Load {
  export function memo<P, Ps>(
    fetch: (props: MaybePropsOf<Ps>) => P | undefined,
    defaultValue?: P
  ) {
    const haveDefaultValue: boolean = defaultValue !== undefined;
    return new MemoPropFetch(fetch, defaultValue, haveDefaultValue);
  }

  export const isLoading = new IsLoadingProp();
  export const refresh = new RefreshProp();
}

export default Load;
