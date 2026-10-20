-- AngleOS 003: change name (once every 30 days) and admin-issued password reset codes.
alter table users add column name_changed_at timestamptz;

-- A reset code is made by an admin, shown once, works once and lasts 1 hour. Only a hash is stored.
create table password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index password_resets_user_idx on password_resets (user_id);
