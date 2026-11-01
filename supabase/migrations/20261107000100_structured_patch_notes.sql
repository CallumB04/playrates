-- Patch notes as a list of changes, each a feature, an improvement, a fix
-- or other, with a message above and below them, rather than free text.
-- An entry stays a message in the patch notes thread, so its date, its
-- reactions, the links to it and the record of sending it are its own as
-- before. The note sits beside the body, which the API writes from it for
-- everything that still reads a body.

set search_path = pg_catalog, public;

alter table public.community_messages add column patch_note jsonb;

create or replace view public.community_message_cards
with (security_invoker = true) as
select
    m.id,
    m.thread_id,
    m.parent_id,
    m.author_id,
    m.body,
    m.is_opening,
    m.created_at,
    m.edited_at,
    m.deleted_at,
    p.username        as author_username,
    p.first_name      as author_first_name,
    p.avatar_url      as author_avatar_url,
    p.accent          as author_accent,
    coalesce(v.vote_count, 0)::int as vote_count,
    m.patch_note
from public.community_messages m
left join public.profiles p
    on p.id = m.author_id
left join (
    select message_id, count(*) as vote_count
    from public.community_message_votes
    group by message_id
) v on v.message_id = m.id;
