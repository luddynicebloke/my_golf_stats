type ShotEntryProps = {
  holeNumber: number;
  par: number;
  yardage: number;
};

export default function ShotEntry(props: ShotEntryProps) {
  return (
    <div class='space-y-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:p-5'>
      <div class='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
        <div>
          <h3 class='font-rubik text-lg font-semibold text-slate-800'>
            Shot Entry Reset
          </h3>
          <p class='mt-1 text-sm text-slate-500'>
            Rebuild this form against the updated database schema.
          </p>
        </div>
        <span class='rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700'>
          Placeholder
        </span>
      </div>

      <div class='grid gap-3 sm:grid-cols-3'>
        <div class='rounded-xl border border-slate-200 bg-white p-3'>
          <p class='text-xs font-semibold uppercase tracking-wide text-slate-400'>
            Hole
          </p>
          <p class='mt-1 text-sm font-medium text-slate-700'>
            {props.holeNumber}
          </p>
        </div>
        <div class='rounded-xl border border-slate-200 bg-white p-3'>
          <p class='text-xs font-semibold uppercase tracking-wide text-slate-400'>
            Par
          </p>
          <p class='mt-1 text-sm font-medium text-slate-700'>{props.par}</p>
        </div>
        <div class='rounded-xl border border-slate-200 bg-white p-3'>
          <p class='text-xs font-semibold uppercase tracking-wide text-slate-400'>
            Yardage
          </p>
          <p class='mt-1 text-sm font-medium text-slate-700'>
            {props.yardage} yds
          </p>
        </div>
      </div>

      <div class='rounded-xl border border-slate-200 bg-white p-3 sm:p-4'>
        <p class='text-sm text-slate-600'>
          The previous shot capture logic has been intentionally removed so the
          new table names, joins, and write flow can be redesigned cleanly.
        </p>
      </div>
    </div>
  );
}
