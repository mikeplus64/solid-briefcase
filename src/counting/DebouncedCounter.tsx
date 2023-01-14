import { debounce } from "lodash";
import {
  createContext,
  createSignal,
  JSX,
  onCleanup,
  untrack,
  useContext,
} from "solid-js";

export interface Counter {
  leadingEdge(): boolean;
  signal: CounterSignal;
}

export interface CounterSignal {
  name?: string;
  counter(): number;
  increment(): void;
  startInterval(seconds: number, retry?: number): void;
  stopInterval(): void;
  intervalDuration?: number;
  interval?: NodeJS.Timeout;
}

export function CounterProvider(props: {
  name?: string;
  children: JSX.Element;
}) {
  const signal = createCounterSignal(props.name);
  return (
    <CounterContext.Provider value={{ signal }}>
      {props.children}
    </CounterContext.Provider>
  );
}

export function useCounter(name?: string): Counter {
  const signal =
    useContext(CounterContext).signal ?? createCounterSignal(name ?? "_local");
  return createCounter(signal);
}

export function createCounterSignal(name?: string): CounterSignal {
  const [counter, setCounter] = createSignal(0);
  return {
    name,

    increment: debounce(
      () => {
        setCounter(untrack(counter) + 1);
        // log.debug("increment")
      },
      500,
      { leading: true, trailing: false }
    ),

    counter,

    startInterval(sec: number) {
      untrack(() => {
        if (this.interval === undefined) {
          this.intervalDuration = sec;
          this.interval = setInterval(this.increment, 1000 * sec);
          onCleanup(this.stopInterval);
        } else {
          // log.warn("ignoring new interval");
        }
      });
    },

    stopInterval() {
      untrack(() => {
        const interval = this.interval;
        if (interval !== undefined) {
          clearInterval(interval);
          this.interval = undefined;
          this.intervalDuration = undefined;
        }
      });
    },
  };
}

export function combineCounterSignals(
  signals: [CounterSignal, ...CounterSignal[]]
): CounterSignal {
  if (signals.length === 1) {
    return signals[0];
  }
  return {
    counter() {
      let sum = 0;
      for (let i = 0; i < signals.length; i++) sum += signals[i].counter();
      return sum;
    },
    increment() {
      for (const sig of signals) sig.increment();
    },
    startInterval(sec: number, retry: number = 0) {
      for (const sig of signals) sig.startInterval(sec, retry);
    },
    stopInterval() {
      for (const sig of signals) sig.stopInterval();
    },
  };
}

export function createCounter(signal: CounterSignal): Counter {
  let lastCount = -1;
  return {
    signal,
    leadingEdge: () => {
      const now = signal.counter();
      if (now > lastCount) {
        lastCount = now;
        return true;
      }
      return false;
    },
  };
}

const CounterContext = createContext({
  signal: undefined as CounterSignal | undefined,
});
