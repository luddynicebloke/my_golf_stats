import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Run with --env-file=.env.",
  );
  process.exit(1);
}

const roundIdArg = process.argv[2];
const holesToFillArg = process.argv[3];

if (!roundIdArg) {
  console.error(
    "Usage: node --env-file=.env scripts/fill-round.mjs <roundId> [holesToFill]",
  );
  process.exit(1);
}

const roundId = Number(roundIdArg);
const holesToFill = holesToFillArg == null ? 17 : Number(holesToFillArg);

if (!Number.isInteger(roundId) || roundId <= 0) {
  console.error("roundId must be a positive integer.");
  process.exit(1);
}

if (!Number.isInteger(holesToFill) || holesToFill <= 0) {
  console.error("holesToFill must be a positive integer.");
  process.exit(1);
}

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

const main = async () => {
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("id, tee_id")
    .eq("id", roundId)
    .single();

  if (roundError || !round) {
    throw new Error(roundError?.message ?? `Round ${roundId} not found.`);
  }

  const { data: roundHoleRows, error: roundHoleError } = await supabase
    .from("round_holes")
    .select("id, hole_id, holes(hole_number, par)")
    .eq("round_id", roundId)
    .order("id", { ascending: true });

  if (roundHoleError) {
    throw new Error(roundHoleError.message);
  }

  const normalizedRoundHoles = (roundHoleRows ?? [])
    .map((row) => {
      const hole = Array.isArray(row.holes) ? row.holes[0] : row.holes;
      if (!hole) {
        return null;
      }

      return {
        roundHoleId: Number(row.id),
        holeId: Number(row.hole_id),
        holeNumber: Number(hole.hole_number),
        par: Number(hole.par),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.holeNumber - b.holeNumber);

  if (normalizedRoundHoles.length === 0) {
    throw new Error(`Round ${roundId} has no round_holes rows.`);
  }

  const targetHoles = normalizedRoundHoles.slice(
    0,
    Math.min(holesToFill, normalizedRoundHoles.length),
  );
  const untouchedHoles = normalizedRoundHoles.slice(targetHoles.length);
  const holeIds = targetHoles.map((hole) => hole.holeId);

  const { data: holeTeeRows, error: holeTeeError } = await supabase
    .from("hole_tee")
    .select("hole_id, yardage")
    .eq("tee_id", Number(round.tee_id))
    .in("hole_id", holeIds);

  if (holeTeeError) {
    throw new Error(holeTeeError.message);
  }

  const distanceByHoleId = new Map(
    (holeTeeRows ?? []).map((row) => [Number(row.hole_id), Number(row.yardage)]),
  );

  const roundHoleIds = targetHoles.map((hole) => hole.roundHoleId);

  const { error: deleteShotsError } = await supabase
    .from("shots")
    .delete()
    .in("round_hole_id", roundHoleIds);

  if (deleteShotsError) {
    throw new Error(deleteShotsError.message);
  }

  const shotRows = targetHoles.flatMap((hole) => {
    const distanceMetres = distanceByHoleId.get(hole.holeId);
    if (distanceMetres == null) {
      throw new Error(`No hole_tee distance found for hole ${hole.holeNumber}.`);
    }

    return buildShotsForHole(hole.roundHoleId, hole.par, distanceMetres);
  });

  const { error: insertShotsError } = await supabase
    .from("shots")
    .insert(shotRows);

  if (insertShotsError) {
    throw new Error(insertShotsError.message);
  }

  const updates = targetHoles.map((hole) => {
    const score = hole.par;

    return supabase
      .from("round_holes")
      .update({
        score,
        completed: true,
      })
      .eq("id", hole.roundHoleId);
  });

  const updateResults = await Promise.all(updates);
  const updateError = updateResults.find((result) => result.error);
  if (updateError?.error) {
    throw new Error(updateError.error.message);
  }

  console.log(
    `Filled ${targetHoles.length} holes for round ${roundId}. Left ${
      normalizedRoundHoles.length - targetHoles.length
    } hole(s) untouched.`,
  );
  console.log(
    `Filled holes: ${targetHoles.map((hole) => hole.holeNumber).join(", ")}`,
  );

  if (untouchedHoles.length > 0) {
    console.log(
      `Untouched holes: ${untouchedHoles
        .map((hole) => hole.holeNumber)
        .join(", ")}`,
    );
    console.log(`Next hole to enter manually: ${untouchedHoles[0].holeNumber}`);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
