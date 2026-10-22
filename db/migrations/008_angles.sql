-- AngleOS 008: Angle Generator. Quick projects (no brief needed) and saved angles.
alter table projects add column kind text not null default 'full' check (kind in ('full','quick'));

create table project_angles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  job_id uuid references ai_jobs(id) on delete set null,
  position integer not null default 0,
  data jsonb not null,
  favourite boolean not null default false,
  edited boolean not null default false,
  created_at timestamptz not null default now()
);
create index project_angles_project_idx on project_angles (project_id, created_at desc, position);
