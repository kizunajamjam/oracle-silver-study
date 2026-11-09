import type { Question } from "@/lib/data";

/** 問題文・各選択肢の解説・見分け方・根拠をまとめて表示する（選択肢は元の並び） */
export function Review({ q, picked }: { q: Question; picked?: number[] }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="whitespace-pre-wrap font-medium">{q.stem}</p>
      <ul className="space-y-2">
        {q.choices.map((c, i) => {
          const right = q.answer.includes(i);
          const chosen = picked?.includes(i);
          return (
            <li
              key={i}
              className={`rounded-lg border p-2 ${right ? "border-ok bg-ok-bg" : chosen ? "border-ng bg-ng-bg" : "border-line"}`}
            >
              <p className="font-medium">
                {right ? "✓ 正解　" : chosen ? "✗ あなたの解答　" : ""}
                {c}
              </p>
              <p className="mt-1 text-muted">{q.why[i]}</p>
            </li>
          );
        })}
      </ul>
      <p className="rounded-lg bg-card p-2 ring-1 ring-line">
        <span className="font-bold">見分け方：</span>
        {q.tip}
      </p>
      <p className="text-xs text-muted">根拠：{q.ref}　／　解説はAI作成・未検証。本番前に公式ドキュメントか実機で確認してください。</p>
    </div>
  );
}
