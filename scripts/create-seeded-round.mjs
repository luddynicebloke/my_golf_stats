/*
creates a brand new round for course_id 13 and tee_id 16, creates all round_holes, 
fills 17 holes with sample shots, and leaves the last hole open.

Run it like this:

node --env-file=.env scripts/create-seeded-round.mjs <userId>
Optional args:

node --env-file=.env scripts/create-seeded-round.mjs <userId> 2026-03-23 17
It prints:

the new round id
the filled holes
the untouched hole
the route to open, like /scorecard-entry/123

*/

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Run with --env-file=.env.",
  );
  process.exit(1);
}

const userId = process.argv[2];
const roundDate = process.argv[3] ?? new Date().toISOString().slice(0, 10);
const holesToFillArg = process.argv[4];
const holesToFill = holesToFillArg == null ? 17 : Number(holesToFillArg);

if (!userId) {
  console.error(
    "Usage: node --env-file=.env scripts/create-seeded-round.mjs <userId> [roundDate:YYYY-MM-DD] [holesToFill]",
  );
  process.exit(1);
}

if (!Number.isInteger(holesToFill) || holesToFill <= 0) {
  console.error("holesToFill must be a positive integer.");
  process.exit(1);
}

const COURSE_ID = 13;
const TEE_ID = 16;

const supabase = createClient(supabaseUrl, supabaseKey);

const getTeeShotDistance = (distanceMetres, par) => {
  if (par === 3) {
    return Math.max(50, Math.round(distanceMetres));
  }

  return Math.max(120, Math.round(distanceMetres));
};

const buildParThreeShots = (roundHoleId, distanceMetres) => [
  {
    round_hole_id: roundHoleId,
    shot_number: 1,
    distance_to_pin: Math.max(50, Math.round(distanceMetres)),
    lie_type: "Fairway",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 2,
    distance_to_pin: 18,
    lie_type: "Green",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 3,
    distance_to_pin: 4,
    lie_type: "Green",
    penalty_strokes: 0,
    holed_out: true,
  },
];

const buildParFourShots = (roundHoleId, distanceMetres) => [
  {
    round_hole_id: roundHoleId,
    shot_number: 1,
    distance_to_pin: getTeeShotDistance(distanceMetres, 4),
    lie_type: "Tee",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 2,
    distance_to_pin: Math.max(35, Math.round(distanceMetres * 0.28)),
    lie_type: "Fairway",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 3,
    distance_to_pin: 16,
    lie_type: "Green",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 4,
    distance_to_pin: 3,
    lie_type: "Green",
    penalty_strokes: 0,
    holed_out: true,
  },
];

const buildParFiveShots = (roundHoleId, distanceMetres) => [
  {
    round_hole_id: roundHoleId,
    shot_number: 1,
    distance_to_pin: getTeeShotDistance(distanceMetres, 5),
    lie_type: "Tee",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 2,
    distance_to_pin: Math.max(120, Math.round(distanceMetres * 0.45)),
    lie_type: "Fairway",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 3,
    distance_to_pin: Math.max(20, Math.round(distanceMetres * 0.12)),
    lie_type: "Fairway",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 4,
    distance_to_pin: 14,
    lie_type: "Green",
    penalty_strokes: 0,
    holed_out: false,
  },
  {
    round_hole_id: roundHoleId,
    shot_number: 5,
    distance_to_pin: 2,
    lie_type: "Green",
    penalty_strokes: 0,
    holed_out: true,
  },
];

const buildShotsForHole = (roundHoleId, par, distanceMetres) => {
  if (par === 3) {
    return buildParThreeShots(roundHoleId, distanceMetres);
  }

  if (par === 5) {
    return buildParFiveShots(roundHoleId, distanceMetres);
  }

  return buildParFourShots(roundHoleId, distanceMetres);
};

const toSlash = (isoDate) => isoDate.replaceAll("-", "/");

const main = async () => {
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      user_id: userId,
      course_id: COURSE_ID,
      tee_id: TEE_ID,
      round_date: toSlash(roundDate),
      is_finalised: false,
    })
    .select("id")
    .single();

  if (roundError || !round?.id) {
    throw new Error(roundError?.message ?? "Failed to create round.");
  }

  const roundId = Number(round.id);

  try {
    const { data: holes, error: holesError } = await supabase
      .from("holes")
      .select("id, hole_number, par")
      .eq("course_id", COURSE_ID)
      .order("hole_number");

    if (holesError || !holes?.length) {
      throw new Error(holesError?.message ?? "No holes found for course 13.");
    }

    const roundHoleRows = holes.map((hole) => ({
      round_id: roundId,
      hole_id: hole.id,
      score: 0,
      completed: false,
    }));

    const { data: insertedRoundHoles, error: roundHolesError } = await supabase
      .from("round_holes")
      .insert(roundHoleRows)
      .select("id, hole_id");

    if (roundHolesError || !insertedRoundHoles?.length) {
      throw new Error(
        roundHolesError?.message ?? "Failed to create round_holes rows.",
      );
    }

    const { data: holeTeeRows, error: holeTeeError } = await supabase
      .from("hole_tee")
      .select("hole_id, yardage")
      .eq("tee_id", TEE_ID)
      .in(
        "hole_id",
        holes.map((hole) => hole.id),
      );

    if (holeTeeError) {
      throw new Error(holeTeeError.message);
    }

    const distanceByHoleId = new Map(
      (holeTeeRows ?? []).map((row) => [
        Number(row.hole_id),
        Number(row.yardage),
      ]),
    );
    const roundHoleIdByHoleId = new Map(
      insertedRoundHoles.map((row) => [Number(row.hole_id), Number(row.id)]),
    );

    const targetHoles = holes
      .map((hole) => ({
        holeId: Number(hole.id),
        holeNumber: Number(hole.hole_number),
        par: Number(hole.par),
      }))
      .slice(0, Math.min(holesToFill, holes.length));
    const untouchedHoles = holes
      .map((hole) => Number(hole.hole_number))
      .slice(targetHoles.length);

    const shotRows = targetHoles.flatMap((hole) => {
      const roundHoleId = roundHoleIdByHoleId.get(hole.holeId);
      const distanceMetres = distanceByHoleId.get(hole.holeId);

      if (!roundHoleId) {
        throw new Error(`Missing round_hole for hole ${hole.holeNumber}.`);
      }

      if (distanceMetres == null) {
        throw new Error(`Missing tee distance for hole ${hole.holeNumber}.`);
      }

      return buildShotsForHole(roundHoleId, hole.par, distanceMetres);
    });

    const { error: insertShotsError } = await supabase
      .from("shots")
      .insert(shotRows);

    if (insertShotsError) {
      throw new Error(insertShotsError.message);
    }

    const updateResults = await Promise.all(
      targetHoles.map((hole) =>
        supabase
          .from("round_holes")
          .update({
            score: hole.par,
            completed: true,
          })
          .eq("id", roundHoleIdByHoleId.get(hole.holeId)),
      ),
    );

    const updateError = updateResults.find((result) => result.error);
    if (updateError?.error) {
      throw new Error(updateError.error.message);
    }

    console.log(`Created seeded round ${roundId} for user ${userId}.`);
    console.log(`Course: ${COURSE_ID} | Tee: ${TEE_ID} | Date: ${roundDate}`);
    console.log(
      `Filled holes: ${targetHoles.map((hole) => hole.holeNumber).join(", ")}`,
    );
    console.log(`Untouched holes: ${untouchedHoles.join(", ")}`);
    if (untouchedHoles.length > 0) {
      console.log(`Next hole to enter manually: ${untouchedHoles[0]}`);
    }
    console.log(`Open: /scorecard-entry/${roundId}`);
  } catch (error) {
    await supabase.from("round_holes").delete().eq("round_id", roundId);
    await supabase.from("rounds").delete().eq("id", roundId);
    throw error;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
