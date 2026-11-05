-- Notifications tidy themselves away: read or cleared, and two months old.
-- Anything unread stays, however old.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('f1000000-0000-4000-8000-000000000001', 'n@test.test', '{"username":"expiry_a"}');

insert into public.notifications (user_id, kind, dedupe_key, read_at, archived_at, created_at)
values
    ('f1000000-0000-4000-8000-000000000001', 'welcome', 'old-read',
        now() - interval '61 days', null, now() - interval '61 days'),
    ('f1000000-0000-4000-8000-000000000001', 'welcome', 'old-cleared',
        now() - interval '61 days', now() - interval '61 days', now() - interval '61 days'),
    ('f1000000-0000-4000-8000-000000000001', 'welcome', 'old-unread',
        null, null, now() - interval '200 days'),
    ('f1000000-0000-4000-8000-000000000001', 'welcome', 'recent-read',
        now() - interval '2 days', null, now() - interval '3 days');

select ok((public.prune_old_rows() ->> 'notifications')::int >= 2,
    'the clean-up says how many it took');

select is((select count(*) from notifications where dedupe_key = 'old-read')::int, 0,
    'a read one two months old goes');
select is((select count(*) from notifications where dedupe_key = 'old-cleared')::int, 0,
    'so does a cleared one');
select is((select count(*) from notifications where dedupe_key = 'old-unread')::int, 1,
    'an unread one stays, however old');
select is((select count(*) from notifications where dedupe_key = 'recent-read')::int, 1,
    'a recent one stays');

select * from finish();
rollback;
