import { useEffect, useState } from 'react';

/** A value that follows another one after it has stood still for `ms`: a search box asks the server once the typing pauses. */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
