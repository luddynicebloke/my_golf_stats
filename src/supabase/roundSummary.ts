import {
  type DistanceUnit,
} from "../lib/distance";
import { supabase } from "./client";

type HoleRow = {
  id: number;
  holes:
    | {
        par: number | null;
        hole_number: number;
      }
    | {
        par: number | null;
        hole_number: number;
      }[]
    | null;
};

type ShotRow = {
  round_hole_id: number;
  shot_number: number;
  distance_to_pin: number;
  holed_out: boolean | null;
  lie_type: string;
  sg_value: number | null;
};

type HoleSummary = {
  holeNumber: number;
  par: number | null;
};

type CategoryStats = {
  count: number;
  sum: number;
};

const METRES_TO_YARDS = 1.09361;

export type RoundSgSummary = {
  approachTotal: number | null;
  fairwaysHitFromTee: number;
  greenHoledOutDistanceFeet: number;
  greensInRegulation: number;
  offTeeTotal: number | null;
  putts: number;
  puttingTotal: number | null;
  shortGameTotal: number | null;
  totalSg: number | null;
};

const getSingleRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const createCategoryStats = (): CategoryStats => ({
  count: 0,
  sum: 0,
});

const totalFromStats = (stats: CategoryStats): number | null =>
  stats.count === 0 ? null : stats.sum;

const normalizeLieType = (lieType: string) => lieType.trim().toLowerCase();

const getGirThreshold = (par: number | null) => {
  if (par === 3) return 1;
  if (par === 4) return 2;
  if (par === 5) return 3;
  return null;
};

export const fetchRoundSgSummary = async (
  roundId: number,
  _distanceUnit: DistanceUnit,
): Promise<RoundSgSummary> => {
  const { data: holeRows, error: holesError } = await supabase
    .from("round_holes")
    .select("id, holes(hole_number, par)")
    .eq("round_id", roundId)
    .order("id", { ascending: true });

  if (holesError) {
    throw new Error(holesError.message);
  }

  const holesByRoundHoleId = new Map<number, HoleSummary>();

  for (const row of (holeRows ?? []) as HoleRow[]) {
    const hole = getSingleRelation(row.holes);

    if (!hole) {
      continue;
    }

    holesByRoundHoleId.set(Number(row.id), {
      holeNumber: Number(hole.hole_number),
      par: hole.par == null ? null : Number(hole.par),
    });
  }

  const roundHoleIds = Array.from(holesByRoundHoleId.keys());

  if (roundHoleIds.length === 0) {
    return {
      approachTotal: null,
      fairwaysHitFromTee: 0,
      greenHoledOutDistanceFeet: 0,
      greensInRegulation: 0,
      offTeeTotal: null,
      putts: 0,
      puttingTotal: null,
      shortGameTotal: null,
      totalSg: null,
    };
  }

  const { data: shotRows, error: shotsError } = await supabase
    .from("shots")
    .select(
      "round_hole_id, shot_number, distance_to_pin, holed_out, lie_type, sg_value",
    )
    .in("round_hole_id", roundHoleIds)
    .order("round_hole_id", { ascending: true })
    .order("shot_number", { ascending: true });

  if (shotsError) {
    throw new Error(shotsError.message);
  }

  const offTee = createCategoryStats();
  const approach = createCategoryStats();
  const shortGame = createCategoryStats();
  const putting = createCategoryStats();
  let totalSgSum = 0;
  let totalSgCount = 0;
  let fairwaysHitFromTee = 0;
  let greenHoledOutDistanceFeet = 0;
  let greensInRegulation = 0;
  let putts = 0;

  const shotsByRoundHoleId = new Map<number, ShotRow[]>();
  const getComparisonDistanceYards = (metres: number) =>
    metres * METRES_TO_YARDS;

  for (const shot of (shotRows ?? []) as ShotRow[]) {
    const roundHoleId = Number(shot.round_hole_id);
    const shotsForHole = shotsByRoundHoleId.get(roundHoleId) ?? [];
    shotsForHole.push({
      ...shot,
      round_hole_id: roundHoleId,
      shot_number: Number(shot.shot_number),
      distance_to_pin: Number(shot.distance_to_pin),
      holed_out: Boolean(shot.holed_out),
      sg_value: shot.sg_value == null ? null : Number(shot.sg_value),
    });
    shotsByRoundHoleId.set(roundHoleId, shotsForHole);

    const normalizedLieType = normalizeLieType(shot.lie_type);

    if (normalizedLieType === "green" && Boolean(shot.holed_out)) {
      greenHoledOutDistanceFeet += Number(shot.distance_to_pin);
    }

    if (shot.sg_value == null) {
      continue;
    }

    const sgValue = Number(shot.sg_value);

    totalSgSum += sgValue;
    totalSgCount += 1;

    if (normalizedLieType === "tee") {
      offTee.sum += sgValue;
      offTee.count += 1;
      continue;
    }

    if (normalizedLieType === "green") {
      putts += 1;
      putting.sum += sgValue;
      putting.count += 1;
      continue;
    }

    if (getComparisonDistanceYards(Number(shot.distance_to_pin)) > 30) {
      approach.sum += sgValue;
      approach.count += 1;
      continue;
    }

    shortGame.sum += sgValue;
    shortGame.count += 1;
  }

  for (const [roundHoleId, shotsForHole] of shotsByRoundHoleId.entries()) {
    const hole = holesByRoundHoleId.get(roundHoleId);
    const girThreshold = getGirThreshold(hole?.par ?? null);
    let holeCountsAsGir = false;

    for (let index = 0; index < shotsForHole.length; index += 1) {
      const shot = shotsForHole[index];
      const nextShot = shotsForHole[index + 1];

      if (!nextShot) {
        continue;
      }

      const normalizedLieType = normalizeLieType(shot.lie_type);
      const nextLieType = normalizeLieType(nextShot.lie_type);

      if (normalizedLieType === "tee" && nextLieType === "fairway") {
        fairwaysHitFromTee += 1;
      }

      if (
        !holeCountsAsGir &&
        girThreshold != null &&
        shot.shot_number <= girThreshold &&
        nextLieType === "green"
      ) {
        holeCountsAsGir = true;
        greensInRegulation += 1;
      }
    }
  }

  return {
    approachTotal: totalFromStats(approach),
    fairwaysHitFromTee,
    greenHoledOutDistanceFeet,
    greensInRegulation,
    offTeeTotal: totalFromStats(offTee),
    putts,
    puttingTotal: totalFromStats(putting),
    shortGameTotal: totalFromStats(shortGame),
    totalSg: totalSgCount === 0 ? null : totalSgSum,
  };
};
