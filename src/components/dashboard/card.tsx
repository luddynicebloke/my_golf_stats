import { CgUserList } from "solid-icons/cg";
import { SiLevelsdotfyi } from "solid-icons/si";
import { ImStatsBars } from "solid-icons/im";
import { BiRegularStats } from "solid-icons/bi";

const iconMap = {
  rounds: CgUserList,
  topar: BiRegularStats,
  average: SiLevelsdotfyi,
  stats: ImStatsBars,
};

interface CardProps {
  title: string;
  value: number | string;
  type: "rounds" | "topar" | "average" | "stats";
}

export default function Card(props: CardProps) {
  const Icon = iconMap[props.type];
  return (
    <div class='rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm'>
      <div class='flex items-center gap-2 p-2 sm:p-3'>
        {Icon ? <Icon class='h-5 w-5 text-cyan-700' /> : null}
        <h3 class='font-grotesk text-sm font-medium text-slate-600'>
          {props.title}
        </h3>
      </div>
      <p class='truncate rounded-xl bg-slate-50 px-3 py-6 text-center font-rubik text-2xl font-semibold sm:py-8'>
        {props.value}
      </p>
    </div>
  );
}
