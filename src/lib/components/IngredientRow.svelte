<script lang="ts">
  import { Trash2, GripVertical } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import { IngredientCategory, type Ingredient } from "$lib/types";
  import { CATEGORY_META } from "$lib/constants";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import * as Field from "$lib/components/ui/field";

  let {
    ingredient: ing,
    percentage,
    isCookingMode = false,
    allIcons,
    onUpdate,
    onRemove,
  } = $props<{
    ingredient: Ingredient;
    percentage: number;
    isCookingMode?: boolean;
    allIcons: Record<string, any>;
    onUpdate: (id: string, updates: Partial<Ingredient>) => void;
    onRemove: (id: string) => void;
  }>();

  const meta = $derived(CATEGORY_META[ing.category as keyof typeof CATEGORY_META]);
  const Icon = $derived(allIcons[ing.category as keyof typeof allIcons]);
  let isMenuOpen = $state(false);
</script>

<div
  class="group relative flex items-center gap-2 sm:gap-3 {ing.checked &&
  isCookingMode
    ? 'opacity-40'
    : ''}"
  transition:slide={{ axis: "y" }}
>
  <!-- Drag Handle Indicator -->
  {#if !isCookingMode}
    <div class="flex items-center opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity cursor-grab active:cursor-grabbing">
      <GripVertical class="w-4 h-4" />
    </div>
  {/if}

  <!-- Cooking Mode: Checkbox -->
  {#if isCookingMode}
    <div class="flex items-center">
      <Checkbox
        checked={ing.checked}
        onCheckedChange={(v) => onUpdate(ing.id, { checked: v })}
      />
    </div>
  {:else}
    <!-- Category Switcher -->
    <div class="relative">
      <button
        onclick={() => (isMenuOpen = !isMenuOpen)}
        class="group/icon flex justify-center items-center bg-white hover:bg-slate-50 shadow-sm p-2 border border-slate-200 hover:border-amber-400 rounded-xl transition-all"
        title="Change Category"
      >
        <Icon class="w-4 h-4 {meta.iconColor}" />
      </button>

      {#if isMenuOpen}
        <!-- Backdrop -->
        <button
          class="z-40 fixed inset-0 cursor-default"
          aria-label="Close menu"
          onclick={() => (isMenuOpen = false)}
        ></button>

        <!-- Dropdown -->
        <div
          class="top-full left-0 z-50 absolute grid grid-cols-1 bg-white shadow-2xl mt-2 p-1 border border-slate-100 rounded-xl w-48 max-h-64 overflow-y-auto"
          transition:slide={{ duration: 150 }}
        >
          {#each Object.values(IngredientCategory) as cat}
            {@const catMeta = CATEGORY_META[cat]}
            {@const CatIcon = allIcons[cat]}
            <button
              class="flex items-center gap-3 hover:bg-slate-50 px-3 py-2 rounded-lg w-full text-left transition-colors"
              onclick={() => {
                onUpdate(ing.id, { category: cat });
                isMenuOpen = false;
              }}
            >
              <div class="p-1.5 rounded-lg {catMeta.color.split(' ')[0]}">
                <CatIcon class="w-3 h-3 {catMeta.iconColor}" />
              </div>
              <span class="font-bold text-slate-700 text-xs"
                >{catMeta.label}</span
              >
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <Field.Field class="min-w-30 grow">
    <Input
      type="text"
      placeholder={meta.placeholder}
      bind:value={ing.name}
      disabled={isCookingMode}
      oninput={(e) =>
        onUpdate(ing.id, { name: (e.target as HTMLInputElement).value })}
      class="grow bg-slate-50/50 disabled:opacity-100  focus:bg-white h-10 px-3 border-slate-100 focus:border-amber-500 rounded-xl focus-visible:ring-amber-500 placeholder:text-slate-300 text-sm transition-all text-black {ing.checked &&
      isCookingMode
        ? 'line-through decoration-2 decoration-slate-400 font-bold  border-0 bg-transparent shadow-none' :
        isCookingMode ? ' font-bold border-0 bg-transparent shadow-none'
        : 'font-medium'}"
      style="transition: text-decoration 0.3s ease;"
    />
  </Field.Field>

  {#if ing.category === IngredientCategory.FLOUR}
    <Field.Field class="hidden sm:flex flex-col items-center gap-0.5 w-fit">
      <Field.Label
        for="protein-{ing.id}"
        class="font-extrabold text-[8px] text-slate-400 uppercase tracking-widest"
        >Protein</Field.Label
      >
      <div
        class="flex items-center bg-white shadow-xs px-2 border border-slate-200 rounded-lg w-fit h-fit"
      >
        <Input
          id="protein-{ing.id}"
          type="number"
          placeholder="-"
          value={ing.proteinContent}
          disabled={isCookingMode}
          oninput={(e) =>
            onUpdate(ing.id, {
              proteinContent: Number(e.currentTarget.value),
            })}
          class="bg-transparent disabled:opacity-100 shadow-none p-0 border-none focus:ring-0 w-[5ch] h-auto font-black text-slate-700 text-xs text-center number-input-no-spin"
        />
        <span class="ml-0.5 font-mono font-bold text-[9px] text-slate-400">%</span>
      </div>
    </Field.Field>
  {:else if ing.category === IngredientCategory.LEAVENING}
    <Field.Field class="hidden sm:flex flex-col items-center gap-0.5 w-fit">
      <Field.Label
        for="hydration-{ing.id}"
        class="font-extrabold text-[8px] text-slate-400 uppercase tracking-widest"
        >Hydration</Field.Label
      >
      <div
        class="flex items-center bg-white shadow-xs px-2 border border-slate-200 rounded-lg w-fit h-fit"
      >
        <Input
          id="hydration-{ing.id}"
          type="number"
          placeholder="100"
          value={ing.hydration ?? 100}
          disabled={isCookingMode}
          oninput={(e) =>
            onUpdate(ing.id, {
              hydration: Number(e.currentTarget.value),
            })}
          class="bg-transparent disabled:opacity-100 shadow-none p-0 border-none focus:ring-0 w-[5ch] h-auto font-black text-slate-700 text-xs text-center number-input-no-spin"
        />
        <span class="ml-0.5 font-mono font-bold text-[9px] text-slate-400">%</span>
      </div>
    </Field.Field>
  {:else if ing.category === IngredientCategory.TANGZHONG}
    <Field.Field class="hidden sm:flex flex-col items-center gap-0.5 w-fit">
      <Field.Label
        for="ratio-{ing.id}"
        class="font-extrabold text-[8px] text-slate-400 uppercase tracking-widest"
        >Ratio 1:</Field.Label
      >
      <div
        class="flex items-center bg-white shadow-xs px-2 border border-slate-200 rounded-lg w-fit h-fit"
      >
        <Input
          id="ratio-{ing.id}"
          type="number"
          placeholder="5"
          value={ing.tangzhongRatio ?? 5}
          disabled={isCookingMode}
          oninput={(e) =>
            onUpdate(ing.id, {
              tangzhongRatio: Number(e.currentTarget.value),
            })}
          class="bg-transparent disabled:opacity-100 shadow-none p-0 border-none focus:ring-0 w-[5ch] h-auto font-black text-slate-700 text-xs text-center number-input-no-spin"
        />
      </div>
    </Field.Field>
  {:else if ing.category === IngredientCategory.FAT || ing.category === IngredientCategory.MILK}
    <Field.Field class="hidden sm:flex flex-col items-center gap-0.5 w-fit">
      <Field.Label
        for="water-{ing.id}"
        class="font-extrabold text-[8px] text-slate-400 uppercase tracking-widest"
        >Water</Field.Label
      >
      <div
        class="flex items-center bg-white shadow-xs px-2 border border-slate-200 rounded-lg w-fit h-fit"
      >
        <Input
          id="water-{ing.id}"
          type="number"
          placeholder={ing.category === IngredientCategory.MILK ? "87" : "0"}
          value={ing.waterContent ??
            (ing.category === IngredientCategory.MILK ? 87 : 0)}
          disabled={isCookingMode}
          oninput={(e) =>
            onUpdate(ing.id, {
              waterContent: Number(e.currentTarget.value),
            })}
          class="bg-transparent disabled:opacity-100 shadow-none p-0 border-none focus:ring-0 w-8 h-auto font-black text-slate-700 text-xs text-center number-input-no-spin"
        />
        <span class="ml-0.5 font-mono font-bold text-[9px] text-slate-400">%</span>
      </div>
    </Field.Field>
  {/if}

  <Field.Field class="w-fit">
    <Field.Label for="weight-{ing.id}" class="sr-only">Weight</Field.Label>
    <div
      class="flex items-center rounded-xl transition-all {ing.checked &&
      isCookingMode
        ? 'opacity-100'
        : ''}"
      style="transition: opacity 0.3s ease;"
    >
      <Input
        id="weight-{ing.id}"
        type="number"
        bind:value={ing.weight}
        disabled={isCookingMode}
        oninput={(e) =>
          onUpdate(ing.id, {
            weight: Number((e.target as HTMLInputElement).value),
          })}
        class="bg-transparent disabled:opacity-100 number-input-no-spin h-10 border-none w-[6ch] p-0 font-black text-slate-700 text-xs sm:text-base text-right shadow-none {ing.checked &&
        isCookingMode
          ? 'line-through decoration-2 decoration-slate-400'
          : ''}"
        style="transition: text-decoration 0.3s ease;"
        placeholder="0"
      />
      <span
        class="ml-1 font-black text-[10px] uppercase"
        >g</span
      >
    </div>
  </Field.Field>

  <div
    class="hidden sm:block w-10 sm:w-16 text-right {ing.checked && isCookingMode
      ? 'opacity-50'
      : ''}"
    style="transition: opacity 0.3s ease;"
  >
    <span
      class="font-black tabular-nums text-[9px] text-slate-400 sm:text-[10px]"
    >
      {percentage ? `${percentage.toFixed(1)}%` : "0%"}
    </span>
  </div>

  <button
    onclick={() => onRemove(ing.id)}
    disabled={isCookingMode}
    class="disabled:hidden hover:bg-red-50 p-1.5 rounded-lg text-slate-200 hover:text-red-500 transition-colors disabled:cursor-not-allowed"
  >
    <Trash2 class="w-4 h-4" />
  </button>
</div>