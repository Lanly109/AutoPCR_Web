import { useState } from "react";

export function useCountHook(val = 0) {
    const [state, setState] = useState<number>(val);

    const inc = () => setState((state) => state + 1);
    const dec = () => setState((state) => state - 1);

    return [state, inc, dec] as const;
}
