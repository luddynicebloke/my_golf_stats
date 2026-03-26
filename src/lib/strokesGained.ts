const METRES_TO_YARDS = 1.09361;
const MIN_TEE_DISTANCE_YARDS = 150;
const MAX_FAIRWAY_DISTANCE_YARDS = 400;

const clampLookupDistanceByLie = (
  distanceYards: number,
  lieType: string,
): number => {
  const normalizedLieType = lieType.trim().toLowerCase();

  if (normalizedLieType === "tee") {
    return Math.max(distanceYards, MIN_TEE_DISTANCE_YARDS);
  }

  if (normalizedLieType === "fairway") {
    return Math.min(distanceYards, MAX_FAIRWAY_DISTANCE_YARDS);
  }

  return distanceYards;
};

export const getStrokesGainedLookupDistance = (
  distanceToPin: number,
  lieType: string,
): number =>
  lieType.trim().toLowerCase() === "green"
    ? distanceToPin
    : clampLookupDistanceByLie(distanceToPin * METRES_TO_YARDS, lieType);
