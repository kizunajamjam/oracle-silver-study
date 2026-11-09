"use client";

import { useSyncExternalStore } from "react";

/** id は端末をまたいだ重複防止用（クラウド同期の主キー） */
export type Attempt = { id: string; qid: string; correct: boolean; at: number; mode: string };
export type Data = { attempts: Attempt[]; favorites: string[] };

const KEY = "oracle-silver:v1";
const EMPTY: Data = { attempts: [], favorites: [] };

let cache: { raw: string | null | undefined; data: Data } = { raw: undefined, data: EMPTY };
/** localStorage に書けない環境では、このタブのメモリー上だけで保持する */
let memoryOnly = false;
const listeners = new Set<() => void>();

/** クラウド同期が、変更を知るためのフック（store → cloud の循環 import を避ける） */
export const hooks: { onAttempt?: () => void; onFavorite?: (qid: string, on: boolean) => void } = {};

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function parse(raw: string | null): Data {
  if (!raw) return EMPTY;
  try {
    const d = JSON.parse(raw) as { attempts?: (Omit<Attempt, "id"> & { id?: string })[]; favorites?: string[] };
    return {
      // id のない古い記録には、問題と時刻から決まる id を付ける
      attempts: (d.attempts ?? []).map((a) => ({ ...a, id: a.id ?? `${a.qid}:${a.at}` })),
      favorites: d.favorites ?? [],
    };
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

export function addAttempt(a: Omit<Attempt, "id">) {
  const d = getData();
  save({ ...d, attempts: [...d.attempts, { ...a, id: newId() }] });
  hooks.onAttempt?.();
}

export function toggleFavorite(qid: string) {
  const d = getData();
  const on = !d.favorites.includes(qid);
  save({ ...d, favorites: on ? [...d.favorites, qid] : d.favorites.filter((x) => x !== qid) });
  hooks.onFavorite?.(qid, on);
}

/** クラウドから取り込む：解答は id で和集合、お気に入りは渡された一覧で置き換える（null なら変えない） */
export function mergeRemote(attempts: Attempt[], favorites: string[] | null) {
  const d = getData();
  const have = new Set(d.attempts.map((a) => a.id));
  const add = attempts.filter((a) => !have.has(a.id));
  const favChanged =
    favorites !== null && (favorites.length !== d.favorites.length || favorites.some((f) => !d.favorites.includes(f)));
  if (add.length === 0 && !favChanged) return;
  save({ attempts: add.length ? [...d.attempts, ...add] : d.attempts, favorites: favChanged ? favorites! : d.favorites });
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
