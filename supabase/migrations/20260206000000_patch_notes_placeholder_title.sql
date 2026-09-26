-- The launch placeholder's heading, without the em dash. Only while it is
-- still the placeholder: once the notes are written, they are the admin's.

set search_path = pg_catalog, public;

update public.community_messages m
set body = jsonb_set(m.body, '{content,0,content,0,text}', '"v1.0 Launch"')
from public.community_threads t
where t.id = m.thread_id
  and t.subject_kind = 'patch_notes'
  and m.is_opening
  and m.edited_at is null
  and m.body #>> '{content,0,content,0,text}' = 'v1.0 — Launch';
