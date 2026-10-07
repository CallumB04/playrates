-- A log per platform.
--
-- A game can now be logged once for each console it was played on, so a log
-- is (user, game, console) rather than (user, game). At most one log has no
-- console: logs from before consoles were tracked, and quick adds.
--
-- A review belonged to (user, game) and took its rating from a join on the
-- log. It now belongs to one log, so a PS5 review and a Switch review sit side
-- by side, and deleting the Switch log takes only the Switch review with it.

set search_path = pg_catalog, public;

-- Every review has to find its log before reviews can point at logs.
do $$
begin
    if exists (
        select 1 from public.reviews r
        where not exists (
            select 1 from public.game_logs l
            where l.user_id = r.user_id and l.game_id = r.game_id
        )
    ) then
        raise exception 'reviews without a log: resolve them before this migration';
    end if;
end;
$$;

-- Logs ------------------------------------------------------------------------

-- The target of the reviews foreign key below, which carries user and game
-- so a review can never point at somebody else's log or another game's.
alter table public.game_logs
    add constraint game_logs_id_user_game_key unique (id, user_id, game_id);

alter table public.game_logs
    drop constraint game_logs_user_game_unique;

-- nulls not distinct: two logs without a console would be two logs nobody
-- could tell apart. Deleting a platform_systems row nulls system_slug, which
-- can collide here; that table is curated, so it is left to fail loudly.
alter table public.game_logs
    add constraint game_logs_user_game_system_unique
    unique nulls not distinct (user_id, game_id, system_slug);

-- Reviews ---------------------------------------------------------------------

alter table public.reviews add column log_id bigint;

update public.reviews r
set log_id = l.id
from public.game_logs l
where l.user_id = r.user_id and l.game_id = r.game_id;

alter table public.reviews alter column log_id set not null;

alter table public.reviews
    add constraint reviews_log_fk
    foreign key (log_id, user_id, game_id)
    references public.game_logs (id, user_id, game_id)
    on delete cascade;

alter table public.reviews
    add constraint reviews_log_unique unique (log_id);

alter table public.reviews drop constraint reviews_user_game_unique;

create index if not exists reviews_user_game_idx
    on public.reviews (user_id, game_id);

-- The backend live when this lands still inserts reviews by (user, game).
-- Until it is replaced, find the log for it. Dropped once it is.
create or replace function public.reviews_fill_log_id()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if new.log_id is null then
        select l.id into new.log_id
        from public.game_logs l
        where l.user_id = new.user_id and l.game_id = new.game_id
        order by l.system_slug is not null, l.id
        limit 1;
        if new.log_id is null then
            raise exception 'a review needs a log' using errcode = '23503';
        end if;
    end if;
    return new;
end;
$$;

revoke execute on function public.reviews_fill_log_id()
    from anon, authenticated, public;

create trigger reviews_fill_log_id
    before insert on public.reviews
    for each row execute function public.reviews_fill_log_id();

-- This deleted by (user, game), so removing the PS4 log would take the PS5
-- review too. The foreign key's cascade does the job now, per log.
drop trigger if exists game_logs_delete_review on public.game_logs;
drop function if exists public.delete_review_with_log();

-- Read models -----------------------------------------------------------------

-- Joined on the log itself: by (user, game), a review would come back once for
-- every platform its author logged. Appended, as create or replace requires.
create or replace view public.review_cards
with (security_invoker = true) as
select
    r.id,
    r.user_id,
    r.game_id,
    r.body,
    r.is_public,
    r.created_at,
    r.updated_at,
    l.rating,
    l.hours_played,
    l.status,
    l.played_status,
    l.platform_slug,
    p.username        as author_username,
    p.first_name      as author_first_name,
    p.avatar_url      as author_avatar_url,
    p.accent          as author_accent,
    p.last_seen_at    as author_last_seen_at,
    g.title           as game_title,
    g.slug            as game_slug,
    coalesce(g.box_art_url, g.cover_url) as game_cover_url,
    coalesce(v.vote_count, 0)::int as vote_count,
    g.has_sexual_content as game_has_sexual_content,
    r.contains_spoilers,
    r.log_id,
    l.system_slug
from public.reviews r
left join public.game_logs l
    on l.id = r.log_id
left join public.profiles p
    on p.id = r.user_id
join public.games g
    on g.id = r.game_id
left join (
    select review_id, count(*) as vote_count
    from public.review_votes
    group by review_id
) v on v.review_id = r.id;

revoke all on public.review_cards from anon, authenticated;

create or replace view public.friend_activity
with (security_invoker = true) as
select
    e.user_id       as viewer_id,
    l.id            as log_id,
    l.user_id,
    l.game_id,
    l.status,
    l.played_status,
    l.rating,
    l.hours_played,
    l.updated_at,
    p.username      as actor_username,
    p.avatar_url    as actor_avatar_url,
    p.accent        as actor_accent,
    p.last_seen_at  as actor_last_seen_at,
    g.title         as game_title,
    coalesce(g.box_art_url, g.cover_url) as game_cover_url,
    g.has_sexual_content as game_has_sexual_content,
    l.system_slug
from public.friend_edges e
join public.game_logs l
    on l.user_id = e.friend_id
join public.profiles p
    on p.id = l.user_id
join public.games g
    on g.id = l.game_id
where e.status = 'accepted';

revoke all on public.friend_activity from anon, authenticated;

-- Activity carries the console, so a second platform reads "on PS5" rather
-- than looking like the same game logged twice. Moving a log to another
-- console is an update worth recording.
create or replace function public.activity_from_game_logs()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
        values (new.user_id, 'log_added', new.game_id, new.id::text,
                jsonb_build_object(
                    'status', new.status,
                    'playedStatus', new.played_status,
                    'rating', new.rating,
                    'system', new.system_slug
                ));
    elsif tg_op = 'DELETE' then
        if public.profile_exists(old.user_id) then
            insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
            values (old.user_id, 'log_removed', old.game_id, old.id::text,
                    jsonb_build_object(
                        'status', old.status,
                        'system', old.system_slug));
        end if;
    elsif new.status is distinct from old.status
       or new.played_status is distinct from old.played_status
       or new.rating is distinct from old.rating
       or new.system_slug is distinct from old.system_slug then
        insert into public.activity_events (actor_id, kind, game_id, subject_id, data)
        values (new.user_id, 'log_updated', new.game_id, new.id::text,
                jsonb_build_object(
                    'from', jsonb_build_object(
                        'status', old.status,
                        'playedStatus', old.played_status,
                        'rating', old.rating,
                        'system', old.system_slug),
                    'to', jsonb_build_object(
                        'status', new.status,
                        'playedStatus', new.played_status,
                        'rating', new.rating,
                        'system', new.system_slug)
                ));
    end if;
    return null;
end;
$$;
