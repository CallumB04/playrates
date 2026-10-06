-- What closing an account takes with it, and a profile's say over search
-- engines.
--
-- The logs were written to outlive what they describe, which is right for a
-- deleted review and wrong for a deleted person: the admin feed kept their
-- username and excerpts of what they wrote, and the search log kept what
-- they searched for against their id. Closing an account now clears both.
-- Their community posts stay, authorless, as before; that is what the
-- privacy policy says.

set search_path = pg_catalog, public;

create or replace function public.erase_account_traces(p_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
    delete from public.activity_events
    where actor_id = p_id or subject_id = p_id::text;

    -- The searches stay for the catalogue's history, but no longer say whose.
    update public.game_events set actor_id = null where actor_id = p_id;

    update public.server_errors set user_id = null where user_id = p_id;
$$;

revoke execute on function public.erase_account_traces(uuid)
    from anon, authenticated, public;

create or replace function public.activity_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    changed text[];
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (new.id, 'signup', new.id::text,
                jsonb_build_object('username', new.username));
    elsif tg_op = 'DELETE' then
        perform public.erase_account_traces(old.id);
        -- That an account went, and nothing about whose.
        insert into public.activity_events (actor_id, kind, subject_id, data)
        values (null, 'account_deleted', null, '{}'::jsonb);
    else
        -- The heartbeat writes last_seen_at every two minutes; only what a
        -- person chose to change counts.
        changed := array_remove(array[
            case when new.username is distinct from old.username then 'username' end,
            case when new.avatar_url is distinct from old.avatar_url then 'avatar' end,
            case when new.bio is distinct from old.bio then 'bio' end
        ], null);
        if cardinality(changed) > 0 then
            insert into public.activity_events (actor_id, kind, subject_id, data)
            values (new.id, 'profile_updated', new.id::text,
                    jsonb_build_object(
                        'fields', to_jsonb(changed),
                        'username', new.username,
                        'previousUsername',
                        case when 'username' = any(changed) then old.username end
                    ));
        end if;
    end if;
    return null;
end;
$$;

-- Accounts closed before this migration left their traces behind.
do $$
declare
    gone uuid;
begin
    -- First, or the sweep below would take these lines with it.
    update public.activity_events
    set actor_id = null, subject_id = null, data = '{}'::jsonb
    where kind = 'account_deleted';

    for gone in
        select distinct actor_id from public.activity_events
        where actor_id is not null
          and not exists (select 1 from public.profiles p where p.id = actor_id)
    loop
        perform public.erase_account_traces(gone);
    end loop;

    for gone in
        select distinct actor_id from public.game_events
        where actor_id is not null
          and not exists (select 1 from public.profiles p where p.id = actor_id)
    loop
        perform public.erase_account_traces(gone);
    end loop;
end;
$$;

-- Off by default: profiles are public pages, and most people want theirs
-- found. The switch is for those who don't.
alter table public.profiles
    add column hide_from_search boolean not null default false;
