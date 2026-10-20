-- Phase 1: the knowledge base. ADMIN ONLY. Course text lives here, in the database, never in the public code repo.
-- Every row has an owner (the admin who added it).

create table kb_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  name text not null unique,
  authority_tier integer not null default 2 check (authority_tier between 1 and 3),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table kb_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  collection_id uuid not null references kb_collections(id) on delete cascade,
  title text not null,
  lesson_ref text not null default '',
  authority_tier integer not null default 2 check (authority_tier between 1 and 3),
  source_file_name text not null,
  raw_text text not null,
  clean_text text not null,
  quality_flags jsonb not null default '[]',
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, source_file_name)
);

create table kb_chunks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  document_id uuid not null references kb_documents(id) on delete cascade,
  position integer not null,
  text text not null,
  tsv tsvector generated always as (to_tsvector('english', text)) stored
);
create index kb_chunks_tsv on kb_chunks using gin (tsv);
create index kb_chunks_doc on kb_chunks (document_id, position);

-- A playbook module is one file (for example 06_HOOK). Workflow modules (ANIM_*) have no numbered rules, only a body.
create table playbook_modules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  code text not null unique,
  title text not null,
  used_by text not null default '',
  kind text not null default 'rules' check (kind in ('rules', 'workflow')),
  intro_md text not null default '',
  body_md text not null default '',
  active boolean not null default true,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  tsv tsvector generated always as (to_tsvector('english', title || ' ' || body_md)) stored
);
create index playbook_modules_tsv on playbook_modules using gin (tsv);

create table playbook_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  module_id uuid not null references playbook_modules(id) on delete cascade,
  rule_code text not null unique,
  title text not null,
  body_md text not null,
  original_body_md text not null,
  flags text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'off', 'proposed')),
  position integer not null default 0,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  tsv tsvector generated always as (to_tsvector('english', rule_code || ' ' || title || ' ' || body_md)) stored
);
create index playbook_rules_tsv on playbook_rules using gin (tsv);
create index playbook_rules_module on playbook_rules (module_id, position);

-- Evolve prompts and other standing prompts. Text is used exactly as written; edits make a new version.
create table admin_prompts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  key text not null unique,
  title text not null,
  description text not null default '',
  placeholders text[] not null default '{}',
  body text not null,
  original_body text not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table admin_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  prompt_id uuid not null references admin_prompts(id) on delete cascade,
  version_no integer not null,
  body text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
