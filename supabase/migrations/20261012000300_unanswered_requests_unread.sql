-- A friend request still waiting on an answer now stays unread and in the
-- inbox until it is accepted or declined: it cannot be read or archived,
-- and the bulk actions pass it by. Before that, "Mark all read" read them
-- and they could be archived one by one, so put back any that were.

set search_path = pg_catalog, public;

update public.notifications n
set read_at = null,
    archived_at = null
from public.friendships f
where n.kind = 'friend_request'
  and n.actor_id is not null
  and f.status = 'pending'
  and f.requested_by = n.actor_id
  and n.user_id in (f.user_a_id, f.user_b_id)
  and n.actor_id in (f.user_a_id, f.user_b_id)
  and (n.read_at is not null or n.archived_at is not null);
