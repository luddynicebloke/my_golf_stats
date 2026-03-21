import { BallLie } from "../lib/scoreEntryTypes";

type Player_Category =
  | "Pro M"
  | "Pro F"
  | "Am M"
  | "Am F"
  | "Senior M"
  | " Senior F";

type ShotRow = {
  id: number;
  round_hole_id: number;
  shot_number: number;
  distance_to_pin: number;
  lie_type: BallLie;
  penalty_strokes: number;
  recover: boolean;
  sg_value: number;
};

type SGExpectationRow = {
  id: number;
  min_distance: number;
  max_distance: number;
  expected_strokes: number;
  lie_type: BallLie;
  category: Player_Category;
};

function getExpectedStrokes(
  expectations: SGExpectationRow[],
  distanceToPin: number,
  lieType: BallLie,
  category?: string,
): number {
  const match = expectations.find((row) => {
    const distanceMatch =
      distanceToPin >= row.min_distance && distanceToPin <= row.max_distance;

    const lieMatch = row.lie_type === lieType;

    const categoryMatch =
      category == null || row.category == null || row.category === category;

    return distanceMatch && lieMatch && categoryMatch;
  });

  if (!match) {
    throw new Error(
      `No SG expectation found for distance=${distanceToPin}, lie=${lieType}, category=${category ?? "default"}`,
    );
  }

  return match.expected_strokes;
}

function calculateHoleSG(
  shots: ShotRow[],
  expectations: SGExpectationRow[],
  category?: string,
): ShotRow[] {
  const sortedShots = [...shots].sort((a, b) => a.shot_number - b.shot_number);

  return sortedShots.map((shot, index) => {
    const nextShot = sortedShots[index + 1];

    const startExpectation = getExpectedStrokes(
      expectations,
      shot.distance_to_pin,
      shot.lie_type,
      category,
    );

    const endExpectation = nextShot
      ? getExpectedStrokes(
          expectations,
          nextShot.distance_to_pin,
          nextShot.lie_type,
          category,
        )
      : 0;

    const sgValue =
      startExpectation - (1 + shot.penalty_strokes + endExpectation);

    return {
      ...shot,
      sg_value: Number(sgValue.toFixed(3)),
    };
  });
}
