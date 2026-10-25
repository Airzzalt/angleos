-- Script Writer. Every row has an owner.
create table scripts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  angle_id uuid references project_angles(id) on delete set null,
  job_id uuid references ai_jobs(id) on delete set null,
  title text not null default 'Script',
  format text not null,
  length_label text not null,
  note text not null default '',
  current_version integer not null default 1,
  favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scripts_project_idx on scripts (project_id, created_at desc);
create index scripts_angle_idx on scripts (angle_id);

create table script_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  script_id uuid not null references scripts(id) on delete cascade,
  version_no integer not null,
  -- {hooks:[..], scenes:[{say,show}], cta, claims:[{claim,support}], note}
  data jsonb not null,
  -- {grade, words, issues:[{code,message,detail}], pass, fixes:number}
  checks jsonb not null default '{}',
  source text not null default 'ai' check (source in ('ai', 'edit', 'refine')),
  note text not null default '',
  -- Admin-only: which course rules were used and the steps taken. Never shown to members.
  trace jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (script_id, version_no)
);

-- Thumbs on scripts too.
alter table feedback drop constraint if exists feedback_kind_check;
alter table feedback add constraint feedback_kind_check check (kind in ('chat', 'angle', 'script'));
