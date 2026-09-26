-- What happens to the catalogue: games arriving, their art and descriptions
-- being filled in, and the pulls and imports that caused it.
--
-- Two writers. Triggers record what changed in `games`, whatever changed it.
-- The API records why: the search that fell through to RAWG, a manual pull, a
-- backfill that failed and so changed nothing a trigger could see.
--
-- No foreign keys, as with activity_events: a log outlives what it describes.

set search_path = pg_catalog, public;

create table public.game_events (
    id bigint generated always as identity primary key,
    kind text not null,
    game_id bigint,
    -- search, page_view, manual_pull, import, admin. Null from a trigger,
    -- which cannot see the request.
    source text,
    actor_id uuid,
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),

    constraint game_events_kind_format check (kind ~ '^[a-z][a-z0-9_]*$')
);

create index game_events_feed_idx
    on public.game_events (created_at desc, id desc);

create index game_events_kind_idx
    on public.game_events (kind, created_at desc, id desc);

create index game_events_game_idx
    on public.game_events (game_id, created_at desc);

alter table public.game_events enable row level security;
revoke all on public.game_events from anon, authenticated;

-- Only the columns a person would notice. RAWG's popularity figures and the
-- trigger-kept rollups change constantly and say nothing.
create or replace function public.game_events_from_games()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.game_events (kind, game_id, data)
        values ('game_added', new.id, jsonb_build_object(
            'title', new.title,
            'rawgId', new.rawg_id,
            'releaseDate', new.release_date,
            'hasCover', new.cover_url is not null,
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

create trigger games_events
    after insert or update on public.games
    for each row execute function public.game_events_from_games();

revoke execute on function public.game_events_from_games()
    from anon, authenticated, public;

-- RAWG requests per day, against the monthly allowance. Every call counts,
-- live traffic and scripts alike, so it is bumped from the provider itself.
create table public.rawg_usage_days (
    day date primary key,
    requests int not null default 0,
    failures int not null default 0,
    last_request_at timestamptz,
    last_failure_at timestamptz,
    last_error text
);

alter table public.rawg_usage_days enable row level security;
revoke all on public.rawg_usage_days from anon, authenticated;

create or replace function public.bump_rawg_usage(p_failed boolean, p_error text)
returns void
language sql
set search_path = pg_catalog, public
as $$
    insert into public.rawg_usage_days
        (day, requests, failures, last_request_at, last_failure_at, last_error)
    values (
        (now() at time zone 'utc')::date, 1, p_failed::int, now(),
        case when p_failed then now() end,
        case when p_failed then left(p_error, 300) end
    )
    on conflict (day) do update set
        requests = rawg_usage_days.requests + 1,
        failures = rawg_usage_days.failures + p_failed::int,
        last_request_at = now(),
        last_failure_at = case when p_failed then now()
                               else rawg_usage_days.last_failure_at end,
        last_error = case when p_failed then left(p_error, 300)
                          else rawg_usage_days.last_error end;
$$;

revoke execute on function public.bump_rawg_usage(boolean, text)
    from anon, authenticated, public;
