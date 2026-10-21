-- AngleOS 006: AI connection settings, background AI jobs, and the project brief.
alter table project_files add column category text;
alter table project_files add column summary text;
alter table project_files add column summary_key text;
alter table project_files add column summarised_at timestamptz;

-- Admin-controlled AI settings (models, prices, caps). The API key itself is never stored here: it lives in an environment variable.
create table ai_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- One row per AI run. Used for progress, one-at-a-time rules, spend caps and the decision trace.
create table ai_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  kind text not null,
  status text not null default 'queued' check (status in ('queued','running','done','failed','cancelled')),
  est_cost_cents integer not null default 0,
  cap_cents integer not null default 0,
  spent_cents numeric(12, 4) not null default 0,
  total_steps integer not null default 0,
  done_steps integer not null default 0,
  message text not null default '',
  error text,
  trace jsonb not null default '{}'::jsonb,
  heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index ai_jobs_project_idx on ai_jobs (project_id, created_at desc);
create index ai_jobs_status_idx on ai_jobs (status, heartbeat_at);

create table project_briefs (
  project_id uuid primary key references projects(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  sections jsonb not null default '[]'::jsonb,
  context_score integer,
  missing jsonb not null default '[]'::jsonb,
  model text,
  generated_at timestamptz,
  updated_at timestamptz not null default now()
);
