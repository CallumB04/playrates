-- Upvoting your own review is refused now, by the service. Votes already cast
-- on the voter's own review are removed rather than grandfathered: a count
-- that includes the author's own vote says less than the number suggests.
delete from public.review_votes v
using public.reviews r
where v.review_id = r.id
  and v.user_id = r.user_id;
