-- IGDB, part one: everything the new catalogue needs, added alongside RAWG's
-- columns rather than in place of them, so the code running now keeps
-- working until the code that reads these is deployed. Part two drops RAWG
-- once its rows are gone.

set search_path = pg_catalog, public;

alter table public.games
    add column igdb_id bigint unique,
    -- IGDB's average of professional reviews. Metacritic's 0-100, so the
    -- RAWG games still here carry their score across until they are replaced.
    add column critic_score int,
    -- How many people have rated it on IGDB: the "how well known" figure the
    -- catalogue is ordered by, where RAWG's tracker count was.
    add column igdb_rating_count int,
    add constraint games_critic_score check (critic_score between 0 and 100);

update public.games set critic_score = metacritic where metacritic is not null;

create index games_critic_score_idx on public.games (critic_score desc nulls last);

create index games_logged_then_known_idx
    on public.games (log_count desc, igdb_rating_count desc nulls last, id);

create index games_known_idx on public.games (igdb_rating_count desc nulls last);

-- IGDB requests per day. There is no monthly allowance to count against,
-- only a rate, so this is for seeing failures rather than budgeting.
create table public.igdb_usage_days (
    day date primary key,
    requests int not null default 0,
    failures int not null default 0,
    last_request_at timestamptz,
    last_failure_at timestamptz,
    last_error text
);

alter table public.igdb_usage_days enable row level security;
revoke all on public.igdb_usage_days from anon, authenticated;

create or replace function public.bump_igdb_usage(p_failed boolean, p_error text)
returns void
language sql
set search_path = pg_catalog, public
as $$
    insert into public.igdb_usage_days
        (day, requests, failures, last_request_at, last_failure_at, last_error)
    values (
        (now() at time zone 'utc')::date, 1, p_failed::int, now(),
        case when p_failed then now() end,
        case when p_failed then left(p_error, 300) end
    )
    on conflict (day) do update set
        requests = igdb_usage_days.requests + 1,
        failures = igdb_usage_days.failures + p_failed::int,
        last_request_at = now(),
        last_failure_at = case when p_failed then now()
                               else igdb_usage_days.last_failure_at end,
        last_error = case when p_failed then left(p_error, 300)
                          else igdb_usage_days.last_error end;
$$;

revoke execute on function public.bump_igdb_usage(boolean, text)
    from anon, authenticated, public;

-- How big the database is, so a bulk import can stop short of the plan's
-- limit instead of finding it.
create or replace function public.catalogue_storage()
returns bigint
language sql
stable
set search_path = pg_catalog, public
as $$
    select pg_database_size(current_database());
$$;

revoke execute on function public.catalogue_storage()
    from anon, authenticated, public;

-- A bulk import adds tens of thousands of games at once; a game_added line
-- for each would bury the admin feed and fill the table it lives in. The
-- import switches this on while it runs.
insert into public.admin_settings (key, value)
values ('catalogue_import', '{"running": false}'::jsonb)
on conflict (key) do nothing;

create or replace function public.game_events_from_games()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if exists (
        select 1 from public.admin_settings
        where key = 'catalogue_import' and (value->>'running')::boolean
    ) then
        return null;
    end if;

    if tg_op = 'INSERT' then
        insert into public.game_events (kind, game_id, data)
        values ('game_added', new.id, jsonb_build_object(
            'title', new.title,
            'igdbId', new.igdb_id,
            'releaseDate', new.release_date,
            'hasCover', coalesce(new.box_art_url, new.cover_url) is not null,
            'hasDescription', new.description <> ''
        ));
        return null;
    end if;

    insert into public.game_events (kind, game_id, data)
    select kind, new.id, data
    from (values
        ('cover_updated',
         new.cover_url is distinct from old.cover_url,
         jsonb_build_object('title', new.title, 'hadOne', old.cover_url is not null)),
        ('box_art_updated',
         new.box_art_url is distinct from old.box_art_url,
         jsonb_build_object('title', new.title, 'hadOne', old.box_art_url is not null)),
        ('description_pulled',
         new.description is distinct from old.description and new.description <> '',
         jsonb_build_object('title', new.title, 'hadOne', old.description <> '',
                            'length', char_length(new.description))),
        ('release_date_changed',
         new.release_date is distinct from old.release_date,
         jsonb_build_object('title', new.title, 'from', old.release_date,
                            'to', new.release_date)),
        ('title_changed',
         new.title is distinct from old.title,
         jsonb_build_object('title', new.title, 'from', old.title))
    ) as changes (kind, changed, data)
    where changed;

    return null;
end;
$$;
