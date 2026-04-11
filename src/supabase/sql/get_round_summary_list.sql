create or replace function public.get_round_summary_list(
  p_user_id uuid,
  p_limit integer,
  p_offset integer,
  p_recent_limit integer default 30
)
returns table (
  id bigint,
  played_date date,
  course text,
  tee text,
  finished boolean,
  part_finalised boolean,
  holes_played integer,
  score bigint,
  sg_total numeric
)
language sql
security invoker
set search_path = public
as $$
with ordered_rounds as (
  select
    r.id,
    r.round_date,
    r.is_finalised,
    coalesce(r.part_finalised, false) as part_finalised,
    c.name as course_name,
    t.color as tee_color
  from rounds r
  left join courses c on c.id = r.course_id
  left join tees t on t.id = r.tee_id
  where r.user_id = p_user_id
  order by r.round_date desc nulls last, r.id desc
),
user_rounds as (
  select *
  from ordered_rounds
  limit greatest(coalesce(p_recent_limit, 30), 0)
  offset 0
),
paged_rounds as (
  select *
  from user_rounds
  limit greatest(coalesce(p_limit, 0), 0)
  offset greatest(coalesce(p_offset, 0), 0)
),
round_scores as (
  select
    rh.round_id,
    sum(case when coalesce(rh.completed, false) then rh.score else 0 end) as total_score,
    count(*) filter (where coalesce(rh.completed, false))::integer as holes_played
  from round_holes rh
  join paged_rounds ur on ur.id = rh.round_id
  group by rh.round_id
),
round_sg as (
  select
    rh.round_id,
    round(sum(s.sg_value)::numeric, 3) as total_sg
  from round_holes rh
  join paged_rounds ur on ur.id = rh.round_id
  join shots s on s.round_hole_id = rh.id
  where s.sg_value is not null
  group by rh.round_id
)
select
  ur.id,
  ur.round_date as played_date,
  coalesce(ur.course_name, 'Unknown course') as course,
  coalesce(ur.tee_color, 'Unknown tee') as tee,
  coalesce(ur.is_finalised, false) as finished,
  coalesce(ur.part_finalised, false) as part_finalised,
  coalesce(rs.holes_played, 0) as holes_played,
  rs.total_score as score,
  rsg.total_sg as sg_total
from paged_rounds ur
left join round_scores rs on rs.round_id = ur.id
left join round_sg rsg on rsg.round_id = ur.id
order by ur.round_date desc nulls last, ur.id desc;
$$;
