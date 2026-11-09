// data/ の章と問題を検証し、アプリが読む src/generated/data.json にまとめる。
// 構造に誤りがあれば exit 1（ビルドを止める）。
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chapters = JSON.parse(readFileSync(join(root, "data/chapters.json"), "utf8"));
const chapterIds = new Set(chapters.map((c) => c.id));

const errors = [];
const questions = [];
const seen = new Set();

for (const file of readdirSync(join(root, "data/questions")).filter((f) => f.endsWith(".json")).sort()) {
  const list = JSON.parse(readFileSync(join(root, "data/questions", file), "utf8"));
  for (const q of list) {
    const at = `${file}:${q.id ?? "?"}`;
    const err = (m) => errors.push(`${at} ${m}`);
    if (!q.id || seen.has(q.id)) err("id が空か重複");
    seen.add(q.id);
    if (!chapterIds.has(q.chapter)) err(`未定義の章 ${q.chapter}`);
    if (!q.stem?.trim()) err("stem が空");
    if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 6) err("choices は2〜6個");
    const n = q.choices?.length ?? 0;
    if (new Set(q.choices).size !== n) err("choices に重複");
    if (!Number.isInteger(q.select) || q.select < 1) err("select が不正");
    if (!Array.isArray(q.answer) || q.answer.length !== q.select) err("answer の数が select と不一致");
    if (new Set(q.answer).size !== q.answer?.length || q.answer?.some((i) => !Number.isInteger(i) || i < 0 || i >= n)) err("answer が不正");
    if (!Array.isArray(q.why) || q.why.length !== n || q.why.some((w) => !w?.trim())) err("why は選択肢と同数で、すべて埋める");
    if (!q.tip?.trim()) err("tip が空");
    if (!q.ref?.trim()) err("ref が空");
    // 選択肢を入れ替えて出すので、記号(ア・イ・A〜D 等)で選択肢を指していないか
    const text = [q.stem, ...(q.choices ?? []), ...(q.why ?? []), q.tip].join("\n");
    if (/[（(][A-Da-d][）)]|選択肢\s*[A-Da-d]|(^|[\s「『（(、。])[ア-エ]\s*(は|が|の記述)/m.test(text)) err("選択肢を記号で指している可能性（並びを入れ替えて出すため不可）");
    questions.push(q);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n✗ ${errors.length} 件のエラー`);
  process.exit(1);
}

mkdirSync(join(root, "src/generated"), { recursive: true });
writeFileSync(join(root, "src/generated/data.json"), JSON.stringify({ chapters, questions }));
const by = Object.fromEntries(chapters.map((c) => [c.id, questions.filter((q) => q.chapter === c.id).length]));
console.log(`✓ ${questions.length} 問 / ${chapters.length} 章`, JSON.stringify(by));
