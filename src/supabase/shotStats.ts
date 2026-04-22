import { supabase } from "./client";

export type ShotGroup = "putting" | "driving" | "approach" | "chipping";

export type DistanceStatsRow = {
  distance_range: string;
  shots_in_group: number;
  avg_sg_value: number | null;
  fairways_hit: number | null;
  fairway_hit_percentage: number | null;
};

export type DistanceStatsData = {
  rows: DistanceStatsRow[];
};

export type StatsPageData = {
  approach: DistanceStatsData;
  chipping: DistanceStatsData;
  driving: DistanceStatsData;
  putting: DistanceStatsData;
};

export type SelectableRound = {
  id: number;
  course: string;
  playedDate: string;
};

type RoundSummaryRow = {
  id: number | string | null;
  played_date: string | null;
  course: string | null;
  finished: boolean | null;
};

type RoundShotViewRow = {
  round_hole_id: number | null;
  shot_number: number | null;
  distance_to_pin: number | null;
  lie_type: string | null;
  sg_value: number | null;
};

type AggregatedShot = {
  distanceToPin: number;
  lieType: string;
  nextLieType: string | null;
  sgValue: number;
};

type BucketDefinition = {
  label: string;
  matches: (distance: number) => boolean;
};

const RECENT_ROUNDS_LIMIT = 10;
const SELECTABLE_ROUNDS_LIMIT = 100;

const puttingBuckets: BucketDefinition[] = [
  { label: "0 to 3", matches: (distance) => distance >= 0 && distance < 4 },
  { label: "4 to 7", matches: (distance) => distance >= 4 && distance < 8 },
  { label: "8 to 11", matches: (distance) => distance >= 8 && distance < 12 },
  { label: "12 to 15", matches: (distance) => distance >= 12 && distance < 16 },
  { label: "16 to 20", matches: (distance) => distance >= 16 && distance < 21 },
  { label: "21 to 30", matches: (distance) => distance >= 21 && distance < 31 },
  { label: "31 to 40", matches: (distance) => distance >= 31 && distance < 41 },
  { label: "41 to 50", matches: (distance) => distance >= 41 && distance < 51 },
  { label: "51 to 60", matches: (distance) => distance >= 51 && distance < 61 },
  { label: "61 to 74", matches: (distance) => distance >= 61 && distance < 75 },
  { label: "75 to 119", matches: (distance) => distance >= 75 && distance < 120 },
];

const approachBuckets: BucketDefinition[] = [
  { label: "31 to 60", matches: (distance) => distance >= 31 && distance <= 60 },
  { label: "61 to 90", matches: (distance) => distance >= 61 && distance <= 90 },
  { label: "91 to 120", matches: (distance) => distance >= 91 && distance <= 120 },
  {
    label: "121 to 150",
    matches: (distance) => distance >= 121 && distance <= 150,
  },
  {
    label: "151 to 200",
    matches: (distance) => distance >= 151 && distance <= 200,
  },
];

const chippingBuckets: BucketDefinition[] = [
  { label: "1 to 10", matches: (distance) => distance >= 0 && distance <= 10 },
  { label: "11 to 20", matches: (distance) => distance >= 11 && distance <= 20 },
  { label: "21 to 30", matches: (distance) => distance >= 21 && distance <= 30 },
];

export const emptyDistanceStatsData = (): DistanceStatsData => ({
  rows: [],
});

export const emptyStatsPageData = (): StatsPageData => ({
  approach: emptyDistanceStatsData(),
  chipping: emptyDistanceStatsData(),
  driving: emptyDistanceStatsData(),
  putting: emptyDistanceStatsData(),
});

const parseNumberLike = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeDistanceStatsRow = (value: unknown): DistanceStatsRow | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const distanceRange = row.distance_range;
  const parsedShotsInGroup = parseNumberLike(row.shots_in_group);

  if (typeof distanceRange !== "string" || parsedShotsInGroup == null) {
    return null;
  }

  return {
    distance_range: distanceRange,
    shots_in_group: parsedShotsInGroup,
    avg_sg_value: parseNumberLike(row.avg_sg_value),
    fairways_hit: parseNumberLike(row.fairways_hit),
    fairway_hit_percentage: parseNumberLike(row.fairway_hit_percentage),
  };
};

const normalizeLieType = (lieType: string) => lieType.trim().toLowerCase();

const roundToPrecision = (value: number, precision: number) => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const getBucketLabel = (shotGroup: ShotGroup, distance: number) => {
  if (shotGroup === "driving") {
    return "Driving";
  }

  const buckets =
    shotGroup === "putting"
      ? puttingBuckets
      : shotGroup === "chipping"
        ? chippingBuckets
        : approachBuckets;
  const fallback =
    shotGroup === "putting" ? "120+" : shotGroup === "chipping" ? "31+" : "201+";

  return buckets.find((bucket) => bucket.matches(distance))?.label ?? fallback;
};

const shotMatchesGroup = (shot: AggregatedShot, shotGroup: ShotGroup) => {
  const lieType = normalizeLieType(shot.lieType);

  if (shotGroup === "putting") {
    return lieType === "green";
  }

  if (shotGroup === "driving") {
    return lieType === "tee";
  }

  if (lieType === "green" || lieType === "tee") {
    return false;
  }

  if (shotGroup === "chipping") {
    return shot.distanceToPin >= 0 && shot.distanceToPin <= 30;
  }

  return shot.distanceToPin > 30;
};

const aggregateShotStats = (
  shots: AggregatedShot[],
  shotGroup: ShotGroup,
): DistanceStatsData => {
  const groupedRows = new Map<
    string,
    {
      fairwaysHit: number;
      maxDistance: number;
      minDistance: number;
      shots: number;
      sgTotal: number;
    }
  >();

  for (const shot of shots) {
    if (!shotMatchesGroup(shot, shotGroup)) {
      continue;
    }

    const bucketLabel = getBucketLabel(shotGroup, shot.distanceToPin);
    const existing = groupedRows.get(bucketLabel) ?? {
      fairwaysHit: 0,
      maxDistance: shot.distanceToPin,
      minDistance: shot.distanceToPin,
      shots: 0,
      sgTotal: 0,
    };

    existing.shots += 1;
    existing.sgTotal += shot.sgValue;
    existing.minDistance = Math.min(existing.minDistance, shot.distanceToPin);
    existing.maxDistance = Math.max(existing.maxDistance, shot.distanceToPin);

    if (
      shotGroup === "driving" &&
      normalizeLieType(shot.nextLieType ?? "") === "fairway"
    ) {
      existing.fairwaysHit += 1;
    }

    groupedRows.set(bucketLabel, existing);
  }

  return {
    rows: Array.from(groupedRows.entries())
      .sort(([, a], [, b]) => a.minDistance - b.minDistance)
      .map(([distanceRange, row]) => ({
        distance_range: distanceRange,
        shots_in_group: row.shots,
        avg_sg_value: roundToPrecision(row.sgTotal / row.shots, 3),
        fairways_hit: shotGroup === "driving" ? row.fairwaysHit : null,
        fairway_hit_percentage:
          shotGroup === "driving"
            ? roundToPrecision((row.fairwaysHit / row.shots) * 100, 1)
            : null,
      })),
  };
};

const createStatsPageDataFromShots = (shots: AggregatedShot[]): StatsPageData => ({
  approach: aggregateShotStats(shots, "approach"),
  chipping: aggregateShotStats(shots, "chipping"),
  driving: aggregateShotStats(shots, "driving"),
  putting: aggregateShotStats(shots, "putting"),
});

const fetchRecentShotSgStats = async (
  targetUserId: string,
  shotGroup: ShotGroup,
): Promise<DistanceStatsData> => {
  const { data, error } = await supabase.rpc("get_recent_sg_stats_for_user", {
    p_target_user_id: targetUserId,
    p_round_limit: RECENT_ROUNDS_LIMIT,
    p_shot_group: shotGroup,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data)
    ? data
        .map((item) => normalizeDistanceStatsRow(item))
        .filter((item): item is DistanceStatsRow => item !== null)
    : [];

  return { rows };
};

export const fetchRecentStatsPageData = async (
  targetUserId: string,
): Promise<StatsPageData> => {
  const [putting, driving, approach, chipping] = await Promise.all([
    fetchRecentShotSgStats(targetUserId, "putting"),
    fetchRecentShotSgStats(targetUserId, "driving"),
    fetchRecentShotSgStats(targetUserId, "approach"),
    fetchRecentShotSgStats(targetUserId, "chipping"),
  ]);

  return {
    approach,
    chipping,
    driving,
    putting,
  };
};

export const fetchSelectableRounds = async (
  targetUserId: string,
): Promise<SelectableRound[]> => {
  if (!targetUserId) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_round_summary_list", {
    p_limit: SELECTABLE_ROUNDS_LIMIT,
    p_offset: 0,
    p_recent_limit: SELECTABLE_ROUNDS_LIMIT,
    p_user_id: targetUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RoundSummaryRow[])
    .filter((round) => Boolean(round.finished) && round.id != null)
    .map((round) => ({
      id: Number(round.id),
      course: round.course ?? "Unknown course",
      playedDate: round.played_date ?? "",
    }));
};

export const fetchSelectedRoundStats = async (
  roundIds: number[],
): Promise<StatsPageData> => {
  if (roundIds.length === 0) {
    return emptyStatsPageData();
  }

  const roundRows = await Promise.all(
    roundIds.map(async (roundId) => {
      const { data, error } = await supabase.rpc("get_round_shots_for_view", {
        p_round_id: roundId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as RoundShotViewRow[];
    }),
  );

  const shotsByHole = new Map<number, RoundShotViewRow[]>();

  for (const row of roundRows.flat()) {
    if (
      row.round_hole_id == null ||
      row.shot_number == null ||
      row.distance_to_pin == null ||
      row.lie_type == null ||
      row.sg_value == null
    ) {
      continue;
    }

    const roundHoleId = Number(row.round_hole_id);
    const shotsForHole = shotsByHole.get(roundHoleId) ?? [];
    shotsForHole.push(row);
    shotsByHole.set(roundHoleId, shotsForHole);
  }

  const shots: AggregatedShot[] = [];

  for (const shotsForHole of shotsByHole.values()) {
    const sortedShots = [...shotsForHole].sort(
      (a, b) => Number(a.shot_number ?? 0) - Number(b.shot_number ?? 0),
    );

    for (let index = 0; index < sortedShots.length; index += 1) {
      const shot = sortedShots[index];

      if (
        shot.distance_to_pin == null ||
        shot.lie_type == null ||
        shot.sg_value == null
      ) {
        continue;
      }

      shots.push({
        distanceToPin: Number(shot.distance_to_pin),
        lieType: shot.lie_type,
        nextLieType: sortedShots[index + 1]?.lie_type ?? null,
        sgValue: Number(shot.sg_value),
      });
    }
  }

  return createStatsPageDataFromShots(shots);
};

export const recentRoundsLimit = RECENT_ROUNDS_LIMIT;
