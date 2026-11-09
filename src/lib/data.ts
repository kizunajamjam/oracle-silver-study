import raw from "@/generated/data.json";

export type Chapter = { id: string; title: string; summary: string };

export type Question = {
  id: string;
  chapter: string;
  stem: string;
  /** 選ぶ個数（1 なら単一選択、2 以上は「n つ選べ」） */
  select: number;
  choices: string[];
  /** 正解の選択肢の番号（choices の添字） */
  answer: number[];
  /** 選択肢ごとの解説（choices と同じ並び） */
  why: string[];
  /** 紛らわしい用語の見分け方 */
  tip: string;
  /** 根拠にした Oracle ドキュメント */
  ref: string;
};

export const chapters = raw.chapters as Chapter[];
export const questions = raw.questions as unknown as Question[];
export const questionById = new Map(questions.map((q) => [q.id, q]));

/** 模擬試験の設定。1問あたりの時間は本試験（120分／約72問）の比率から。出題数・合格点は Oracle 公式ページで要確認。 */
export const MOCK = { maxQuestions: 72, secondsPerQuestion: 100, passRatio: 0.6 };
