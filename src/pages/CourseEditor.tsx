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
    <div class='mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
      <div class='rounded-3xl border border-slate-200 bg-linear-to-r from-cyan-950 via-slate-900 to-emerald-950 px-6 py-8 text-slate-100 shadow-xl'>
        <p class='font-grotesk text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300'>
          Golf Stats Admin
        </p>
        <div class='mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div>
            <h1 class='font-rubik text-3xl font-semibold tracking-tight md:text-4xl'>
              Course Editor
            </h1>
            <p class='mt-2 max-w-2xl font-grotesk text-sm text-slate-300 md:text-base'>
              Update course details, configure tee settings, and manage hole
              yardages.
            </p>
          </div>
          <A
            href='/admin'
            class='inline-flex w-max items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 font-grotesk text-sm font-semibold text-white transition hover:bg-white/20'
          >
            Back to Admin Panel
          </A>
        </div>
      </div>

      <Show
        when={courseData()}
        fallback={
          <div class='mt-6 flex justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm'>
            <LoadingCss />
          </div>
        }
      >
        <div class='mt-6 grid gap-6 lg:grid-cols-12'>
          <div class='rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6 lg:col-span-5'>
            <Course_details course={courseData()!.course} />
          </div>
          <div class='rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6 lg:col-span-7'>
            <TeeManager tees={courseData()!.tees} onDeleteTee={handleDeleteTee} />
          </div>
        </div>

        <div class='mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6'>
          <h2 class='mb-4 font-rubik text-lg font-semibold text-slate-800'>
            Hole Scorecard
          </h2>
          <Scorecard
            tees={courseData()?.tees ?? []}
            holes={courseData()?.holes ?? []}
            holeTees={courseData()?.holeTees ?? []}
          />
        </div>
      </Show>
    </div>
  );
};

export default CourseEditor;
