-- When the first-login welcome was dismissed. Null means it has not been, and
-- the next sign-in shows it: a new account's first, whenever that is — straight
-- after signup, or after the email confirmation if the project asks for one.
--
-- A timestamp rather than a boolean: it costs nothing more, and says when.
alter table public.profiles
    add column if not exists onboarded_at timestamptz;

-- Everyone here before the welcome existed has long since found their way
-- around, and greeting them as new would be wrong. Dated to their signup
-- rather than now(): nobody was welcomed today.
update public.profiles
set onboarded_at = created_at
where onboarded_at is null;
