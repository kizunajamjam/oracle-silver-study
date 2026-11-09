"use client";

import { useSyncExternalStore } from "react";

export type Attempt = { qid: string; correct: boolean; at: number; mode: string };
export type Data = { attempts: Attempt[]; favorites: string[] };

const KEY = "oracle-silver:v1";
const EMPTY: Data = { attempts: [], favorites: [] };

let cache: { raw: string | null | undefined; data: Data } = { raw: undefined, data: EMPTY };
/** localStorage に書けない環境では、このタブのメモリー上だけで保持する */
let memoryOnly = false;
const listeners = new Set<() => void>();

function parse(raw: string | null): Data {
  if (!raw) return EMPTY;
  try {
    const d = JSON.parse(raw) as Partial<Data>;
    return { attempts: d.attempts ?? [], favorites: d.favorites ?? [] };
  } catch {
    return EMPTY;
  }
}

export function getData(): Data {
  if (memoryOnly) return cache.data;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    memoryOnly = true;
    return cache.data === EMPTY ? EMPTY : cache.data;
  }
  if (raw !== cache.raw) cache = { raw, data: parse(raw) };
  return cache.data;
}

function save(data: Data) {
  const raw = JSON.stringify(data);
  try {
    localStorage.setItem(KEY, raw);
    memoryOnly = false;
  } catch {
    memoryOnly = true;
  }
  cache = { raw, data };
  listeners.forEach((l) => l());
}

export function addAttempt(a: Attempt) {
  const d = getData();
  save({ ...d, attempts: [...d.attempts, a] });
}

export function toggleFavorite(qid: string) {
  const d = getData();
  const favorites = d.favorites.includes(qid) ? d.favorites.filter((x) => x !== qid) : [...d.favorites, qid];
  save({ ...d, favorites });
}

export function resetAll() {
  save(EMPTY);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useData(): Data {
  return useSyncExternalStore(subscribe, getData, () => EMPTY);
}

/** ハイドレーション完了後に true（保存データに依存する画面は、それまで描かない） */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
