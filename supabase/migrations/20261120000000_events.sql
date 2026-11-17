-- Events: what's on in gaming. Each event is of a kind, and a kind brings
-- tables of its own. An awards night (The Game Awards 2026) has categories,
-- nominees and each member's pick of who wins; a showcase has the games it
-- revealed and members' hype for each. A new kind adds itself to the check
-- below and its own tables beside these. Badges for taking part, earned
-- only while an event is on, are shared by every kind.
--
-- An event is a draft until it's published, so it can be filled in as it's
-- announced without anyone seeing half of it.

set search_path = pg_catalog, public;

create table public.events (
    id bigint generated always as identity primary key,
    slug text not null unique,
    kind text not null,
    name text not null,
    tagline text not null default '',
    about text not null default '',
    starts_at timestamptz not null,
    -- Null for a show that's over in an evening.
    ends_at timestamptz,
    organiser text not null default '',
    organiser_url text,
    watch_url text,
    -- One of the logos the site carries, by key; the app holds its file and
    -- its credit.
    logo text,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint events_kind check (kind in ('awards', 'showcase')),
    constraint events_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    constraint events_logo_format check (logo ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    constraint events_ends_after_start check (ends_at is null or ends_at > starts_at)
);

-- An awards night's own part: when picks close, and when the winners went out.
create table public.award_shows (
    event_id bigint primary key references public.events (id) on delete cascade,
    picks_close_at timestamptz not null,
    results_at timestamptz
);

create table public.award_categories (
    id bigint generated always as identity primary key,
    event_id bigint not null
        references public.award_shows (event_id) on delete cascade,
    slug text not null,
    name text not null,
    blurb text not null default '',
    -- A heading to group categories under: craft, genres, esports.
    section text not null default '',
    position int not null default 0,
    headline boolean not null default false,
    created_at timestamptz not null default now(),
    constraint award_categories_slug_format
        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    unique (event_id, slug)
);

create index award_categories_event_idx
    on public.award_categories (event_id, position);

-- A nominee is a game, or a name for the categories that honour a person or
-- a creator (with the game they're there for, where there is one).
create table public.award_nominees (
    id bigint generated always as identity primary key,
    category_id bigint not null
        references public.award_categories (id) on delete cascade,
    game_id bigint references public.games (id) on delete cascade,
    label text,
    detail text,
    position int not null default 0,
    won boolean not null default false,
    created_at timestamptz not null default now(),
    -- What a pick's foreign key points at, so it names its own category.
    unique (id, category_id),
    constraint award_nominees_named check (game_id is not null or label is not null)
);

create index award_nominees_category_idx
    on public.award_nominees (category_id, position);
create index award_nominees_game_idx on public.award_nominees (game_id);
-- The same game twice in one category is a typo.
create unique index award_nominees_one_game
    on public.award_nominees (category_id, game_id)
    where game_id is not null;

create table public.award_picks (
    user_id uuid not null references public.profiles (id) on delete cascade,
    category_id bigint not null
        references public.award_categories (id) on delete cascade,
    nominee_id bigint not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, category_id),
    -- A pick can only be one of its own category's nominees.
    foreign key (nominee_id, category_id)
        references public.award_nominees (id, category_id) on delete cascade
);

create index award_picks_nominee_idx on public.award_picks (nominee_id);

alter table public.events enable row level security;
alter table public.award_shows enable row level security;
alter table public.award_categories enable row level security;
alter table public.award_nominees enable row level security;
alter table public.award_picks enable row level security;
revoke all on public.events from anon, authenticated;
revoke all on public.award_shows from anon, authenticated;
revoke all on public.award_categories from anon, authenticated;
revoke all on public.award_nominees from anon, authenticated;
revoke all on public.award_picks from anon, authenticated;

-- How many picked each nominee at an awards night: the crowd's view, with
-- nobody in it named.
create function public.award_pick_counts(p_event bigint)
returns table (nominee_id bigint, picks int)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select p.nominee_id, count(*)::int
    from public.award_picks p
    join public.award_categories c on c.id = p.category_id
    where c.event_id = p_event
    group by p.nominee_id;
$$;

revoke execute on function public.award_pick_counts(bigint)
    from anon, authenticated, public;

-- A showcase's own part: the games it showed, in running order, and who's
-- hyped for each.
create table public.showcase_events (
    event_id bigint primary key references public.events (id) on delete cascade
);

create table public.showcase_reveals (
    id bigint generated always as identity primary key,
    event_id bigint not null
        references public.showcase_events (event_id) on delete cascade,
    game_id bigint references public.games (id) on delete cascade,
    -- For something shown before it has a page: "A new IP from Remedy".
    label text,
    tag text not null,
    position int not null default 0,
    created_at timestamptz not null default now(),
    constraint showcase_reveals_named check (game_id is not null or label is not null),
    constraint showcase_reveals_tag check (
        tag in ('premiere', 'trailer', 'gameplay', 'date', 'shadow-drop', 'remake')
    )
);

create index showcase_reveals_event_idx
    on public.showcase_reveals (event_id, position);
create index showcase_reveals_game_idx on public.showcase_reveals (game_id);

create table public.showcase_hype (
    user_id uuid not null references public.profiles (id) on delete cascade,
    reveal_id bigint not null
        references public.showcase_reveals (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, reveal_id)
);

create index showcase_hype_reveal_idx on public.showcase_hype (reveal_id);

-- Badges for taking part in an event, by a key its kind defines. Earned
-- only while the event is on, so each is a mark of having been there.
create table public.event_badges (
    user_id uuid not null references public.profiles (id) on delete cascade,
    event_id bigint not null references public.events (id) on delete cascade,
    badge text not null,
    earned_at timestamptz not null default now(),
    primary key (user_id, event_id, badge),
    constraint event_badges_key check (badge ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index event_badges_event_idx on public.event_badges (event_id, badge);

alter table public.showcase_events enable row level security;
alter table public.showcase_reveals enable row level security;
alter table public.showcase_hype enable row level security;
alter table public.event_badges enable row level security;
revoke all on public.showcase_events from anon, authenticated;
revoke all on public.showcase_reveals from anon, authenticated;
revoke all on public.showcase_hype from anon, authenticated;
revoke all on public.event_badges from anon, authenticated;

-- How many are hyped for each reveal, nobody named.
create function public.showcase_hype_counts(p_event bigint)
returns table (reveal_id bigint, hype int)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select h.reveal_id, count(*)::int
    from public.showcase_hype h
    join public.showcase_reveals r on r.id = h.reveal_id
    where r.event_id = p_event
    group by h.reveal_id;
$$;

revoke execute on function public.showcase_hype_counts(bigint)
    from anon, authenticated, public;

-- How many have earned each of an event's badges.
create function public.event_badge_counts(p_event bigint)
returns table (badge text, earned int)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select b.badge, count(*)::int
    from public.event_badges b
    where b.event_id = p_event
    group by b.badge;
$$;

revoke execute on function public.event_badge_counts(bigint)
    from anon, authenticated, public;

-- An awards night's results badges, worked out again from its winners as
-- they're marked: "called-it" for the headline award's winner, "sharp-eye"
-- for half or more of the winners so far, from three up.
create function public.refresh_award_result_badges(p_event bigint)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_headline bigint;
    v_decided int;
begin
    delete from public.event_badges
    where event_id = p_event and badge in ('called-it', 'sharp-eye');

    select id into v_headline
    from public.award_categories
    where event_id = p_event
    order by headline desc, position, id
    limit 1;

    insert into public.event_badges (user_id, event_id, badge)
    select p.user_id, p_event, 'called-it'
    from public.award_picks p
    join public.award_nominees n on n.id = p.nominee_id
    where p.category_id = v_headline and n.won;

    select count(distinct c.id) into v_decided
    from public.award_categories c
    join public.award_nominees n on n.category_id = c.id
    where c.event_id = p_event and n.won;

    if v_decided >= 3 then
        insert into public.event_badges (user_id, event_id, badge)
        select p.user_id, p_event, 'sharp-eye'
        from public.award_picks p
        join public.award_categories c on c.id = p.category_id
        join public.award_nominees n on n.id = p.nominee_id
        where c.event_id = p_event
        group by p.user_id
        having count(*) filter (where n.won) * 2 >= v_decided;
    end if;
end;
$$;

revoke execute on function public.refresh_award_result_badges(bigint)
    from anon, authenticated, public;
