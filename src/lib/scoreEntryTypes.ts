export type ScorecardHole = {
  round_hole_id: number;
  hole_id: number;
  hole_number: number;
  par: number;
  yardage: number;
  score: number | null;
  completed: boolean;
};

export type BallLie = "Tee" | "Fairway" | "Rough" | "Bunker" | "Green";

export type LocalShot = {
  shotNumber: number;
  lieType: BallLie;
  distanceToPin: number;
  penaltyShots: number;
  holedOut: boolean;
};

export const ballLies: BallLie[] = [
  "Tee",
  "Fairway",
  "Rough",
  "Bunker",
  "Green",
];
