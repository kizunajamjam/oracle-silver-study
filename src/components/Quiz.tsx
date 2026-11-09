"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MOCK, chapters, questionById } from "@/lib/data";
import { addAttempt, toggleFavorite, useData } from "@/lib/store";
import { buildSession, hash, mulberry32, sameSet, shuffle, type Mode } from "@/lib/study";
import { Review } from "./Review";

type Result = { qid: string; correct: boolean; picked: number[] };

const LABELS = ["A", "B", "C", "D", "E", "F"];
const MODE_NAME: Record<Mode, string> = {
  chapter: "章別",
  random: "ランダム10問",
  weak: "苦手な問題",
  fav: "お気に入り",
  mock: "模擬試験",
};

function fmt(sec: number) {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Quiz({ mode, chapter }: { mode: Mode; chapter?: string }) {
  const data = useData();
  // 保存データを読む出題の組み立ては、ハイドレーション後（クライアント）で一度だけ行う
  const [session] = useState(() => buildSession(mode, chapter, data));
  const [deadline] = useState(() => Date.now() + session.seconds * 1000);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [struck, setStruck] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useState(session.seconds);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));

  useEffect(() => {
    if (!session.seconds || finished) return;
    const t = setInterval(() => {
      const rem = Math.round((deadline - Date.now()) / 1000);
      setLeft(rem);
      if (rem <= 0) setFinished(true);
    }, 1000);
    return () => clearInterval(t);
  }, [session.seconds, finished, deadline]);

  const q = questionById.get(session.ids[i] ?? "");
  // 位置で答えを覚えないよう、選択肢の並びは問題ごとに入れ替える（display[位置] = 元の番号）
  const display = useMemo(
    () => (q ? shuffle(q.choices.map((_, k) => k), mulberry32(seed ^ hash(q.id))) : []),
    [q, seed],
  );

  const title = mode === "chapter" ? (chapters.find((c) => c.id === chapter)?.title ?? "章別") : MODE_NAME[mode];

  if (session.ids.length === 0) {
    const hint: Record<Mode, string> = {
      chapter: "この章の問題はまだありません。",
      random: "問題がありません。",
      weak: "まだ間違えた問題（または途中の問題）がありません。",
      fav: "お気に入りの問題がありません。問題画面の ☆ で登録できます。",
      mock: "問題がありません。",
    };
    return (
      <div className="space-y-4">
        <p>{hint[mode]}</p>
        <Link href="/" className="text-accent underline">ホームへ</Link>
      </div>
    );
  }

  if (finished || !q) {
    const byId = new Map(results.map((r) => [r.qid, r]));
    const score = results.filter((r) => r.correct).length;
    const total = session.ids.length;
    const pass = score / total >= MOCK.passRatio;
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{title}の結果</h1>
        <p className="text-3xl font-bold">
          {score} / {total}
          <span className="ml-2 text-base font-normal text-muted">（{Math.round((score / total) * 100)}%）</span>
        </p>
        {mode === "mock" && (
          <p className={pass ? "text-ok" : "text-ng"}>
            {pass ? "合格ライン（60%）に達しています" : "合格ライン（60%）に届いていません"}
            <span className="ml-1 text-xs text-muted">※合格点・出題数は Oracle 公式ページで要確認</span>
          </p>
        )}
        <ul className="space-y-2">
          {session.ids.map((id, n) => {
            const r = byId.get(id);
            const qq = questionById.get(id);
            if (!qq) return null;
            return (
              <li key={id} className="rounded-lg border border-line bg-card">
                <details>
                  <summary className="cursor-pointer p-3 text-sm">
                    <span className={r ? (r.correct ? "text-ok" : "text-ng") : "text-muted"}>
                      {r ? (r.correct ? "○" : "✗") : "−"}
                    </span>{" "}
                    問{n + 1}　{qq.stem.slice(0, 40)}
                    {qq.stem.length > 40 ? "…" : ""}
                  </summary>
                  <div className="border-t border-line p-3">
                    <Review q={qq} picked={r?.picked} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <Link href="/" className="inline-block rounded-lg bg-accent px-4 py-2 font-medium text-accent-fg">
          ホームへ
        </Link>
      </div>
    );
  }

  const fav = data.favorites.includes(q.id);
  const multi = q.select > 1;

  function pick(pos: number) {
    if (submitted) return;
    if (!multi) return setPicked([pos]);
    setPicked((p) => (p.includes(pos) ? p.filter((x) => x !== pos) : p.length < q!.select ? [...p, pos] : p));
  }

  function next() {
    if (i + 1 >= session.ids.length) return setFinished(true);
    setI(i + 1);
    setPicked([]);
    setStruck([]);
    setSubmitted(false);
  }

  function submit() {
    if (!q || picked.length !== q.select) return;
    const orig = picked.map((p) => display[p]);
    const correct = sameSet(orig, q.answer);
    addAttempt({ qid: q.id, correct, at: Date.now(), mode });
    setResults((r) => [...r, { qid: q.id, correct, picked: orig }]);
    if (mode === "mock") next();
    else setSubmitted(true);
  }

  const lastResult = results[results.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <Link href="/" className="underline">← ホーム</Link>
        <span>
          {title}　{i + 1} / {session.ids.length}
          {session.seconds > 0 && <span className="ml-2 font-mono text-fg">⏱ {fmt(left)}</span>}
        </span>
      </div>

      <div className="rounded-xl border border-line bg-card p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-xs text-muted">{chapters.find((c) => c.id === q.chapter)?.title}</span>
          <button
            onClick={() => toggleFavorite(q.id)}
            aria-label={fav ? "お気に入りを外す" : "お気に入りに入れる"}
            className="text-xl leading-none"
          >
            {fav ? "★" : "☆"}
          </button>
        </div>
        <p className="whitespace-pre-wrap font-medium">{q.stem}</p>
        {multi && <p className="mt-1 text-sm font-bold text-accent">{q.select}つ選べ（{picked.length}/{q.select}）</p>}
      </div>

      <ul className="space-y-2">
        {display.map((orig, pos) => {
          const right = q.answer.includes(orig);
          const chosen = picked.includes(pos);
          const isStruck = struck.includes(pos);
          let cls = "border-line bg-card";
          if (submitted) cls = right ? "border-ok bg-ok-bg" : chosen ? "border-ng bg-ng-bg" : "border-line bg-card";
          else if (chosen) cls = "border-accent bg-card ring-2 ring-accent";
          return (
            <li key={orig} className="flex items-stretch gap-2">
              <button
                onClick={() => pick(pos)}
                className={`flex-1 rounded-lg border p-3 text-left ${cls} ${isStruck && !submitted ? "opacity-50" : ""}`}
              >
                <span className="mr-2 font-bold">{LABELS[pos]}</span>
                <span className={isStruck && !submitted ? "line-through" : ""}>{q.choices[orig]}</span>
              </button>
              {!submitted && (
                <button
                  onClick={() => setStruck((s) => (s.includes(pos) ? s.filter((x) => x !== pos) : [...s, pos]))}
                  aria-label="絶対違う（横線）"
                  className="w-10 rounded-lg border border-line bg-card text-muted"
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!submitted ? (
        <button
          onClick={submit}
          disabled={picked.length !== q.select}
          className="w-full rounded-lg bg-accent px-4 py-3 font-bold text-accent-fg disabled:opacity-40"
        >
          {mode === "mock" ? "解答して次へ" : "解答する"}
        </button>
      ) : (
        <div className="space-y-3">
          <p className={`text-lg font-bold ${lastResult?.correct ? "text-ok" : "text-ng"}`}>
            {lastResult?.correct ? "正解" : "不正解"}
          </p>
          <div className="rounded-xl border border-line bg-card p-3">
            <Review q={q} picked={lastResult?.picked} />
          </div>
          <button onClick={next} className="w-full rounded-lg bg-accent px-4 py-3 font-bold text-accent-fg">
            {i + 1 >= session.ids.length ? "結果を見る" : "次の問題へ"}
          </button>
        </div>
      )}
    </div>
  );
}
