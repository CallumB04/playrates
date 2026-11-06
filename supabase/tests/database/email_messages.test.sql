-- Who each email went to: Resend's webhook only moves an email forward,
-- finds a broadcast's recipient by address, leaves account emails alone,
-- and the rows go with the account and after a month.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data)
values ('e1000000-0000-4000-8000-000000000001', 'ana@test.test', '{"username":"mail_a"}'),
       ('e2000000-0000-4000-8000-000000000002', 'bo@test.test', '{"username":"mail_b"}');

insert into public.email_messages
    (user_id, to_address, kind, subject, status, resend_id, broadcast_id)
values ('e1000000-0000-4000-8000-000000000001', 'ana@test.test',
        'friend_request', 'Hi', 'sent', 're_1', null),
       ('e2000000-0000-4000-8000-000000000002', 'Bo@Test.test',
        'announcement', 'News', 'sent', null, 'bc_1');

select is(public.record_email_event('re_1', null, 'ana@test.test', 'delivered', null), 1,
    'a delivery moves its email on');
select is(public.record_email_event('re_1', null, 'ana@test.test', 'delayed', null), 0,
    'a late delay does not move it back');
select is(public.record_email_event('re_1', null, 'ana@test.test', 'bounced', 'Mailbox full'), 1,
    'a bounce after delivery is kept');
select results_eq($$select status, detail from email_messages where resend_id = 're_1'$$,
    $$values ('bounced'::text, 'Mailbox full'::text)$$, 'with why');

select is(public.record_email_event('re_other', 'bc_1', 'bo@test.test', 'delivered', null), 1,
    'a broadcast''s recipient is found by the broadcast and their address');
select is(public.record_email_event('re_reset', null, 'ana@test.test', 'delivered', null), 0,
    'an account email changes nothing');
select is(public.record_email_event('re_1', null, 'ana@test.test', 'opened', null), 0,
    'an event the log has no status for changes nothing');

update public.email_messages set sent_at = now() - interval '31 days'
where resend_id = 're_1';
select public.prune_old_rows();
select is((select count(*) from email_messages where resend_id = 're_1')::int, 0,
    'pruning takes rows over a month old');

delete from auth.users where id = 'e2000000-0000-4000-8000-000000000002';
select is((select count(*) from email_messages where broadcast_id = 'bc_1')::int, 0,
    'a closed account takes its emails with it');

select ok(not has_table_privilege('authenticated', 'public.email_messages', 'select'),
    'members cannot read the log');
select ok(not has_function_privilege('authenticated',
    'public.record_email_event(text, text, text, text, text)', 'execute'),
    'members cannot move an email on');

select * from finish();
rollback;
