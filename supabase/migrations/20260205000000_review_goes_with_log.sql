-- A review goes when the log it was written from goes.
--
-- Deleting a log promised to take the review with it, and nothing did: there
-- is no foreign key between the two (a review is keyed by user and game, not
-- by log), so the review stayed public with its rating, hours and status
-- gone from under it. A trigger rather than the service, so every way a log
-- is deleted — the API, an admin in the dashboard, a cascade — keeps the
-- promise.

set search_path = pg_catalog, public;

create or replace function public.delete_review_with_log()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    delete from public.reviews
    where user_id = old.user_id and game_id = old.game_id;
    return old;
end;
$$;

create trigger game_logs_delete_review
    after delete on public.game_logs
    for each row execute function public.delete_review_with_log();

-- The ones already left behind.
delete from public.reviews r
where not exists (
    select 1 from public.game_logs l
    where l.user_id = r.user_id and l.game_id = r.game_id
);
