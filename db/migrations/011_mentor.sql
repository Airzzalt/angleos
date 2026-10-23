-- Mentor chat, Ask AI and thumbs feedback. Every row has an owner.
alter table kb_collections add column if not exists mentor text not null default 'brand' check (mentor in ('brand', 'kalorip'));

create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null default 'New chat',
  source text not null default 'brand' check (source in ('brand', 'kalorip', 'ask')),
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_threads_owner on chat_threads (owner_id, updated_at desc);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- 'kb' = the answer used the knowledge base, 'general' = general AI knowledge. Only set on assistant messages.
  basis text not null default '' check (basis in ('', 'kb', 'general')),
  -- Admin-only: which lessons and rules were used. Never shown to members.
  sources jsonb not null default '[]',
  has_image boolean not null default false,
  created_at timestamptz not null default now()
);
create index chat_messages_thread on chat_messages (thread_id, created_at);

-- Thumbs up / down on chat answers and on angles. One rating per person per item.
create table feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('chat', 'angle')),
  target_id uuid not null,
  rating smallint not null check (rating in (-1, 1)),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kind, target_id)
);
create index feedback_recent on feedback (created_at desc);
