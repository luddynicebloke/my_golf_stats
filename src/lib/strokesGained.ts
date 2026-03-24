const METRES_TO_YARDS = 1.09361;

export const getStrokesGainedLookupDistance = (
  distanceToPin: number,
  lieType: string,
): number =>
  lieType.trim().toLowerCase() === "green"
    ? distanceToPin
    : distanceToPin * METRES_TO_YARDS;
