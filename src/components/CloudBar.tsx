"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, startCloud, sync, useCloud } from "@/lib/cloud";

/** ホーム上部の同期バー。Supabase が未設定なら何も出さない（端末内だけで動く） */
export function CloudBar() {
  const { status, email, error, pending } = useCloud();
  const [open, setOpen] = useState(false);
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => startCloud(), []);

  if (status === "off" || status === "loading") return null;

  if (status === "in") {
    return (
      <div className="space-y-1 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span>☁ {email}</span>
          {pending > 0 && <span className="text-ng">未同期 {pending} 件</span>}
          <button onClick={() => void sync()} className="underline">今すぐ同期</button>
          <button onClick={() => void signOut()} className="ml-auto underline">ログアウト</button>
        </div>
        {error && <p className="rounded-lg bg-ng-bg p-2 text-ng">{error}</p>}
      </div>
    );
  }

  return (
    <div className="text-xs text-muted">
      {!open ? (
        <p>
          記録はこの端末にだけ保存されています。
          <button onClick={() => setOpen(true)} className="ml-1 font-bold text-accent underline">
            ログインして端末間で同期
          </button>
        </p>
      ) : (
        <form
          className="space-y-2 rounded-xl border border-line bg-card p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg(await signIn(mail, pass));
            setBusy(false);
          }}
        >
          <input
            type="email"
            required
            autoComplete="username"
            placeholder="メールアドレス"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-fg"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="パスワード"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-fg"
          />
          {msg && <p className="text-ng">{msg}</p>}
          <div className="flex items-center gap-3">
            <button disabled={busy} className="rounded-lg bg-accent px-4 py-2 font-bold text-accent-fg disabled:opacity-50">
              ログイン
            </button>
            <button type="button" onClick={() => setOpen(false)} className="underline">閉じる</button>
          </div>
          <p>ログインすると、この端末の記録がクラウドに送られ、ほかの端末の記録とまとまります。</p>
        </form>
      )}
    </div>
  );
}
