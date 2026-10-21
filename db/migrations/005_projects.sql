-- Phase 2: projects and their uploaded research. Every row has an owner; reads also check workspace membership.
-- Original uploaded files are NOT stored: only the extracted text is kept (safer, and keeps the database small).

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  workspace_id uuid references workspaces(id),
  name text not null,
  product_url text not null default '',
  niche text not null default '',
  market text not null default '',
  description text not null default '',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_idx on projects (owner_id);
create index projects_workspace_idx on projects (workspace_id);

create table project_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  project_id uuid not null references projects(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  size_bytes integer not null default 0,
  char_count integer not null default 0,
  word_count integer not null default 0,
  sha256 text not null,
  extracted_text text not null,
  flags jsonb not null default '[]',
  source_zip text,
  created_at timestamptz not null default now(),
  unique (project_id, sha256)
);
create index project_files_project_idx on project_files (project_id, created_at desc);
create index project_files_owner_idx on project_files (owner_id);

create table project_context (
  project_id uuid primary key references projects(id) on delete cascade,
  owner_id uuid not null references users(id),
  body text not null default '',
  updated_at timestamptz not null default now()
);
