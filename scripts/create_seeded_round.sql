-- Create a fresh seeded round for testing score entry.
-- Update v_user_id before running.
-- Defaults:
--   course_id = 13
--   tee_id = 16
--   filled holes = 17

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000000';
  v_round_date date := current_date;
  v_course_id integer := 13;
  v_tee_id integer := 16;
  v_holes_to_fill integer := 17;

  v_round_id bigint;
  v_filled_holes text;
  v_untouched_holes text;
begin
  create temporary table tmp_seed_holes on commit drop as
  select
    h.id as hole_id,
    h.hole_number,
    h.par,
    ht.yardage as distance_metres,
    row_number() over (order by h.hole_number) as hole_index
  from holes h
  join hole_tee ht
    on ht.hole_id = h.id
   and ht.tee_id = v_tee_id
  where h.course_id = v_course_id
  order by h.hole_number;

  if not exists (select 1 from tmp_seed_holes) then
    raise exception 'No holes found for course_id % and tee_id %', v_course_id, v_tee_id;
  end if;

  insert into rounds (user_id, course_id, tee_id, round_date, is_finalised)
  values (v_user_id, v_course_id, v_tee_id, v_round_date, false)
  returning id into v_round_id;

  create temporary table tmp_round_holes on commit drop as
  with inserted as (
    insert into round_holes (round_id, hole_id, score, completed)
    select v_round_id, hole_id, 0, false
    from tmp_seed_holes
    order by hole_number
    returning id, hole_id
  )
  select
    i.id as round_hole_id,
    h.hole_id,
    h.hole_number,
    h.par,
    h.distance_metres,
    h.hole_index
  from inserted i
  join tmp_seed_holes h on h.hole_id = i.hole_id;

  insert into shots (
    round_hole_id,
    shot_number,
    distance_to_pin,
    lie_type,
    penalty_strokes,
    holed_out
  )
  select
    rh.round_hole_id,
    s.shot_number,
    s.distance_to_pin,
    s.lie_type,
    s.penalty_strokes,
    s.holed_out
  from tmp_round_holes rh
  cross join lateral (
    select *
    from (
      values
        (
          1,
          case
            when rh.par = 3 then greatest(50, round(rh.distance_metres)::int)
            else greatest(120, round(rh.distance_metres)::int)
          end,
          case
            when rh.par = 3 then 'Fairway'::text
            else 'Tee'::text
          end,
          0,
          false
        ),
        (
          2,
          case
            when rh.par = 3 then 18
            when rh.par = 5 then greatest(120, round(rh.distance_metres * 0.45)::int)
            else greatest(35, round(rh.distance_metres * 0.28)::int)
          end,
          case
            when rh.par = 3 then 'Green'
            else 'Fairway'
          end,
          0,
          false
        ),
        (
          3,
          case
            when rh.par = 3 then 4
            when rh.par = 5 then greatest(20, round(rh.distance_metres * 0.12)::int)
            else 16
          end,
          case
            when rh.par = 5 then 'Fairway'
            else 'Green'
          end,
          0,
          case when rh.par = 3 then true else false end
        ),
        (
          4,
          case
            when rh.par = 5 then 14
            else 3
          end,
          'Green',
          0,
          case when rh.par = 4 then true else false end
        ),
        (
          5,
          2,
          'Green',
          0,
          true
        )
    ) as seed(shot_number, distance_to_pin, lie_type, penalty_strokes, holed_out)
    where
      (rh.par = 3 and seed.shot_number <= 3) or
      (rh.par = 4 and seed.shot_number <= 4) or
      (rh.par = 5 and seed.shot_number <= 5)
  ) s
  where rh.hole_index <= v_holes_to_fill;

  update round_holes rh
  set
    score = src.par,
    completed = true
  from (
    select round_hole_id, par
    from tmp_round_holes
    where hole_index <= v_holes_to_fill
  ) src
  where rh.id = src.round_hole_id;

  select string_agg(hole_number::text, ', ' order by hole_number)
  into v_filled_holes
  from tmp_round_holes
  where hole_index <= v_holes_to_fill;

  select string_agg(hole_number::text, ', ' order by hole_number)
  into v_untouched_holes
  from tmp_round_holes
  where hole_index > v_holes_to_fill;

  raise notice 'Created seeded round %', v_round_id;
  raise notice 'Open: /scorecard-entry/%', v_round_id;
  raise notice 'Filled holes: %', coalesce(v_filled_holes, '(none)');
  raise notice 'Untouched holes: %', coalesce(v_untouched_holes, '(none)');
end $$;
