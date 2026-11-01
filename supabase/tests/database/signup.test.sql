-- News emails are asked for at sign-up, not assumed.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
    ('d1000000-0000-4000-8000-000000000001', 'yes@test.test',
     '{"username":"news_yes","news":true}', '{"provider":"email"}'),
    ('d2000000-0000-4000-8000-000000000002', 'no@test.test',
     '{"username":"news_no","news":false}', '{"provider":"email"}'),
    ('d3000000-0000-4000-8000-000000000003', 'oauth@test.test',
     '{}', '{"provider":"google"}');

select is((select email_prefs from profiles where id = 'd1000000-0000-4000-8000-000000000001'),
    '{}'::jsonb, 'ticked: news on, like every other email');
select is((select email_prefs from profiles where id = 'd2000000-0000-4000-8000-000000000002'),
    '{"news": false}'::jsonb, 'unticked: news off');
select is((select email_prefs from profiles where id = 'd3000000-0000-4000-8000-000000000003'),
    '{"news": false}'::jsonb, 'a provider sign-up, with no box: news off');

select * from finish();
rollback;
