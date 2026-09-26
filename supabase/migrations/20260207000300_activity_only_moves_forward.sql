-- A thread's last activity only moves forward. The trigger set it to each
-- new message's time outright, so a message stamped earlier than the latest
-- one (an import, a backfill) would make a busy thread look idle.

set search_path = pg_catalog, public;

create or replace function public.community_bump_thread_activity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    update public.community_threads
    set last_activity_at = greatest(last_activity_at, new.created_at)
    where id = new.thread_id;
    return new;
end;
$$;
