import { A, useNavigate, useParams } from "@solidjs/router";

import { createResource, Show } from "solid-js";

import Course_details from "../components/admin/course_details";
import TeeManager from "../components/admin/teeManager";
import Scorecard from "../components/admin/scorecard";

import loadCourseEditorData from "../components/admin/loadCourseEditorData";
import LoadingCss from "../components/LoadingCss";
import { supabase } from "../supabase/client";

const CourseEditor = () => {
  const params = useParams();
  const navigate = useNavigate();

  const [courseData, { refetch }] = createResource(
    () => params.id,
    loadCourseEditorData,
  );

  const handleDeleteTee = async (teeId: string) => {
    const tees = courseData()?.tees ?? [];

    if (tees.length > 1) {
      //await supabase.from("hole_tee").delete().eq("tee_id", teeId);
      await supabase.from("tees").delete().eq("id", teeId);
      refetch(); // refresh data after deletion
    }

    if (tees.length === 1) {
      // last tee → delete entire course
      const { data, error } = await supabase
        .from("courses")
        .delete()
        .eq("id", params.id);
      if (error) {
        console.error("Error deleting course:", error);
        return;
      }

      navigate("/admin", { replace: true }); // redirect to admin panel if course is deleted
    }
  };

  return (
    <>
      <div class='container mx-auto flex flex-col space-y-10 p-5'>
        <A class='solid_A mx-auto w-max' href={`/admin`}>
          Back to Admin Panel
        </A>
        <Show when={courseData()} fallback={<LoadingCss />}>
          <div class='flex justify-center space-x-16'>
            <div class=''>
              <Course_details course={courseData()!.course} />
            </div>
            <div class=''>
              <TeeManager
                tees={courseData()!.tees}
                onDeleteTee={handleDeleteTee}
              />
            </div>
          </div>
          <div class=''>
            <Scorecard
              tees={courseData()?.tees ?? []}
              holes={courseData()?.holes ?? []}
              holeTees={courseData()?.holeTees ?? []}
            />
          </div>
        </Show>
      </div>
    </>
  );
};

export default CourseEditor;
