"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Quiz } from "@/components/Quiz";
import { useHydrated } from "@/lib/store";
import { MODES, type Mode } from "@/lib/study";

function Inner() {
  const sp = useSearchParams();
  const hydrated = useHydrated();
  const m = sp.get("mode");
  const mode: Mode = MODES.includes(m as Mode) ? (m as Mode) : "random";
  const chapter = sp.get("chapter") ?? undefined;
  if (!hydrated) return <p className="text-muted">読み込み中…</p>;
  return <Quiz key={`${mode}:${chapter ?? ""}`} mode={mode} chapter={chapter} />;
}

export default function QuizPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Inner />
    </Suspense>
  );
}
