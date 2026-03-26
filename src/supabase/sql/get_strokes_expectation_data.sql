create or replace function public.get_strokes_expectation_data()
returns table (
  categories jsonb,
  strokes_gained jsonb
)
language sql
security invoker
set search_path = public
as $$
select
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'code', c.code,
          'name', c.name
        )
        order by c.id
      )
      from category c
    ),
    '[]'::jsonb
  ) as categories,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'min_distance', s.min_distance,
          'max_distance', s.max_distance,
          'expected_strokes', s.expected_strokes,
          'lie_type', s.lie_type,
          'category',
          case
            when c.id is null then null
            else jsonb_build_object(
              'id', c.id,
              'code', c.code,
              'name', c.name
            )
          end
        )
        order by s.lie_type, s.min_distance, s.max_distance, s.id
      )
      from sg_expectation_yds s
      left join category c on c.id = s.category_id
    ),
    '[]'::jsonb
  ) as strokes_gained;
$$;
