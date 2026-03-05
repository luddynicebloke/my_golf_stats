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
    <div class='rounded-xl bg-gray-50 dark:bg-gray-900/75 p-2 shadow-sm'>
      <div class='flex p-4'>
        {Icon ? <Icon class='h-5 w-5 text-gray-700' /> : null}
        <h3 class='ml-2 text-sm font-medium'>{props.title}</h3>
      </div>
      <p class='truncate rounded-xl bg-white dark:bg-slate-900 px-4 py-8 text-center text-2xl'>
        {props.value}
      </p>
    </div>
  );
}
