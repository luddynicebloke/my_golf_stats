import { createSignal, JSX, Show } from "solid-js";
import { supabase } from "../../supabase/client";
import Slider from "./Slider";
import { IoHandLeft } from "solid-icons/io";

import Rough from "../../assets/rough.png";
import Fairway from "../../assets/fairway.png";
import Bunker from "../../assets/bunker.png";
import Tee from "../../assets/tee.png";
import Green from "../../assets/green.png";
import Recovery from "../../assets/recovery.png";

type LieType = "TEE" | "FAIRWAY" | "ROUGH" | "SAND" | "GREEN" | "RECOVERY";
type Location =
  | "TEE"
  | "FAIRWAY"
  | "ROUGH"
  | "SAND"
  | "GREEN"
  | "PENALTY"
  | "HOLE";

type ShotEntryProps = {
  roundId: number;
  holeRoundId: number;
  nextShotNumber: number; // parent calculates (max shot_number + 1)
  startDistance: number; // parent tracks current ball distance to pin
  startLie: LieType;
  onShotSaved?: () => void;
  onHoledOut?: () => void;
};

export default function ShotEntry(props: ShotEntryProps) {
  const [distanceToPin, setDistanceToPin] = createSignal(props.startDistance);
  const [lieType, setLieType] = createSignal<LieType>(props.startLie);
  const [endLocation, setEndLocation] = createSignal<Location>("FAIRWAY");
  const [penalty, setPenalty] = createSignal(false);
  const [penaltyStrokes, setPenaltyStrokes] = createSignal(0);
  const [holedOut, setHoledOut] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function refreshHoleTotals() {
    // sum(1 + penalty_strokes) for this hole_round_id
    const { data, error } = await supabase
      .from("shotslies")
      .select("penalty_strokes")
      .eq("hole_round_id", props.holeRoundId);

    if (error) throw error;

    const strokes = (data ?? []).reduce(
      (t, r) => t + 1 + (r.penalty_strokes ?? 0),
      0,
    );

    // completed if any shot is holed_out
    const { data: holed, error: holedErr } = await supabase
      .from("shotslies")
      .select("holed_out")
      .eq("hole_round_id", props.holeRoundId);

    if (holedErr) throw holedErr;

    const completed = (holed ?? []).some((r) => r.holed_out === true);

    const { error: upErr } = await supabase
      .from("hole_round")
      .update({ strokes, completed })
      .eq("id", props.holeRoundId);

    if (upErr) throw upErr;
  }

  async function saveShot() {
    setSaving(true);
    setError(null);

    try {
      // if holed out, distance_to_pin should be 0 and end_location should be HOLE
      const finalHoledOut = holedOut() || endLocation() === "HOLE";
      const finalEndLocation: Location = finalHoledOut ? "HOLE" : endLocation();

      const payload = {
        round_id: props.roundId,
        hole_round_id: props.holeRoundId,
        shot_number: props.nextShotNumber,
        distance_to_pin: finalHoledOut ? 0 : Number(distanceToPin()),
        lie_type: lieType(),
        start_location: lieType(), // or keep separate if you prefer
        end_location: finalEndLocation,
        penalty_strokes: penalty() ? Number(penaltyStrokes()) : 0,
        holed_out: finalHoledOut,
        sg_value: null, // calculate later after round, or immediately if you have expectation table ready
      };

      const { error: insErr } = await supabase
        .from("shotslies")
        .insert(payload);
      if (insErr) throw insErr;

      await refreshHoleTotals();

      props.onShotSaved?.();
      if (finalHoledOut) props.onHoledOut?.();
    } catch (e: any) {
      setError(e.message ?? "Failed to save shot");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class='p-3 rounded shadow border max-w-md space-y-3 text-gray-800'>
      <div class='text-sm font-semibold '>Shot {props.nextShotNumber}</div>
      {lieType() !== "GREEN" ? (
        <Slider
          label='Yards to pin'
          value={distanceToPin()}
          min={1}
          max={600}
          r1={1}
          r2={100}
          r3={200}
          r4={300}
          r5={400}
          r6={500}
          r7={600}
          onChange={(value) => setDistanceToPin(Number(value))}
        />
      ) : (
        <Slider
          label='Feet to hole'
          value={distanceToPin()}
          min={1}
          max={100}
          r1={1}
          r2={15}
          r3={30}
          r4={45}
          r5={60}
          r6={75}
          r7={100}
          onChange={(value) => setDistanceToPin(Number(value))}
        />
      )}

      <div class='flex text-sm justify-between gap-2 mt-2 sm:justify-center  text-slate-900'>
        <div
          onclick={() => setLieType("TEE")}
          class={`rounded-md shadow-md w-12 flex flex-col gap-3
            justify-center items-center cursor-pointer ${lieType() === "TEE" && "border rounded-full"} `}
        >
          <img src={Tee} width={56} alt='tee' />
          Tee
        </div>
        <div
          onclick={() => setLieType("FAIRWAY")}
          class={`rounded-md shadow-md w-16 flex flex-col gap-2
            justify-center items-center cursor-pointer ${lieType() === "FAIRWAY" && "border rounded-full"} `}
        >
          <img src={Fairway} width={64} alt='fairway' />
          Fairway
        </div>
        <div
          onclick={() => setLieType("ROUGH")}
          class={`rounded-md shadow-md w-16 flex flex-col gap-2
            justify-center items-center cursor-pointer ${lieType() === "ROUGH" && "border rounded-full"} `}
        >
          <img src={Rough} width={36} alt='rough' />
          Rough
        </div>
        <div
          onclick={() => setLieType("SAND")}
          class={`rounded-md shadow-md w-16 flex flex-col gap-1
            justify-center items-center cursor-pointer ${lieType() === "SAND" && "border rounded-full"} `}
        >
          <img src={Bunker} width={24} alt='bunker' />
          Sand
        </div>
        <div
          onclick={() => setLieType("RECOVERY")}
          class={`rounded-md shadow-md w-16 flex flex-col gap-3
            justify-center items-center cursor-pointer ${lieType() === "RECOVERY" && "border rounded-full"} `}
        >
          <img src={Recovery} width={24} alt='recovery' />
          Recovery
        </div>
        <div
          onclick={[
            () => setLieType("GREEN"),
            () => {
              setDistanceToPin(25);
            },
          ]}
          class={` shadow-md w-16 flex flex-col gap-1 p-1
            justify-center items-center cursor-pointer ${lieType() === "GREEN" && "border rounded"} `}
        >
          <img src={Green} width={32} alt='green' />
          Green
        </div>
      </div>

      <div class='grid grid-cols-2 gap-2 p-1'>
        <label class='text-sm'>
          Distance to pin
          <input
            type='number'
            min='0'
            class='w-full border rounded px-2 py-1'
            value={distanceToPin()}
            onInput={(e) => setDistanceToPin(Number(e.currentTarget.value))}
            disabled={holedOut()}
          />
        </label>

        <label class='text-sm'>
          Lie
          <select
            class='w-full border rounded px-2 py-1'
            value={lieType()}
            onChange={(e) => setLieType(e.currentTarget.value as LieType)}
          >
            <option value='TEE'>Tee</option>
            <option value='FAIRWAY'>Fairway</option>
            <option value='ROUGH'>Rough</option>
            <option value='SAND'>Sand</option>
            <option value='GREEN'>Green</option>
            <option value='RECOVERY'>Recovery</option>
          </select>
        </label>

        <label class='text-sm col-span-2'>
          End location
          <select
            class='w-full border rounded px-2 py-1'
            value={endLocation()}
            onChange={(e) => {
              const v = e.currentTarget.value as Location;
              setEndLocation(v);
              if (v === "HOLE") setHoledOut(true);
            }}
          >
            <option value='FAIRWAY'>Fairway</option>
            <option value='ROUGH'>Rough</option>
            <option value='BUNKER'>Bunker</option>
            <option value='GREEN'>Green</option>
            <option value='PENALTY'>Penalty area / OB</option>
            <option value='HOLE'>Holed out</option>
          </select>
        </label>
      </div>

      <div class='flex items-center gap-3'>
        <label class='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={penalty()}
            onChange={(e) => setPenalty(e.currentTarget.checked)}
          />
          Penalty
        </label>

        {penalty() && (
          <label class='text-sm'>
            Penalty strokes
            <input
              type='number'
              min='1'
              class='w-16 border rounded px-2 py-1 ml-2'
              value={penaltyStrokes()}
              onInput={(e) => setPenaltyStrokes(Number(e.currentTarget.value))}
            />
          </label>
        )}

        <label class='flex items-center gap-2 text-sm ml-auto'>
          <input
            type='checkbox'
            checked={holedOut()}
            onChange={(e) => {
              const v = e.currentTarget.checked;
              setHoledOut(v);
              if (v) setEndLocation("HOLE");
            }}
          />
          Holed out
        </label>
      </div>

      {error() && <div class='text-sm text-red-600'>{error()}</div>}

      <button
        class='w-full border rounded px-3 py-2 font-semibold disabled:opacity-60'
        disabled={saving()}
        onClick={saveShot}
      >
        {saving() ? "Saving..." : "Save shot"}
      </button>
    </div>
  );
}
