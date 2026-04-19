export type TStrokesGained = {
  title: string;
  score: number;
};

export type TLatestRound = {
  date: string;
  course: string;
  score: number | null;
  strokesGained: number | null;
};

export type TCourse = {
  id: string;
  created_at: string;
  name: string;
  city?: string;
  country?: string;
};

export type TTee = {
  id: string;
  course_id: number;
  color: string;
  course_rating?: number;
  slope_rating?: number;
  total_yardage?: number;
};

export type THole = {
  id: string;
  tee_id: string;
  hole_number: number;
  par: number;
  yardage: number;
};

export type TScorecard = {
  id: string;
  hole_id: number;
  tee_id: number;
  yardage: number;
};

export type User = {
  id: string;
  email: string;
  category: string;
  avatar_url: string;
  distance: string;
  role: "user" | "admin" | "pro";
};

export type PlayerCategories =
  | "Pro M"
  | "Pro F"
  | "Amateur M"
  | "Amateur F"
  | "Senior M"
  | "Senior F";

export const CategoryOptions = [
  { label: "Pro Male", value: "Pro M" },
  { label: "Pro Female", value: "Pro F" },
  { label: "Amateur Male", value: "Amateur M" },
  { label: "Amateur Female", value: "Amateur F" },
  { label: "Senior Male", value: "Senior M" },
  { label: "Senior Female", value: "Senior F" },
];
