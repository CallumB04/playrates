-- The library's total for a genre or platform. The slug copies on games
-- find a page fast, but counting through them reads every match's row for
-- the content flag, and Mac's fifteen thousand sit on ten thousand pages:
-- eight seconds cold. Joined through the link tables, the count reads
-- indexes alone. Built as text so each filter plans for its own values;
-- every value goes in quoted.

set search_path = pg_catalog, public;

create or replace function public.count_linked_games(
    p_genre text,
    p_platform text,
    p_include_sexual boolean,
    p_released_until date default null,
    p_released_after date default null
)
returns bigint
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
    n bigint;
begin
    execute format(
        'select count(*) from public.games g where true %s %s %s %s %s',
        case when p_include_sexual then ''
             else 'and not g.has_sexual_content' end,
        case when p_genre is null then ''
             else format('and exists (select 1 from public.game_genres x '
                         'where x.game_id = g.id and x.genre_slug = %L)', p_genre) end,
        case when p_platform is null then ''
             else format('and exists (select 1 from public.game_platforms p '
                         'where p.game_id = g.id and p.platform_slug = %L)', p_platform) end,
        case when p_released_until is null then ''
             else format('and g.release_date <= %L', p_released_until) end,
        case when p_released_after is null then ''
             else format('and g.release_date > %L', p_released_after) end
    ) into n;
    return n;
end;
$$;

revoke execute on function public.count_linked_games(text, text, boolean, date, date)
    from anon, authenticated, public;
