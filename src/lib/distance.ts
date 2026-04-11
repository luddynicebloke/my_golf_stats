export const distanceUnitOptions = ["yards", "metres"] as const;

export type DistanceUnit = (typeof distanceUnitOptions)[number];

const METRES_TO_YARDS = 1.09361;
const YARDS_TO_METRES = 0.9144;

export const normalizeDistanceUnit = (
  unit: string | null | undefined,
): DistanceUnit => {
  if (unit === "metres" || unit === "meters") {
    return "metres";
  }

  return "yards";
};

export const convertMetresToUnit = (
  metres: number,
  unit: DistanceUnit,
): number => {
  if (unit === "yards") {
    return Math.round(metres * METRES_TO_YARDS);
  }

  return Math.round(metres);
};

export const convertMetresToRoundedYardsStep = (
  metres: number,
  step = 5,
): number => {
  const yards = metres * METRES_TO_YARDS;
  return Math.round(yards / step) * step;
};

export const convertUnitToMetres = (
  value: number,
  unit: DistanceUnit,
): number => {
  if (unit === "yards") {
    return Math.round(value * YARDS_TO_METRES);
  }

  return Math.round(value);
};

export const getDistanceUnitLabel = (unit: DistanceUnit): string =>
  unit === "yards" ? "Yds" : "M";

export const formatMetresForDisplay = (
  metres: number,
  unit: DistanceUnit,
): string => `${convertMetresToUnit(metres, unit)} ${getDistanceUnitLabel(unit)}`;
