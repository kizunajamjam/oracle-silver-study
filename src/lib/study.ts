import { MOCK, questions, type Question } from "./data";
import type { Attempt, Data } from "./store";

/** 習得済みの問題を「復習」として再び出すまでの日数（連続正解が増えるほど長く） */
export const REVIEW_INTERVALS = [7, 14, 30, 60];
const DAY = 86_400_000;

export type Stat = { tries: number; streak: number; lastAt: number; lastCorrect: boolean };
export type Status = "new" | "learning" | "mastered" | "review";

export function statsOf(attempts: Attempt[]): Map<string, Stat> {
  const map = new Map<string, Stat>();
  for (const a of [...attempts].sort((x, y) => x.at - y.at)) {
    const s = map.get(a.qid) ?? { tries: 0, streak: 0, lastAt: 0, lastCorrect: false };
    map.set(a.qid, {
      tries: s.tries + 1,
      streak: a.correct ? s.streak + 1 : 0,
      lastAt: a.at,
      lastCorrect: a.correct,
    });
  }
  return map;
}

/** 習得＝2回連続正解。習得後も、最後に解いてから一定日数たったら「復習」 */
export function statusOf(s: Stat | undefined, now: number): Status {
  if (!s) return "new";
  if (s.streak < 2) return "learning";
  const days = REVIEW_INTERVALS[Math.min(s.streak - 2, REVIEW_INTERVALS.length - 1)];
  return now - s.lastAt >= days * DAY ? "review" : "mastered";
}

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Mode = "chapter" | "random" | "weak" | "fav" | "mock";
export const MODES: Mode[] = ["chapter", "random", "weak", "fav", "mock"];

export type Session = { ids: string[]; seconds: number };

/** 出題の優先度（小さいほど先）：間違い・途中 → 未着手 → 復習の日が来た → 習得済み。今日解いた問題は後回し */
function priority(q: Question, stats: Map<string, Stat>, now: number): number {
  const s = stats.get(q.id);
  const st = statusOf(s, now);
  let p = st === "learning" ? 0 : st === "new" ? 1 : st === "review" ? 2 : 9;
  if (s && s.lastAt >= startOfDay(now)) p += 20;
  return p;
}

export function buildSession(mode: Mode, chapter: string | undefined, data: Data, now = Date.now()): Session {
  const stats = statsOf(data.attempts);
  const rank = (list: Question[]) =>
    shuffle(list)
      .map((q) => ({ q, p: priority(q, stats, now) }))
      .sort((a, b) => a.p - b.p)
      .map((x) => x.q.id);

  switch (mode) {
    case "chapter":
      return { ids: rank(questions.filter((q) => q.chapter === chapter)), seconds: 0 };
    case "random":
      return { ids: rank(questions).slice(0, 10), seconds: 0 };
    case "weak":
      return {
        ids: shuffle(questions.filter((q) => {
          const s = stats.get(q.id);
          return s && s.streak < 2;
        })).map((q) => q.id),
        seconds: 0,
      };
    case "fav":
      return { ids: shuffle(questions.filter((q) => data.favorites.includes(q.id))).map((q) => q.id), seconds: 0 };
    case "mock": {
      const ids = shuffle(questions).slice(0, MOCK.maxQuestions).map((q) => q.id);
      return { ids, seconds: ids.length * MOCK.secondsPerQuestion };
    }
  }
}

export function sameSet(a: number[], b: number[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}
