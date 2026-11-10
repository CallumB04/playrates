-- The library filtered by genre and platform through PostgREST's !inner
-- embed, which runs a subquery for every game it passes, so no index can
-- help. A rare pair (MOBA on Xbox) walked the whole catalogue looking for
-- a page of matches, and its count did the same: past the API's timeout.
--
-- Each game now carries its genre and platform slugs, indexed, so the
-- filter is a containment test. The link tables stay the source: a trigger
-- on them keeps the copies in step, whoever writes them. The games already
-- here are filled by the next migration.

set search_path = pg_catalog, public;

alter table public.games
    add column if not exists genre_slugs text[] not null default '{}',
    add column if not exists platform_slugs text[] not null default '{}';

create index if not exists games_genre_slugs_idx
    on public.games using gin (genre_slugs);
create index if not exists games_platform_slugs_idx
    on public.games using gin (platform_slugs);

create or replace function public.games_sync_link_slugs()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    ids bigint[];
begin
    if tg_op = 'INSERT' then
        select array_agg(distinct game_id) into ids from changed_new;
    elsif tg_op = 'DELETE' then
        select array_agg(distinct game_id) into ids from changed_old;
    else
        select array_agg(distinct game_id) into ids
        from (select game_id from changed_old
              union select game_id from changed_new) c;
    end if;
    if ids is null then
        return null;
    end if;

    -- Only where the set really changed: a refresh rewrites the same links.
    if tg_table_name = 'game_genres' then
        update public.games g
        set genre_slugs = s.slugs
        from (
            select i.id, coalesce(
                (select array_agg(l.genre_slug order by l.genre_slug)
                 from public.game_genres l where l.game_id = i.id),
                '{}') as slugs
            from unnest(ids) as i (id)
        ) s
        where g.id = s.id and g.genre_slugs is distinct from s.slugs;
    else
        update public.games g
        set platform_slugs = s.slugs
        from (
            select i.id, coalesce(
                (select array_agg(l.platform_slug order by l.platform_slug)
                 from public.game_platforms l where l.game_id = i.id),
                '{}') as slugs
            from unnest(ids) as i (id)
        ) s
        where g.id = s.id and g.platform_slugs is distinct from s.slugs;
    end if;
    return null;
end;
$$;

revoke execute on function public.games_sync_link_slugs()
    from anon, authenticated, public;

-- A trigger with transition tables takes one event, so three a table.
create trigger game_genres_sync_insert after insert on public.game_genres
    referencing new table as changed_new
    for each statement execute function public.games_sync_link_slugs();
create trigger game_genres_sync_delete after delete on public.game_genres
    referencing old table as changed_old
    for each statement execute function public.games_sync_link_slugs();
create trigger game_genres_sync_update after update on public.game_genres
    referencing old table as changed_old new table as changed_new
    for each statement execute function public.games_sync_link_slugs();

create trigger game_platforms_sync_insert after insert on public.game_platforms
    referencing new table as changed_new
    for each statement execute function public.games_sync_link_slugs();
create trigger game_platforms_sync_delete after delete on public.game_platforms
    referencing old table as changed_old
    for each statement execute function public.games_sync_link_slugs();
create trigger game_platforms_sync_update after update on public.game_platforms
    referencing old table as changed_old new table as changed_new
    for each statement execute function public.games_sync_link_slugs();

analyze public.games;
