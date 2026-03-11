import { createEffect, createSignal, Show } from "solid-js";
import { supabase } from "../../supabase/client";
import Slider from "./Slider";

type LieType = "TEE" | "FAIRWAY" | "ROUGH" | "BUNKER" | "GREEN" | "RECOVERY";

type ShotEntryProps = {
  holeRoundId: number;
  holePar: number;
  nextShotNumber: number;
  startDistance: number;
  startLie: LieType;
  onShotSaved?: () => Promise<void> | void;
};

export default function ShotEntry(props: ShotEntryProps) {
  const [distanceToPin, setDistanceToPin] = createSignal(props.startDistance);
  const [lieType, setLieType] = createSignal<LieType>(props.startLie);
  const [penalty, setPenalty] = createSignal(false);
  const [penaltyStrokes, setPenaltyStrokes] = createSignal(0);
  const [holedOut, setHoledOut] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    setDistanceToPin(props.startDistance);
    setLieType(props.startLie);
    setPenalty(false);
    setPenaltyStrokes(0);
    setHoledOut(false);
  });

  async function saveShot() {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        hole_round_id: props.holeRoundId,
        shot_number: props.nextShotNumber,
        distance_to_pin: holedOut() ? 0 : Number(distanceToPin()),
        lie_type: lieType(),
        holed_out: holedOut(),
        sg_value: null,
      };

      let { error: insertError } = await supabase.from("shotslies").insert({
        ...payload,
        penalty_strokes: penalty() ? Number(penaltyStrokes()) : 0,
      });

      if (insertError?.message?.toLowerCase().includes("penalty_strokes")) {
        const retry = await supabase.from("shotslies").insert({
          ...payload,
          penalty_stroke: penalty() ? Number(penaltyStrokes()) : 0,
        });
        insertError = retry.error;
      }

      if (insertError) throw insertError;

      if (props.onShotSaved) {
        await props.onShotSaved();
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to save shot");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class='max-w-md space-y-3 rounded border p-3 text-gray-800 shadow'>
      <div class='text-sm font-semibold'>Shot {props.nextShotNumber}</div>

      <Slider
        label={lieType() === "GREEN" ? "Feet to hole" : "Yards to pin"}
        value={distanceToPin()}
        min={1}
        max={lieType() === "GREEN" ? 100 : 600}
        r1={1}
        r2={lieType() === "GREEN" ? 15 : 100}
        r3={lieType() === "GREEN" ? 30 : 200}
        r4={lieType() === "GREEN" ? 45 : 300}
        r5={lieType() === "GREEN" ? 60 : 400}
        r6={lieType() === "GREEN" ? 75 : 500}
        r7={lieType() === "GREEN" ? 100 : 600}
        onChange={(value) => setDistanceToPin(Number(value))}
      />

      <div class='grid grid-cols-2 gap-2 p-1'>
        <label class='text-sm'>
          Distance to pin
          <input
            type='number'
            min='0'
            class='w-full rounded border px-2 py-1'
            value={distanceToPin()}
            onInput={(e) => setDistanceToPin(Number(e.currentTarget.value))}
            disabled={holedOut()}
          />
        </label>

        <label class='text-sm'>
          Lie
          <select
            class='w-full rounded border px-2 py-1'
            value={lieType()}
            onChange={(e) => setLieType(e.currentTarget.value as LieType)}
          >
            <option value='TEE'>Tee</option>
            <option value='FAIRWAY'>Fairway</option>
            <option value='ROUGH'>Rough</option>
            <option value='BUNKER'>Bunker</option>
            <option value='GREEN'>Green</option>
            <option value='RECOVERY'>Recovery</option>
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

        <Show when={penalty()}>
          <label class='text-sm'>
            Penalty strokes
            <input
              type='number'
              min='1'
              class='ml-2 w-16 rounded border px-2 py-1'
              value={penaltyStrokes()}
              onInput={(e) => setPenaltyStrokes(Number(e.currentTarget.value))}
            />
          </label>
        </Show>

        <label class='ml-auto flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={holedOut()}
            onChange={(e) => setHoledOut(e.currentTarget.checked)}
          />
          Holed out
        </label>
      </div>

      <Show when={error()}>
        <div class='text-sm text-red-600'>{error()}</div>
      </Show>

      <button
        class='w-full rounded border px-3 py-2 font-semibold disabled:opacity-60'
        disabled={saving()}
        onClick={saveShot}
      >
        {saving() ? "Saving..." : "Save shot"}
      </button>
    </div>
  );
}
