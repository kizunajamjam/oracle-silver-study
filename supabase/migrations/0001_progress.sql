-- Silver DBA Study: 解答履歴とお気に入り（ログインユーザー本人の行だけ読み書き可能）
-- テーブル名に dba_ を付けてあるので、ほかのアプリと同じ Supabase プロジェクトにも入れられる。

create table public.dba_attempts (
  id text not null,                         -- クライアント生成（再送しても重複しない）
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id text not null,                -- 例: arch-001
  correct boolean not null,
  mode text not null,
  answered_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index dba_attempts_user_time on public.dba_attempts (user_id, answered_at);

create table public.dba_favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

grant select, insert, update, delete on public.dba_attempts to authenticated;
grant select, insert, update, delete on public.dba_favorites to authenticated;

alter table public.dba_attempts enable row level security;
alter table public.dba_favorites enable row level security;

create policy "own attempts" on public.dba_attempts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own favorites" on public.dba_favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
