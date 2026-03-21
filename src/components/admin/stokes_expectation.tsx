import { createMemo, createResource, createSignal, For, Show } from "solid-js";

import { supabase } from "../../supabase/client";

type CategoryType = {
  id: number;
  code: string;
  name: string;
};

type SG_DataType = {
  id: number;
  min_distance: number;
  max_distance: number;
  expected_strokes: number;
  lie_type: string;
  category: CategoryType | null;
};

type SGQueryRow = {
  id: number;
  min_distance: number;
  max_distance: number;
  expected_strokes: number;
  lie_type: string;
  category: CategoryType | CategoryType[] | null;
};

type StrokesGainedRow = {
  lie_type: string;
  min_distance: number;
  max_distance: number;
  byCategoryId: Record<number, number | null>;
};

const tabOptions = ["categories", "strokes-gained"] as const;
type ActiveTab = (typeof tabOptions)[number];
const SG_PAGE_SIZE = 1000;

const fetchAllStrokesGained = async () => {
  const allRows: SG_DataType[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sg_expectation_yds")
      .select(
        "id, min_distance, max_distance, expected_strokes, lie_type, category(id,code, name)",
      )
      .order("lie_type")
      .order("min_distance")
      .order("max_distance")
      .range(from, from + SG_PAGE_SIZE - 1);

    if (error) {
      return { data: null, error };
    }

    const rows = ((data as SGQueryRow[] | null) ?? []).map((row) => ({
      ...row,
      category: Array.isArray(row.category)
        ? (row.category[0] ?? null)
        : row.category,
    }));
    allRows.push(...rows);

    if (rows.length < SG_PAGE_SIZE) {
      return { data: allRows, error: null };
    }

    from += SG_PAGE_SIZE;
  }
};

const fetchUsers = async () => {
  const [
    { data: sg_data, error: usersError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    fetchAllStrokesGained(),
    supabase.from("category").select("id, code, name").order("id"),
  ]);

  if (usersError) {
    console.error("Error fetching users:", usersError);
  }

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  }

  return {
    stroakes_gained: sg_data as SG_DataType[] | null,
    categories: (categories as CategoryType[] | null) ?? [],
  };
};

type CategoryRowProps = {
  category: CategoryType;
  onSaved: () => Promise<void>;
};

const CategoryRow = (props: CategoryRowProps) => {
  const [code, setCode] = createSignal(props.category.code);
  const [name, setName] = createSignal(props.category.name);
  const [saving, setSaving] = createSignal(false);
  const [state, setState] = createSignal<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const saveCategory = async () => {
    setState(null);

    const nextCode = code().trim();
    const nextName = name().trim();

    if (!nextCode || !nextName) {
      setState({
        type: "error",
        message: "Code and name are required.",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("category")
      .update({
        code: nextCode,
        name: nextName,
      })
      .eq("id", props.category.id);

    if (error) {
      setState({
        type: "error",
        message: error.message,
      });
      setSaving(false);
      return;
    }

    setState({
      type: "success",
      message: "Category updated.",
    });
    await props.onSaved();
    setSaving(false);
  };

  return (
    <tr class='border-b border-slate-200 odd:bg-white even:bg-slate-50'>
      <td class='px-4 py-3 text-sm text-slate-700'>{props.category.id}</td>
      <td class='px-4 py-3'>
        <input
          type='text'
          value={code()}
          onInput={(e) => setCode(e.currentTarget.value)}
          class='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800'
        />
      </td>
      <td class='px-4 py-3'>
        <input
          type='text'
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          class='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800'
        />
      </td>
      <td class='px-4 py-3'>
        <div class='flex items-center gap-3'>
          <button
            type='button'
            onClick={saveCategory}
            disabled={saving()}
            class='rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60'
          >
            {saving() ? "Saving..." : "Save"}
          </button>
          <Show when={state()}>
            {(messageState) => (
              <span
                class={`text-xs ${
                  messageState().type === "success"
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {messageState().message}
              </span>
            )}
          </Show>
        </div>
      </td>
    </tr>
  );
};

export default function Stokes_expectation() {
  const [sgData, { refetch }] = createResource(fetchUsers);
  const [activeTab, setActiveTab] = createSignal<ActiveTab>("categories");
  const [selectedLieType, setSelectedLieType] = createSignal("all");
  const refreshCategories = async () => {
    await refetch();
  };

  const lieTypes = createMemo(() => {
    const order = ["Tee", "Fairway", "Rough", "Bunker", "Green"];

    const rank = new Map(order.map((value, index) => [value, index]));

    const values = new Set(
      (sgData()?.stroakes_gained ?? []).map((row) => row.lie_type),
    );

    return Array.from(values).sort(
      (a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999),
    );
  });

  const strokesGainedRows = createMemo<StrokesGainedRow[]>(() => {
    const rows = sgData()?.stroakes_gained ?? [];
    const grouped = new Map<string, StrokesGainedRow>();

    for (const row of rows) {
      const key = `${row.lie_type}:${row.min_distance}:${row.max_distance}`;
      const existing = grouped.get(key);

      if (existing) {
        if (row.category?.id != null) {
          existing.byCategoryId[row.category.id] = row.expected_strokes;
        }
        continue;
      }

      const nextRow: StrokesGainedRow = {
        lie_type: row.lie_type,
        min_distance: row.min_distance,
        max_distance: row.max_distance,
        byCategoryId: {},
      };

      if (row.category?.id != null) {
        nextRow.byCategoryId[row.category.id] = row.expected_strokes;
      }

      grouped.set(key, nextRow);
    }

    return Array.from(grouped.values()).filter(
      (row) =>
        selectedLieType() === "all" || row.lie_type === selectedLieType(),
    );
  });

  return (
    <div class='space-y-6'>
      <div class='flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={() => setActiveTab("categories")}
          class={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
            activeTab() === "categories"
              ? "border-cyan-600 bg-cyan-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
          }`}
        >
          Categories
        </button>
        <button
          type='button'
          onClick={() => setActiveTab("strokes-gained")}
          class={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
            activeTab() === "strokes-gained"
              ? "border-cyan-600 bg-cyan-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
          }`}
        >
          Strokes Gained
        </button>
      </div>

      <Show when={activeTab() === "categories"}>
        <div>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            Categories
          </h2>
          <p class='mt-1 text-sm text-slate-500'>
            Update the category code and name values used by the expectations
            data.
          </p>
        </div>

        <div class='overflow-x-auto rounded-xl border border-slate-200'>
          <table class='w-full min-w-160 text-left text-sm text-slate-700'>
            <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
              <tr>
                <th class='px-4 py-3 font-semibold'>ID</th>
                <th class='px-4 py-3 font-semibold'>Code</th>
                <th class='px-4 py-3 font-semibold'>Name</th>
                <th class='px-4 py-3 font-semibold'>Action</th>
              </tr>
            </thead>
            <tbody>
              <For each={sgData()?.categories}>
                {(category) => (
                  <CategoryRow
                    category={category}
                    onSaved={refreshCategories}
                  />
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      <Show when={activeTab() === "strokes-gained"}>
        <div>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            Strokes Gained
          </h2>
          <p class='mt-1 text-sm text-slate-500'>
            Review the strokes gained expectation ranges and linked category
            values.
          </p>
        </div>

        <div class='overflow-x-auto rounded-xl border border-slate-200'>
          <table class='w-full min-w-245 text-left text-sm text-slate-700'>
            <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
              <tr>
                <th class='px-4 py-3 font-semibold'>
                  <div class='flex flex-col gap-2'>
                    <span>Lie Type</span>
                    <select
                      value={selectedLieType()}
                      onChange={(e) =>
                        setSelectedLieType(e.currentTarget.value)
                      }
                      class='rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700'
                    >
                      <option value='all'>All lie types</option>
                      <For each={lieTypes()}>
                        {(lieType) => (
                          <option value={lieType}>{lieType}</option>
                        )}
                      </For>
                    </select>
                  </div>
                </th>
                <th class='px-4 py-3 font-semibold'>Min Distance</th>
                <th class='px-4 py-3 font-semibold'>Max Distance</th>
                <For each={sgData()?.categories}>
                  {(category) => (
                    <th class='px-4 py-3 font-semibold'>{category.code}</th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={strokesGainedRows()}>
                {(row) => (
                  <tr class='border-b border-slate-200 odd:bg-white even:bg-slate-50'>
                    <td class='px-4 py-3'>{row.lie_type}</td>
                    <td class='px-4 py-3'>{row.min_distance}</td>
                    <td class='px-4 py-3'>{row.max_distance}</td>
                    <For each={sgData()?.categories}>
                      {(category) => (
                        <td class='px-4 py-3'>
                          {row.byCategoryId[category.id] ?? ""}
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
}
