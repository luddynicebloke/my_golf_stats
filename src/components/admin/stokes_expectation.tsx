import {
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

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

type StrokesExpectationRpcRow = {
  categories: unknown;
  strokes_gained: unknown;
};

type StrokesGainedRow = {
  lie_type: string;
  min_distance: number;
  max_distance: number;
  byCategoryId: Record<
    number,
    {
      id: number;
      expected_strokes: number;
    }
  >;
};

const tabOptions = ["categories", "strokes-gained"] as const;
type ActiveTab = (typeof tabOptions)[number];

const isCategoryArray = (value: unknown): value is CategoryType[] =>
  Array.isArray(value);

const isStrokesGainedArray = (value: unknown): value is SG_DataType[] =>
  Array.isArray(value);

const fetchCategories = async () => {
  const { data, error } = await supabase
    .from("category")
    .select("id, code, name")
    .order("id");

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return ((data ?? []) as CategoryType[]).map((category) => ({
    id: Number(category.id),
    code: category.code,
    name: category.name,
  }));
};

const fetchStrokesExpectationData = async () => {
  const { data, error } = await supabase
    .rpc("get_strokes_expectation_data")
    .single<StrokesExpectationRpcRow>();

  if (error) {
    console.error("Error fetching strokes expectation data:", error);
    return {
      categories: [] as CategoryType[],
      strokesGained: [] as SG_DataType[],
    };
  }

  return {
    categories: isCategoryArray(data?.categories)
      ? data.categories.map((category) => ({
          id: Number(category.id),
          code: category.code,
          name: category.name,
        }))
      : [],
    strokesGained: isStrokesGainedArray(data?.strokes_gained)
      ? data.strokes_gained.map((row) => ({
          id: Number(row.id),
          min_distance: Number(row.min_distance),
          max_distance: Number(row.max_distance),
          expected_strokes: Number(row.expected_strokes),
          lie_type: row.lie_type,
          category: row.category
            ? {
                id: Number(row.category.id),
                code: row.category.code,
                name: row.category.name,
              }
            : null,
        }))
      : [],
  };
};

type CategoryRowProps = {
  category: CategoryType;
  onSaved: () => Promise<void>;
};

const CategoryRow = (props: CategoryRowProps) => {
  const [t] = useTransContext();
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
        message: t("admin.strokesExpectation.codeNameRequired"),
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
      message: t("admin.strokesExpectation.categoryUpdated"),
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
            {saving() ? t("common.saving") : t("common.save")}
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

type StrokesGainedCellProps = {
  cell:
    | {
        id: number;
        expected_strokes: number;
      }
    | undefined;
};

const StrokesGainedCell = (props: StrokesGainedCellProps) => {
  const [savedValue, setSavedValue] = createSignal(
    props.cell ? String(props.cell.expected_strokes) : "",
  );
  const [value, setValue] = createSignal(savedValue());
  const [saving, setSaving] = createSignal(false);
  const [flashSuccess, setFlashSuccess] = createSignal(false);
  const [error, setError] = createSignal(false);
  let flashTimeout: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (flashTimeout) {
      clearTimeout(flashTimeout);
    }
  });

  const saveOnBlur = async () => {
    const cell = props.cell;
    if (!cell) return;

    const nextValue = value().trim();
    if (nextValue === savedValue()) {
      setError(false);
      return;
    }

    const parsed = Number(nextValue);
    if (nextValue === "" || Number.isNaN(parsed)) {
      setValue(savedValue());
      setError(true);
      return;
    }

    setSaving(true);
    setError(false);
    const { error: updateError } = await supabase
      .from("sg_expectation_yds")
      .update({ expected_strokes: parsed })
      .eq("id", cell.id);

    setSaving(false);

    if (updateError) {
      setValue(savedValue());
      setError(true);
      return;
    }

    setSavedValue(nextValue);
    setValue(nextValue);
    setFlashSuccess(true);
    flashTimeout = setTimeout(() => setFlashSuccess(false), 900);
  };

  if (!props.cell) {
    return <td class='px-2 py-2 text-center text-sm text-slate-300'>-</td>;
  }

  return (
    <td class='px-2 py-2 text-center'>
      <input
        type='number'
        step='any'
        value={value()}
        onInput={(e) => setValue(e.currentTarget.value)}
        onBlur={() => void saveOnBlur()}
        class={`mx-auto block w-14 rounded-md border px-2 py-1 text-center text-sm transition ${
          flashSuccess()
            ? "border-emerald-400 bg-emerald-100 text-emerald-900"
            : error()
              ? "border-rose-300 bg-rose-50 text-rose-900"
              : "border-slate-300 bg-white text-slate-800"
        } ${saving() ? "opacity-70" : ""}`}
      />
    </td>
  );
};

export default function Stokes_expectation() {
  const [t] = useTransContext();
  const [activeTab, setActiveTab] = createSignal<ActiveTab>("categories");
  const [selectedLieType, setSelectedLieType] = createSignal("all");
  const [categories, { refetch: refetchCategories }] =
    createResource(fetchCategories);
  const [strokesExpectation, { refetch: refetchStrokesExpectation }] =
    createResource(
      () => (activeTab() === "strokes-gained" ? "strokes-gained" : null),
      async () => fetchStrokesExpectationData(),
    );

  const refreshCategories = async () => {
    await refetchCategories();
    if (strokesExpectation.state === "ready") {
      await refetchStrokesExpectation();
    }
  };

  const displayCategories = createMemo(() => {
    if (activeTab() === "strokes-gained") {
      return strokesExpectation()?.categories ?? [];
    }

    return categories() ?? [];
  });

  const lieTypes = createMemo(() => {
    const order = ["Tee", "Fairway", "Rough", "Bunker", "Green"];
    const rank = new Map(order.map((value, index) => [value, index]));
    const values = new Set(
      (strokesExpectation()?.strokesGained ?? []).map((row) => row.lie_type),
    );

    return Array.from(values).sort(
      (a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999),
    );
  });

  const strokesGainedRows = createMemo<StrokesGainedRow[]>(() => {
    const rows = strokesExpectation()?.strokesGained ?? [];
    const grouped = new Map<string, StrokesGainedRow>();

    for (const row of rows) {
      const key = `${row.lie_type}:${row.min_distance}:${row.max_distance}`;
      const existing = grouped.get(key);

      if (existing) {
        if (row.category?.id != null) {
          existing.byCategoryId[row.category.id] = {
            id: row.id,
            expected_strokes: row.expected_strokes,
          };
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
        nextRow.byCategoryId[row.category.id] = {
          id: row.id,
          expected_strokes: row.expected_strokes,
        };
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
          {t("admin.strokesExpectation.categories")}
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
          {t("admin.strokesExpectation.strokesGainedTab")}
        </button>
      </div>

      <Show when={activeTab() === "categories"}>
        <div>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            {t("admin.strokesExpectation.categories")}
          </h2>
          <p class='mt-1 text-sm text-slate-500'>
            {t("admin.strokesExpectation.categoriesDescription")}
          </p>
        </div>

        <Show
          when={!categories.loading}
          fallback={
            <div class='text-sm text-slate-500'>
              {t("admin.strokesExpectation.loadingCategories")}
            </div>
          }
        >
          <div class='overflow-x-auto rounded-xl border border-slate-200'>
            <table class='w-full min-w-160 text-left text-sm text-slate-700'>
              <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
                <tr>
                  <th class='px-4 py-3 font-semibold'>ID</th>
                  <th class='px-4 py-3 font-semibold'>
                    {t("admin.strokesExpectation.code")}
                  </th>
                  <th class='px-4 py-3 font-semibold'>
                    {t("admin.courses.name")}
                  </th>
                  <th class='px-4 py-3 font-semibold'>
                    {t("common.action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={displayCategories()}>
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
      </Show>

      <Show when={activeTab() === "strokes-gained"}>
        <div>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            {t("admin.strokesExpectation.strokesGained")}
          </h2>
          <p class='mt-1 text-sm text-slate-500'>
            {t("admin.strokesExpectation.strokesGainedDescription")}
          </p>
        </div>

        <Show
          when={!strokesExpectation.loading}
          fallback={
            <div class='text-sm text-slate-500'>
              {t("admin.strokesExpectation.loadingMatrix")}
            </div>
          }
        >
          <div class='overflow-x-auto rounded-xl border border-slate-200'>
            <table class='w-full table-fixed text-left text-sm text-slate-700'>
              <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
                <tr>
                  <th class='w-20 px-2 py-2 font-semibold'>
                    <div class='flex flex-col gap-2'>
                      <span>{t("roundShots.lieType")}</span>
                      <select
                        value={selectedLieType()}
                        onChange={(e) =>
                          setSelectedLieType(e.currentTarget.value)
                        }
                        class='w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-normal text-slate-700'
                      >
                        <option value='all'>
                          {t("admin.strokesExpectation.allLieTypes")}
                        </option>
                        <For each={lieTypes()}>
                          {(lieType) => (
                            <option value={lieType}>
                              {t(`lieTypes.${lieType}`, {
                                defaultValue: lieType,
                              })}
                            </option>
                          )}
                        </For>
                      </select>
                    </div>
                  </th>
                  <th class='w-10 px-1 py-2 text-center font-semibold'>
                    <span class='block'>{t("admin.strokesExpectation.min")}</span>
                    <span class='block text-xs font-normal text-slate-500'>
                      {t("admin.strokesExpectation.dist")}
                    </span>
                  </th>
                  <th class='w-10 px-1 py-2 text-center font-semibold'>
                    <span class='block'>{t("admin.strokesExpectation.max")}</span>
                    <span class='block text-xs font-normal text-slate-500'>
                      {t("admin.strokesExpectation.dist")}
                    </span>
                  </th>
                  <For each={displayCategories()}>
                    {(category) => (
                      <th class='w-18 px-2 py-2 text-center font-semibold'>
                        {category.code}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={strokesGainedRows()}>
                  {(row) => (
                    <tr class='border-b border-slate-200 odd:bg-white even:bg-slate-50'>
                      <td class='px-2 py-2'>
                        {t(`lieTypes.${row.lie_type}`, {
                          defaultValue: row.lie_type,
                        })}
                      </td>
                      <td class='px-2 py-2 text-center'>{row.min_distance}</td>
                      <td class='px-2 py-2 text-center'>{row.max_distance}</td>
                      <For each={displayCategories()}>
                        {(category) => (
                          <StrokesGainedCell
                            cell={row.byCategoryId[category.id]}
                          />
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Show>
    </div>
  );
}
