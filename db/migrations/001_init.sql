-- AngleOS 001: people, sessions, invites, usage. Every row is owned by a user/workspace.

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  password_hash text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index users_email_lower_idx on users (lower(email));

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'owner',
  primary key (workspace_id, user_id)
);

-- Only a hash of the session token is stored; the real token lives in the browser cookie.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text
);
create index sessions_user_idx on sessions (user_id);

-- Invite-only registration. Only a hash of the code is stored; the admin sees the code once.
create table invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  note text,
  locked_email text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_by uuid references users(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz
);

-- Failed login / register attempts, used for rate limiting.
create table login_attempts (
  id bigserial primary key,
  key text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index login_attempts_lookup_idx on login_attempts (kind, key, created_at);

-- AI usage (filled in from Phase 1 onwards).
create table usage_log (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  workspace_id uuid references workspaces(id) on delete set null,
  task text not null,
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  media_seconds integer,
  est_cost numeric(12, 6),
  created_at timestamptz not null default now()
);
create index usage_log_user_idx on usage_log (user_id, created_at);
