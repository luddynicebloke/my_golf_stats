create or replace function public.get_green_sg_stats(p_round_id bigint)
returns table (
  distance_range text,
  shots_in_group bigint,
  avg_sg_value numeric,
  total_sg_value numeric
)
language sql
security definer
set search_path = public
as $$
  select
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
    end as distance_range,
    count(*) as shots_in_group,
    round(avg(s.sg_value), 3) as avg_sg_value,
    round(sum(s.sg_value), 3) as total_sg_value
  from shots s
  join round_holes rh on s.round_hole_id = rh.id
  join rounds r on rh.round_id = r.id
  where r.id = p_round_id
    and r.user_id = auth.uid()
    and s.lie_type = 'Green'
  group by 1
  order by min(s.distance_to_pin);
$$;

grant execute on function public.get_green_sg_stats(bigint) to authenticated;
