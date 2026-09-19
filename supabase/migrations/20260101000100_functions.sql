-- Shared trigger functions.

-- Keeps updated_at honest. Every table with an updated_at column attaches this
-- rather than trusting the application to remember.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;
