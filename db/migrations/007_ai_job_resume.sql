-- A run that was cut off (server restart, deploy, sleep) picks itself up again. Count the attempts so it cannot loop forever.
alter table ai_jobs add column resumes integer not null default 0;
