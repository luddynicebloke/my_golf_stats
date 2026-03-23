import { supabase } from "../supabase/client";
import type { BallLie } from "../lib/scoreEntryTypes";

type ShotRow = {
  id: number;
  round_hole_id: number;
  shot_number: number;
  distance_to_pin: number;
  lie_type: BallLie;
  penalty_strokes: number | null;
  sg_value: number | null;
};

type SGExpectationRow = {
  id: number;
  min_distance: number;
  max_distance: number;
  expected_strokes: number;
  lie_type: BallLie;
  category: number | null;
};

type NormalizedExpectationRow = {
  id: number;
  min_distance: number;
  max_distance: number;
  expected_strokes: number;
  lie_type: BallLie;
  categoryId: number | null;
};

const METRES_TO_YARDS = 1.09361;
const SG_PAGE_SIZE = 1000;

const normalizeLieType = (lieType: string): BallLie => {
  const normalized = lieType.trim().toLowerCase();

  switch (normalized) {
    case "tee":
      return "Tee";
    case "fairway":
      return "Fairway";
    case "rough":
      return "Rough";
    case "bunker":
      return "Bunker";
    case "green":
      return "Green";
    default:
      throw new Error(`Unsupported lie_type value: ${lieType}`);
  }
};

const getLookupDistance = (shot: Pick<ShotRow, "distance_to_pin" | "lie_type">) =>
  shot.lie_type === "Green"
    ? shot.distance_to_pin
    : shot.distance_to_pin * METRES_TO_YARDS;

const getExpectedStrokes = (
  expectations: NormalizedExpectationRow[],
  shot: Pick<ShotRow, "distance_to_pin" | "lie_type">,
  categoryId: number,
): number => {
  const lookupDistance = getLookupDistance(shot);
  const match = expectations.find((row) => {
    const distanceMatch =
      lookupDistance >= row.min_distance && lookupDistance <= row.max_distance;
    const lieMatch = row.lie_type === normalizeLieType(shot.lie_type);
    const categoryMatch = row.categoryId === categoryId;

    return distanceMatch && lieMatch && categoryMatch;
  });

  if (!match) {
    const bandMatches = expectations.filter((row) => {
      const distanceMatch =
        lookupDistance >= row.min_distance && lookupDistance <= row.max_distance;
      const lieMatch = row.lie_type === normalizeLieType(shot.lie_type);

      return distanceMatch && lieMatch;
    });

    throw new Error(
      bandMatches.length === 0
        ? `No SG expectation found for distance=${lookupDistance.toFixed(2)}, lie=${shot.lie_type}, category=${categoryId}.`
        : `No SG expectation found for distance=${lookupDistance.toFixed(2)}, lie=${shot.lie_type}, category=${categoryId}. Available category ids for this band: ${bandMatches
            .map((row) => row.categoryId)
            .filter((value): value is number => value != null)
            .join(", ")}.`
    );
  }

  return match.expected_strokes;
};

const calculateHoleSG = (
  shots: ShotRow[],
  expectations: NormalizedExpectationRow[],
  categoryId: number,
): ShotRow[] => {
  const sortedShots = [...shots].sort((a, b) => a.shot_number - b.shot_number);

  return sortedShots.map((shot, index) => {
    const nextShot = sortedShots[index + 1];
    const startExpectation = getExpectedStrokes(
      expectations,
      shot,
      categoryId,
    );
    const endExpectation = nextShot
      ? getExpectedStrokes(expectations, nextShot, categoryId)
      : 0;

    return {
      ...shot,
      sg_value: Number(
        (
          startExpectation -
          (1 + (shot.penalty_strokes ?? 0) + endExpectation)
        ).toFixed(3),
      ),
    };
  });
};

export const calculateAndSaveRoundSG = async (
  roundId: number,
): Promise<void> => {
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("user_id")
    .eq("id", roundId)
    .single();

  if (roundError || !round?.user_id) {
    throw new Error(roundError?.message ?? "Failed to load round user.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("category_id")
    .eq("id", round.user_id)
    .single();

  if (profileError || profile?.category_id == null) {
    throw new Error(
      profileError?.message ?? "Player category is required for strokes gained.",
    );
  }

  const categoryId = Number(profile.category_id);

  const { data: roundHoles, error: roundHolesError } = await supabase
    .from("round_holes")
    .select("id")
    .eq("round_id", roundId);

  if (roundHolesError) {
    throw new Error(roundHolesError.message);
  }

  const roundHoleIds = (roundHoles ?? []).map((row) => Number(row.id));
  if (roundHoleIds.length === 0) {
    return;
  }

  const { data: shots, error: shotsError } = await supabase
    .from("shots")
    .select(
      "id, round_hole_id, shot_number, distance_to_pin, lie_type, penalty_strokes, sg_value",
    )
    .in("round_hole_id", roundHoleIds)
    .order("round_hole_id", { ascending: true })
    .order("shot_number", { ascending: true });

  if (shotsError) {
    throw new Error(shotsError.message);
  }

  const typedShots = ((shots ?? []) as ShotRow[]).map((shot) => ({
    ...shot,
    id: Number(shot.id),
    round_hole_id: Number(shot.round_hole_id),
    shot_number: Number(shot.shot_number),
    distance_to_pin: Number(shot.distance_to_pin),
    penalty_strokes:
      shot.penalty_strokes == null ? 0 : Number(shot.penalty_strokes),
    sg_value: shot.sg_value == null ? null : Number(shot.sg_value),
  }));

  if (typedShots.length === 0) {
    return;
  }

  const expectations: SGExpectationRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sg_expectation_yds")
      .select(
        "id, min_distance, max_distance, expected_strokes, lie_type, category",
      )
      .order("lie_type")
      .order("min_distance")
      .order("max_distance")
      .range(from, from + SG_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as SGExpectationRow[];
    expectations.push(...page);

    if (page.length < SG_PAGE_SIZE) {
      break;
    }

    from += SG_PAGE_SIZE;
  }

  const normalizedExpectations = expectations.map((row) => ({
      id: Number(row.id),
      min_distance: Number(row.min_distance),
      max_distance: Number(row.max_distance),
      expected_strokes: Number(row.expected_strokes),
      lie_type: normalizeLieType(row.lie_type),
      categoryId: row.category == null ? null : Number(row.category),
    }));

  const shotsByRoundHole = new Map<number, ShotRow[]>();
  for (const shot of typedShots) {
    const currentShots = shotsByRoundHole.get(shot.round_hole_id) ?? [];
    currentShots.push(shot);
    shotsByRoundHole.set(shot.round_hole_id, currentShots);
  }

  const updatedShots = Array.from(shotsByRoundHole.values()).flatMap((holeShots) =>
    calculateHoleSG(holeShots, normalizedExpectations, categoryId),
  );

  for (const shot of updatedShots) {
    const { data, error } = await supabase
      .from("shots")
      .update({ sg_value: shot.sg_value })
      .eq("id", shot.id)
      .select("id, sg_value")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error(`Failed to persist SG value for shot ${shot.id}.`);
    }
  }
};
