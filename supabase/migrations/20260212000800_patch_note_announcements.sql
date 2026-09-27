-- A patch-notes entry goes out to everyone as an ordinary announcement, so it
-- has the history, the read count and taking it back like any other. This
-- ties the announcement to the entry it announces, which is how the admin
-- sees which entries have gone out.
--
-- Once per entry while it stands: taking it back frees the entry to go out
-- again, and the index stops two sends racing past the API's own check.

set search_path = pg_catalog, public;

alter table public.announcements
    add column patch_note_message_id bigint
        references public.community_messages (id) on delete set null;

create unique index announcements_patch_note_once
    on public.announcements (patch_note_message_id)
    where patch_note_message_id is not null and retracted_at is null;

-- `a.*` in a view is fixed when the view is made, so it is made again to
-- carry the new column.
drop view public.announcement_cards;

create view public.announcement_cards
with (security_invoker = true) as
select
    a.*,
    coalesce(n.read_count, 0) as read_count
from public.announcements a
left join lateral (
    select count(*) filter (where read_at is not null) as read_count
    from public.notifications
    where kind = 'announcement' and dedupe_key = 'announcement:' || a.id
) n on true;

revoke all on public.announcement_cards from anon, authenticated;
