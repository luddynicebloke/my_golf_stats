import { createMemo, createSignal, Show } from "solid-js";
import { Params } from "@solidjs/router";

import ShotEntry from "./ShotEntry";

import { supabase } from "../../supabase/client";
import BackNineTable from "./BackNineTable";
import FrontNineTable from "./FrontNineTable";

type ScorecardHole = {
  hole_round_id: number;
  hole_number: number;
  par: number;
  yardage: number;
  strokes: number | null;
};

// for title of scorecard - also to remind player where he is
type CourseTee = {
  name: string;
  colour: string;
};

export default function ScorecardEntry(props: { id: string }) {
  const params = props as Params;
  const [roundId, setRoundId] = createSignal(Number(params.id));
  const [scorecard, setScorecard] = createSignal<ScorecardHole[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  const [courseTee, setCourseTee] = createSignal<CourseTee>({
    name: "",
    colour: "",
  });

  // load course name and tee colour
  const courseDetails = async (id: number) => {
    const { data, error } = await supabase.rpc("get_course_and_tee", {
      p_round_id: id,
    });

    setCourseTee({
      ...courseTee(),
      name: data[0].course_name,
      colour: data[0].tee_color,
    });
  };

  // load the scorecard
  const loadScorecard = async (id: number) => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.rpc("get_scorecard", {
      p_round_id: id,
    });

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    // set out the scorecard
    const rows = (data ?? []).map(
      (r: any): ScorecardHole => ({
        hole_round_id: Number(r.hole_round_id),
        hole_number: Number(r.hole_number),
        par: Number(r.par),
        yardage: Number(r.yardage),
        strokes: r.strokes == null ? 0 : Number(r.strokes),
      }),
    );

    // make certain it is sorted even though the sql function ass for it
    rows.sort((a: any, b: any) => a.hole_number - b.hole_humber);

    setScorecard(rows);
    setLoading(false);
  };

  loadScorecard(+roundId()!);
  // split to front and back 9
  const front9 = createMemo(() =>
    scorecard().filter((h) => h.hole_number <= 9),
  );
  const back9 = createMemo(() =>
    scorecard().filter((h) => h.hole_number >= 10),
  );
  // load database data
  courseDetails(+roundId()!);

  // use reduce to get the total of the par and yardage row

  const handleOnChange = () => {
    alert("I changed");
  };

  const handleShotSaved = () => {};
  const handleHoledOut = () => {};

  return (
    <div class='flex flex-col gap-3 bg-gray-200 h-screen p-3 rounded-2xl'>
      <div
        id='tableWrapper'
        class='container border overflow-x-auto max-h-screen rounded p-2
        
           text-gray-800 font '
      >
        <Show when={courseTee()}>
          <div class='text-xl font-bold text-center my-2'>
            Course: {courseTee().name} Tee: {courseTee().colour}
          </div>
        </Show>

        <div class='flex gap-6'>
          <FrontNineTable holes={front9()} onChange={handleOnChange} />
          <div class='hidden sm:block'>
            <BackNineTable holes={back9()} onChange={handleOnChange} />
          </div>
        </div>
      </div>

      <ShotEntry
        roundId={roundId()}
        holeRoundId={128}
        nextShotNumber={1}
        startDistance={437}
        startLie='TEE'
        onShotSaved={handleShotSaved}
        onHoledOut={handleHoledOut}
      />
    </div>
  );
}
