"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { getData, hooks, mergeRemote, type Attempt } from "./store";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 環境変数が未設定なら null（端末内だけで動く） */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

type State = { status: "off" | "loading" | "out" | "in"; email: string | null; error: string | null; pending: number };
const SERVER: State = { status: supabase ? "loading" : "off", email: null, error: null, pending: 0 };
let state: State = SERVER;
const listeners = new Set<() => void>();
let started = false;
let syncing = false;
let again = false;
let userId: string | null = null;
let remoteIds = new Set<string>();
/** クラウドの記録を一度でも読めたか（読めていないうちは未同期の件数を出さない） */
let remoteKnown = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useCloud(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER,
  );
}

const PAGE = 1000;
const CHUNK = 500;
type Row = { id: string; question_id: string; correct: boolean; mode: string; answered_at: string };

async function fetchAttempts(db: SupabaseClient): Promise<Attempt[]> {
  const out: Attempt[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("dba_attempts")
      .select("id,question_id,correct,mode,answered_at")
      .order("answered_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data as Row[]) out.push({ id: r.id, qid: r.question_id, correct: r.correct, mode: r.mode, at: Date.parse(r.answered_at) });
    if (data.length < PAGE) return out;
  }
}

function countPending() {
  if (!remoteKnown) return 0;
  return getData().attempts.filter((a) => !remoteIds.has(a.id)).length;
}

/** 端末とクラウドを突き合わせる（解答は id の和集合。送れなかった分は次回また送る） */
export async function sync() {
  if (!supabase || state.status !== "in" || !userId) return;
  if (syncing) {
    again = true;
    return;
  }
  syncing = true;
  try {
    const remote = await fetchAttempts(supabase);
    remoteIds = new Set(remote.map((a) => a.id));
    remoteKnown = true;

    const missing = getData().attempts.filter((a) => !remoteIds.has(a.id));
    for (let i = 0; i < missing.length; i += CHUNK) {
      const rows = missing.slice(i, i + CHUNK).map((a) => ({
        id: a.id,
        user_id: userId,
        question_id: a.qid,
        correct: a.correct,
        mode: a.mode,
        answered_at: new Date(a.at).toISOString(),
      }));
      const { error } = await supabase.from("dba_attempts").upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true });
      if (error) throw error;
      rows.forEach((r) => remoteIds.add(r.id));
    }

    // お気に入り：このアカウントで初めての同期では端末側を足し、以後はクラウド側を正とする
    const flag = `oracle-silver:fav-synced:${userId}`;
    let first = true;
    try {
      first = localStorage.getItem(flag) === null;
    } catch {
      // 読めない環境では毎回「足す」側で動かす（消えるより残るほうが安全）
    }
    const { data: favRows, error: favErr } = await supabase.from("dba_favorites").select("question_id");
    if (favErr) throw favErr;
    let favs = (favRows as { question_id: string }[]).map((r) => r.question_id);
    if (first) {
      const add = getData().favorites.filter((f) => !favs.includes(f));
      if (add.length) {
        const { error } = await supabase
          .from("dba_favorites")
          .upsert(add.map((question_id) => ({ user_id: userId, question_id })), { onConflict: "user_id,question_id", ignoreDuplicates: true });
        if (error) throw error;
        favs = [...favs, ...add];
      }
      try {
        localStorage.setItem(flag, "1");
      } catch {
        // 保存できなくても次回また足すだけ
      }
    }
    mergeRemote(remote, favs);
    set({ error: null, pending: countPending() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "不明なエラー";
    set({ error: `同期できませんでした（${msg}）。あとで再送します。`, pending: countPending() });
  } finally {
    syncing = false;
    if (again) {
      again = false;
      schedule();
    }
  }
}

function schedule(ms = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => void sync(), ms);
}

async function onFavorite(qid: string, on: boolean) {
  if (!supabase || state.status !== "in" || !userId) return;
  const { error } = on
    ? await supabase.from("dba_favorites").upsert({ user_id: userId, question_id: qid }, { onConflict: "user_id,question_id", ignoreDuplicates: true })
    : await supabase.from("dba_favorites").delete().eq("question_id", qid);
  if (error) set({ error: `お気に入りを同期できませんでした（${error.message}）` });
}

/** 起動時に一度だけ呼ぶ：ログイン状態を読み、変化を監視する */
export function startCloud() {
  if (started || !supabase) return;
  started = true;
  hooks.onAttempt = () => {
    set({ pending: countPending() });
    if (state.status === "in") schedule();
  };
  hooks.onFavorite = (qid, on) => void onFavorite(qid, on);

  const apply = (session: { user: { id: string; email?: string } } | null) => {
    userId = session?.user.id ?? null;
    if (!session) {
      remoteIds = new Set();
      remoteKnown = false;
      set({ status: "out", email: null, error: null, pending: 0 });
      return;
    }
    set({ status: "in", email: session.user.email ?? null, error: null });
    void sync();
  };
  void supabase.auth.getSession().then(({ data }) => apply(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    // ログイン済みの再通知（タブの切替など）では読み直さない
    if (event === "TOKEN_REFRESHED" || (event === "SIGNED_IN" && session?.user.id === userId)) return;
    apply(session);
  });
  window.addEventListener("online", () => schedule(500));
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return "Supabase が未設定です";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? "メールアドレスかパスワードが違います" : null;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
