import { supabase } from "./client";

type CourseRelation = {
  name: string | null;
};

type PlayerRoundRow = {
  round_date: string | null;
  courses: CourseRelation | CourseRelation[] | null;
};

export type PlayerRoundHistoryItem = {
  courseName: string;
  roundDate: string;
};

const getCourseName = (courses: PlayerRoundRow["courses"]) => {
  if (Array.isArray(courses)) {
    return courses[0]?.name ?? "";
  }

  return courses?.name ?? "";
};

export const fetchPlayerRoundHistory = async (
  userId: string,
): Promise<PlayerRoundHistoryItem[]> => {
  const { data, error } = await supabase
    .from("rounds")
    .select("round_date, courses(name)")
    .eq("user_id", userId)
    .order("round_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PlayerRoundRow[]).map((round) => ({
    courseName: getCourseName(round.courses),
    roundDate: round.round_date ?? "",
  }));
};
