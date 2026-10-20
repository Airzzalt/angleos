-- AngleOS 002: per-person spending limit and "last seen" (for the live users list).
-- usage_limit_cents: the lifetime AI budget in Australian cents. NULL means unlimited.
-- Everyone starts at A$10.00 (1000 cents). Admins are always unlimited.
alter table users add column usage_limit_cents integer default 1000 check (usage_limit_cents is null or usage_limit_cents >= 0);
alter table users add column last_seen_at timestamptz;
update users set usage_limit_cents = null where role = 'admin';
