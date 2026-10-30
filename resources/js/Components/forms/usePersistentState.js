import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Form drafts that survive step navigation (progress dots / Back buttons).
 * Stored per browser tab in sessionStorage; every storage call is guarded so the
 * form still works when storage is unavailable.
 */
const read = (key) => {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const write = (key, value) => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable – draft just isn't kept */
  }
};

export const clearDrafts = (prefix) => {
  try {
    const store = window.sessionStorage;
    Object.keys(store)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => store.removeItem(k));
  } catch {
    /* ignore */
  }
};

export const hasDraft = (prefix) => {
  try {
    return Object.keys(window.sessionStorage).some((k) => k.startsWith(prefix));
  } catch {
    return false;
  }
};

/**
 * useState that mirrors its value into sessionStorage under `${prefix}:${name}`.
 * Returns [value, setValue, reset] — reset restores the initial value and drops the draft.
 */
export default function usePersistentState(prefix, name, initial) {
  const key = `${prefix}:${name}`;
  const initialRef = useRef(initial);
  const [value, setValue] = useState(() => {
    const saved = typeof window === "undefined" ? undefined : read(key);
    return saved === undefined ? initial : saved;
  });

  useEffect(() => {
    write(key, value);
  }, [key, value]);

  const reset = useCallback(() => {
    setValue(initialRef.current);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  return [value, setValue, reset];
}
