import { supabase } from "../../supabase/client";

// fetches all the data required to display all the course details

const loadCourseEditorData = async (courseId: string) => {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  const { data: tees } = await supabase
    .from("tees")
    .select("*")
    .eq("course_id", courseId)
    .order("total_yardage", { ascending: false });

  const { data: holes } = await supabase
    .from("holes")
    .select("*")
    .eq("course_id", courseId)
    .order("hole_number");

  const { data: holeTees } = await supabase
    .from("hole_tee")
    .select("*")
    .in(
      "hole_id",
      holes!.map((h) => h.id),
    );

  if (error) {
    console.error("Error fetching courses:", error);
    return null;
  }

  return {
    course,
    tees,
    holes,
    holeTees,
  };
};
export default loadCourseEditorData;
