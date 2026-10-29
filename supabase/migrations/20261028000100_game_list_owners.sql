-- A list's card with its owner on it: their name and face for the card,
-- and their profile's visibility, so the lists anyone may see (Community,
-- a game's page) can be asked for in one query, and paged.

set search_path = pg_catalog, public;

create or replace view public.game_list_cards
with (security_invoker = true)
as
select
    l.*,
    coalesce(items.game_count, 0)::int as game_count,
    coalesce(votes.vote_count, 0)::int as vote_count,
    coalesce(items.first_game_ids, '{}') as first_game_ids,
    p.username as owner_username,
    p.avatar_url as owner_avatar_url,
    p.accent as owner_accent,
    p.profile_visibility as owner_visibility
from public.game_lists l
join public.profiles p on p.id = l.user_id
left join lateral (
    select
        count(*) as game_count,
        (array_agg(i.game_id order by i.position))[1:4] as first_game_ids
    from public.game_list_items i
    where i.list_id = l.id
) items on true
left join lateral (
    select count(*) as vote_count
    from public.game_list_votes v
    where v.list_id = l.id
) votes on true;

revoke all on public.game_list_cards from anon, authenticated;
