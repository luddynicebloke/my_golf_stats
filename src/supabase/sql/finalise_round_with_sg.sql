create or replace function public.finalise_round_with_sg(p_round_id bigint)
returns table (
  round_id bigint,
  updated_shot_count integer,
  round_finalised boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_category_id integer;
  v_round_id bigint;
  v_updated_shot_count integer;
  v_round_finalised boolean;
begin
  select r.user_id
  into v_user_id
  from rounds r
  where r.id = p_round_id;

  if v_user_id is null then
    raise exception 'Failed to load round user for round %.', p_round_id;
  end if;

  select up.category_id
  into v_category_id
  from user_profiles up
  where up.id = v_user_id;

  if v_category_id is null then
    raise exception 'Player category is required for strokes gained.';
  end if;

  if not exists (
    select 1
    from round_holes rh
    join shots s on s.round_hole_id = rh.id
    where rh.round_id = p_round_id
  ) then
    update rounds
    set is_finalised = true
    where id = p_round_id;

    return query
    select p_round_id, 0, true;
    return;
  end if;

  with ordered_shots as (
    select
      s.id,
      s.round_hole_id,
      s.shot_number,
      s.distance_to_pin,
      s.lie_type,
      coalesce(s.penalty_strokes, 0) as penalty_strokes,
      lead(s.distance_to_pin) over (
        partition by s.round_hole_id
        order by s.shot_number
      ) as next_distance_to_pin,
      lead(s.lie_type) over (
        partition by s.round_hole_id
        order by s.shot_number
      ) as next_lie_type
    from shots s
    join round_holes rh on rh.id = s.round_hole_id
    where rh.round_id = p_round_id
  ),
  lookup_values as (
    select
      os.*,
      case
        when lower(trim(os.lie_type)) = 'green' then os.distance_to_pin
        when lower(trim(os.lie_type)) = 'tee' then greatest(os.distance_to_pin * 1.09361, 150)
        when lower(trim(os.lie_type)) = 'fairway' then least(os.distance_to_pin * 1.09361, 400)
        else os.distance_to_pin * 1.09361
      end as start_lookup_distance,
      case
        when os.next_distance_to_pin is null then null
        when lower(trim(os.next_lie_type)) = 'green' then os.next_distance_to_pin
        when lower(trim(os.next_lie_type)) = 'tee' then greatest(os.next_distance_to_pin * 1.09361, 150)
        when lower(trim(os.next_lie_type)) = 'fairway' then least(os.next_distance_to_pin * 1.09361, 400)
        else os.next_distance_to_pin * 1.09361
      end as end_lookup_distance
    from ordered_shots os
  ),
  expectation_matches as (
    select
      lv.id,
      start_exp.expected_strokes as start_expected_strokes,
      coalesce(end_exp.expected_strokes, 0) as end_expected_strokes
    from lookup_values lv
    join sg_expectation_yds start_exp
      on start_exp.category_id = v_category_id
     and start_exp.lie_type = lv.lie_type
     and lv.start_lookup_distance >= start_exp.min_distance
     and lv.start_lookup_distance <= start_exp.max_distance
    left join sg_expectation_yds end_exp
      on lv.next_distance_to_pin is not null
     and end_exp.category_id = v_category_id
     and end_exp.lie_type = lv.next_lie_type
     and lv.end_lookup_distance >= end_exp.min_distance
     and lv.end_lookup_distance <= end_exp.max_distance
  ),
  updated_shots as (
    update shots s
    set sg_value = round(
      (
        em.start_expected_strokes -
        (1 + coalesce(s.penalty_strokes, 0) + em.end_expected_strokes)
      )::numeric,
      3
    )
    from expectation_matches em
    where s.id = em.id
    returning s.id
  ),
  finalised_round as (
    update rounds
    set is_finalised = true
    where id = p_round_id
    returning id, is_finalised
  )
  select
    fr.id,
    (select count(*)::integer from updated_shots),
    fr.is_finalised
  into v_round_id, v_updated_shot_count, v_round_finalised
  from finalised_round fr;

  if v_round_id is null then
    raise exception 'Failed to finalise round %.', p_round_id;
  end if;

  round_id := v_round_id;
  updated_shot_count := v_updated_shot_count;
  round_finalised := v_round_finalised;

  return next;
end;
$$;
