-- How bold the ads may be, per project: strict, standard (default) or bold.
alter table projects add column if not exists claim_level text not null default 'standard' check (claim_level in ('strict','standard','bold'));
