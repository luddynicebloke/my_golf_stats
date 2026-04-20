create or replace function public.get_dashboard_stats(p_user_id uuid)
returns table (
  round_count integer,
  average_score_to_par numeric,
  average_score numeric,
  average_strokes_gained numeric,
  latest_rounds jsonb,
  strokes_gained_by_category jsonb
)
language sql
security invoker
set search_path = public
as $$
with completed_rounds as (
  select
    r.id,
    r.round_date,
    c.name as course_name
  from rounds r
  left join courses c on c.id = r.course_id
  where r.user_id = p_user_id
    and r.is_finalised = true
),
round_scores as (
  select
    cr.id as round_id,
    coalesce(
      sum(rh.score) filter (where coalesce(rh.completed, false)),
      0
    ) as total_score,
    coalesce(
      sum(h.par) filter (where coalesce(rh.completed, false)),
      0
    ) as total_par
  from completed_rounds cr
  left join round_holes rh on rh.round_id = cr.id
  left join holes h on h.id = rh.hole_id
  group by cr.id
),
round_sg as (
  select
    cr.id as round_id,
    sum(s.sg_value) as total_sg
  from completed_rounds cr
  left join round_holes rh on rh.round_id = cr.id
  left join shots s on s.round_hole_id = rh.id
  where coalesce(rh.completed, false)
  group by cr.id
),
latest_rounds_base as (
  select
    cr.id,
    cr.round_date,
    cr.course_name,
    rs.total_score,
    rsg.total_sg
  from completed_rounds cr
  left join round_scores rs on rs.round_id = cr.id
  left join round_sg rsg on rsg.round_id = cr.id
  order by cr.round_date desc, cr.id desc
  limit 10
),
latest_round_shots as (
  select
    lrb.id as round_id,
    s.sg_value,
    case
      when lower(trim(s.lie_type)) = 'green' then 'putting'
      when s.shot_number = 1 and h.par in (4, 5) then 'offTheTee'
      when case
        when lower(trim(s.lie_type)) = 'green' then s.distance_to_pin
        when lower(trim(s.lie_type)) = 'tee' then greatest(s.distance_to_pin * 1.09361, 150)
        when lower(trim(s.lie_type)) = 'fairway' then least(s.distance_to_pin * 1.09361, 400)
        else s.distance_to_pin * 1.09361
      end <= 10 then 'aroundTheGreen'
      when case
        when lower(trim(s.lie_type)) = 'green' then s.distance_to_pin
        when lower(trim(s.lie_type)) = 'tee' then greatest(s.distance_to_pin * 1.09361, 150)
        when lower(trim(s.lie_type)) = 'fairway' then least(s.distance_to_pin * 1.09361, 400)
        else s.distance_to_pin * 1.09361
      end <= 30 then 'chipping'
      when case
        when lower(trim(s.lie_type)) = 'green' then s.distance_to_pin
        when lower(trim(s.lie_type)) = 'tee' then greatest(s.distance_to_pin * 1.09361, 150)
        when lower(trim(s.lie_type)) = 'fairway' then least(s.distance_to_pin * 1.09361, 400)
        else s.distance_to_pin * 1.09361
      end <= 60 then 'shortApproach'
      when case
        when lower(trim(s.lie_type)) = 'green' then s.distance_to_pin
        when lower(trim(s.lie_type)) = 'tee' then greatest(s.distance_to_pin * 1.09361, 150)
        when lower(trim(s.lie_type)) = 'fairway' then least(s.distance_to_pin * 1.09361, 400)
        else s.distance_to_pin * 1.09361
      end <= 90 then 'mediumApproach'
      when case
        when lower(trim(s.lie_type)) = 'green' then s.distance_to_pin
        when lower(trim(s.lie_type)) = 'tee' then greatest(s.distance_to_pin * 1.09361, 150)
        when lower(trim(s.lie_type)) = 'fairway' then least(s.distance_to_pin * 1.09361, 400)
        else s.distance_to_pin * 1.09361
      end <= 120 then 'longApproach'
      else 'approach'
    end as sg_category
  from latest_rounds_base lrb
  join round_holes rh on rh.round_id = lrb.id
  join holes h on h.id = rh.hole_id
  join shots s on s.round_hole_id = rh.id
  where s.sg_value is not null
    and coalesce(rh.completed, false)
),
sg_category_totals as (
  select
    sg_category,
    round(sum(sg_value)::numeric / nullif((select count(*) from latest_rounds_base), 0), 3) as average_sg
  from latest_round_shots
  group by sg_category
),
sg_category_defaults as (
  select *
  from (
    values
      ('offTheTee'::text),
      ('approach'::text),
      ('longApproach'::text),
      ('mediumApproach'::text),
      ('shortApproach'::text),
      ('chipping'::text),
      ('aroundTheGreen'::text),
      ('putting'::text)
  ) as categories(category)
)
select
  (select count(*)::integer from completed_rounds) as round_count,
  (
    select round(avg((rs.total_score - rs.total_par)::numeric), 2)
    from latest_rounds_base lrb
    join round_scores rs on rs.round_id = lrb.id
  ) as average_score_to_par,
  (
    select round(avg(lrb.total_score::numeric), 2)
    from latest_rounds_base lrb
  ) as average_score,
  (
    select round(avg(lrb.total_sg::numeric), 3)
    from latest_rounds_base lrb
    where lrb.total_sg is not null
  ) as average_strokes_gained,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'date', coalesce(to_char(lrb.round_date, 'YYYY-MM-DD'), ''),
          'course', coalesce(lrb.course_name, 'Unknown course'),
          'score', lrb.total_score,
          'strokesGained', round(lrb.total_sg::numeric, 3)
        )
        order by lrb.round_date desc, lrb.id desc
      )
      from latest_rounds_base lrb
    ),
    '[]'::jsonb
  ) as latest_rounds,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'category', scd.category,
          'score', coalesce(sct.average_sg, 0)
        )
        order by case scd.category
          when 'offTheTee' then 1
          when 'approach' then 2
          when 'longApproach' then 3
          when 'mediumApproach' then 4
          when 'shortApproach' then 5
          when 'chipping' then 6
          when 'aroundTheGreen' then 7
          when 'putting' then 8
          else 99
        end
      )
      from sg_category_defaults scd
      left join sg_category_totals sct on sct.sg_category = scd.category
    ),
    '[]'::jsonb
  ) as strokes_gained_by_category;
$$;
