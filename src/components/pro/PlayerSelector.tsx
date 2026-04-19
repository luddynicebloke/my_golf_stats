import { For, Show } from "solid-js";

import type { AccessiblePlayer } from "../../supabase/proAccess";

type PlayerSelectorProps = {
  label?: string;
  players: AccessiblePlayer[];
  selectedPlayerId: string | null;
  onChange: (playerId: string) => void;
};

const getPlayerLabel = (player: AccessiblePlayer) =>
  player.user_name?.trim() || player.email || "Unknown player";

export default function PlayerSelector(props: PlayerSelectorProps) {
  return (
    <div class='rounded-xl border border-slate-200 bg-slate-50 p-4'>
      <label class='block'>
        <span class='mb-1 block text-sm font-medium text-slate-700'>
          {props.label ?? "Player"}
        </span>
        <Show
          when={props.players.length > 0}
          fallback={
            <p class='text-sm text-slate-500'>
              No players have granted you viewing access yet.
            </p>
          }
        >
          <select
            value={props.selectedPlayerId ?? ""}
            onChange={(event) => props.onChange(event.currentTarget.value)}
            class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
          >
            <For each={props.players}>
              {(player) => (
                <option value={player.id}>{getPlayerLabel(player)}</option>
              )}
            </For>
          </select>
        </Show>
      </label>
    </div>
  );
}
