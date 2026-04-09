create or replace function public.get_recent_sg_stats(
  p_shot_group text,
  p_round_limit integer default 10
)
returns table (
  distance_range text,
  shots_in_group bigint,
  avg_sg_value numeric,
  fairways_hit bigint,
  fairway_hit_percentage numeric
)
language sql
security definer
set search_path = public
as $$
  with recent_rounds as (
    select r.id
    from rounds r
    where r.user_id = auth.uid()
      and r.is_finalised = true
    order by r.round_date desc nulls last, r.id desc
    limit greatest(coalesce(p_round_limit, 10), 0)
  ),
  recent_shots as (
    select
      s.distance_to_pin,
      s.sg_value,
      s.lie_type,
      lead(s.lie_type) over (
        partition by s.round_hole_id
        order by s.shot_number
      ) as next_lie_type
    from shots s
    join round_holes rh on s.round_hole_id = rh.id
    join recent_rounds rr on rr.id = rh.round_id
    where s.sg_value is not null
      and s.distance_to_pin is not null
  )
  select
    case
      when lower(trim(p_shot_group)) = 'putting' then
        case
          when s.distance_to_pin >= 0 and s.distance_to_pin < 4 then '0 to 3'
          when s.distance_to_pin >= 4 and s.distance_to_pin < 8 then '4 to 7'
          when s.distance_to_pin >= 8 and s.distance_to_pin < 12 then '8 to 11'
          when s.distance_to_pin >= 12 and s.distance_to_pin < 16 then '12 to 15'
          when s.distance_to_pin >= 16 and s.distance_to_pin < 21 then '16 to 20'
          when s.distance_to_pin >= 21 and s.distance_to_pin < 31 then '21 to 30'
          when s.distance_to_pin >= 31 and s.distance_to_pin < 41 then '31 to 40'
          when s.distance_to_pin >= 41 and s.distance_to_pin < 51 then '41 to 50'
          when s.distance_to_pin >= 51 and s.distance_to_pin < 61 then '51 to 60'
          when s.distance_to_pin >= 61 and s.distance_to_pin < 75 then '61 to 74'
          when s.distance_to_pin >= 75 and s.distance_to_pin < 120 then '75 to 119'
          else '120+'
        end
      when lower(trim(p_shot_group)) = 'driving' then
        'Driving'
      when lower(trim(p_shot_group)) = 'chipping' then
        case
          when s.distance_to_pin >= 0 and s.distance_to_pin <= 10 then '1 to 10'
          when s.distance_to_pin >= 11 and s.distance_to_pin <= 20 then '11 to 20'
          when s.distance_to_pin >= 21 and s.distance_to_pin <= 30 then '21 to 30'
          else '31+'
        end
      else
        case
          when s.distance_to_pin >= 31 and s.distance_to_pin <= 60 then '31 to 60'
          when s.distance_to_pin >= 61 and s.distance_to_pin <= 90 then '61 to 90'
          when s.distance_to_pin >= 91 and s.distance_to_pin <= 120 then '91 to 120'
          when s.distance_to_pin >= 121 and s.distance_to_pin <= 150 then '121 to 150'
          when s.distance_to_pin >= 151 and s.distance_to_pin <= 200 then '151 to 200'
          else '201+'
        end
    end as distance_range,
    count(*) as shots_in_group,
    round(avg(s.sg_value), 3) as avg_sg_value,
    case
      when lower(trim(p_shot_group)) = 'driving' then
        count(*) filter (
          where lower(trim(coalesce(s.next_lie_type, ''))) = 'fairway'
        )
      else null
    end as fairways_hit,
    case
      when lower(trim(p_shot_group)) = 'driving' then
        round(
          (
            count(*) filter (
              where lower(trim(coalesce(s.next_lie_type, ''))) = 'fairway'
            )::numeric
            / nullif(count(*), 0)
          ) * 100,
          1
        )
      else null
    end as fairway_hit_percentage
  from recent_shots s
  where (
      (lower(trim(p_shot_group)) = 'putting' and lower(trim(s.lie_type)) = 'green')
      or
      (lower(trim(p_shot_group)) = 'driving' and lower(trim(s.lie_type)) = 'tee')
      or
      (
        lower(trim(p_shot_group)) = 'chipping'
        and lower(trim(s.lie_type)) not in ('green', 'tee')
        and s.distance_to_pin >= 0
        and s.distance_to_pin <= 30
      )
      or
      (
        lower(trim(p_shot_group)) = 'approach'
        and lower(trim(s.lie_type)) not in ('green', 'tee')
        and s.distance_to_pin > 30
      )
    )
  group by 1
  order by min(s.distance_to_pin);
$$;

grant execute on function public.get_recent_sg_stats(text, integer) to authenticated;
