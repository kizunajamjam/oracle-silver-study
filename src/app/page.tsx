"use client";

import Link from "next/link";
import { useState } from "react";
import { chapters, questions } from "@/lib/data";
import { resetAll, useData, useHydrated } from "@/lib/store";
import { statsOf, statusOf } from "@/lib/study";

const btn = "block rounded-xl border border-line bg-card p-3 text-center font-medium";

export default function Home() {
  const data = useData();
  const hydrated = useHydrated();
  const [now] = useState(() => Date.now());
  const stats = statsOf(data.attempts);
  const status = (id: string) => statusOf(stats.get(id), now);

  const mastered = questions.filter((q) => ["mastered", "review"].includes(status(q.id))).length;
  const due = questions.filter((q) => status(q.id) === "review").length;
  const weak = questions.filter((q) => status(q.id) === "learning").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Silver DBA Study</h1>
        <p className="text-sm text-muted">Oracle Master Silver DBA（Oracle Database Administration I）の学習用</p>
      </header>

      <section className="rounded-xl border border-line bg-card p-4">
        <p className="text-sm text-muted">習得済み（2回連続正解）</p>
        <p className="text-3xl font-bold">
          {hydrated ? mastered : "–"} <span className="text-base font-normal text-muted">/ {questions.length}問</span>
        </p>
        {hydrated && (due > 0 || weak > 0) && (
          <p className="mt-1 text-sm text-muted">
            {due > 0 && <>復習の日が来た問題 {due}問　</>}
            {weak > 0 && <>間違い・途中の問題 {weak}問</>}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link href="/quiz?mode=random" className={btn}>ランダム10問</Link>
        <Link href="/quiz?mode=weak" className={btn}>苦手な問題</Link>
        <Link href="/quiz?mode=fav" className={btn}>★ お気に入り</Link>
        <Link href="/quiz?mode=mock" className={btn}>模擬試験</Link>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">章ごとに解く</h2>
        {chapters.map((c) => {
          const qs = questions.filter((q) => q.chapter === c.id);
          const done = qs.filter((q) => ["mastered", "review"].includes(status(q.id))).length;
          const body = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{c.title}</span>
                <span className="shrink-0 text-sm text-muted">
                  {qs.length === 0 ? "準備中" : `${hydrated ? done : "–"} / ${qs.length}`}
                </span>
              </div>
              <p className="text-xs text-muted">{c.summary}</p>
              {qs.length > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-line">
                  <div className="h-full bg-accent" style={{ width: `${hydrated ? (done / qs.length) * 100 : 0}%` }} />
                </div>
              )}
            </>
          );
          return qs.length === 0 ? (
            <div key={c.id} className="rounded-xl border border-line bg-card p-3 opacity-50">{body}</div>
          ) : (
            <Link key={c.id} href={`/quiz?mode=chapter&chapter=${c.id}`} className="block rounded-xl border border-line bg-card p-3">
              {body}
            </Link>
          );
        })}
      </section>

      <footer className="space-y-2 text-xs text-muted">
        <p>
          問題と解説はすべてオリジナルで、AIが作成した未検証のものです。Oracle の実際の試験問題ではありません。解説の根拠は
          Oracle 公式ドキュメントですが、バージョン差などで誤りが混ざる可能性があります。本番前に公式ドキュメントか実機で確認してください。
        </p>
        <button
          onClick={() => {
            if (confirm("解答の記録とお気に入りをすべて消します。よろしいですか？")) resetAll();
          }}
          className="underline"
        >
          記録をすべて消す
        </button>
      </footer>
    </div>
  );
}
