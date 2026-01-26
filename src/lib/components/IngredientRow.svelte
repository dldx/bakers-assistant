<script lang="ts">
  import { tick } from "svelte";
  import { Trash2, GripVertical } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import { useSortable } from "@dnd-kit-svelte/svelte/sortable";
  import { IngredientCategory, type Ingredient, type RecipeStage } from "$lib/types";
  import { CATEGORY_META } from "$lib/constants";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import * as Field from "$lib/components/ui/field";
  import { Textarea } from "$lib/components/ui/textarea";
  import { slugify } from "$lib/utils";

  let {
    ingredient: ing,
    percentage,
    isCookingMode = false,
    allIcons,
    onUpdate,
    onRemove,
    index,
    stage,
    onAdd,
  } = $props<{
    ingredient: Ingredient;
    percentage: number;
    isCookingMode?: boolean;
    allIcons: Record<string, any>;
    onUpdate: (id: string, updates: Partial<Ingredient>) => void;
    onRemove: (id: string) => void;
    index: number;
    stage?: RecipeStage;
    onAdd: () => void;
  }>();

  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id: () => ing.id,
    index: () => index,
    disabled: () => isCookingMode,
    type: "item",
    accept: "item",
    group: () => `${stage?.id || "root"}-${ing.category}`,
    data: () => ({ group: `${stage?.id || "root"}-${ing.category}` }),
  });

  const meta = $derived(
    CATEGORY_META[ing.category as keyof typeof CATEGORY_META],
  );
  const Icon = $derived(allIcons[ing.category as keyof typeof allIcons]);
  let isMenuOpen = $state(false);

  function handleKeyDown(e: KeyboardEvent) {
    if (isCookingMode) return;

    const target = e.currentTarget as HTMLTextAreaElement;
    const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
    const isAtEnd =
      target.selectionStart === target.value.length &&
      target.selectionEnd === target.value.length;

    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      onAdd();
      tick().then(() => {
        const inputs = Array.from(
          document.querySelectorAll(".js-ingredient-name"),
        ) as HTMLTextAreaElement[];
        const index = inputs.indexOf(target);
        if (index !== -1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });
    } else if (e.key === "Backspace" && e.shiftKey) {
      e.preventDefault();
      const inputs = Array.from(
        document.querySelectorAll(".js-ingredient-name"),
      ) as HTMLTextAreaElement[];
      const index = inputs.indexOf(target);
      onRemove(ing.id);
      if (index > 0) {
        tick().then(() => {
          const remainingInputs = Array.from(
            document.querySelectorAll(".js-ingredient-name"),
          ) as HTMLTextAreaElement[];
          const nextFocusIndex = Math.min(index - 1, remainingInputs.length - 1);
          if (nextFocusIndex >= 0) {
            remainingInputs[nextFocusIndex].focus();
          }
        });
      }
    } else if (e.key === "ArrowDown" && isAtEnd) {
      const inputs = Array.from(
        document.querySelectorAll(".js-ingredient-name"),
      ) as HTMLTextAreaElement[];
      const index = inputs.indexOf(target);
      if (index !== -1 && index < inputs.length - 1) {
        e.preventDefault();
        inputs[index + 1].focus();
      }
    } else if (e.key === "ArrowUp" && isAtStart) {
      const inputs = Array.from(
        document.querySelectorAll(".js-ingredient-name"),
      ) as HTMLTextAreaElement[];
      const index = inputs.indexOf(target);
      if (index > 0) {
        e.preventDefault();
        inputs[index - 1].focus();
      }
    }
  }
</script>

<div
  {@attach ref}
  role="button"
  tabindex={isCookingMode ? 0 : -1}
  onclick={() => isCookingMode && onUpdate(ing.id, { checked: !ing.checked })}
  onkeydown={(e) => isCookingMode && (e.key === " " || e.key === "Enter") && onUpdate(ing.id, { checked: !ing.checked })}
  class="target:bg-amber-100 target:ring-2 target:ring-amber-200 target:rounded-none transition-all group relative flex items-center gap-2 sm:gap-3 py-1.5 {isCookingMode ? 'cursor-pointer select-none' : ''} {ing.checked &&
  isCookingMode
    ? 'opacity-40'
    : ''} {isDragging.current ? 'opacity-0 pointer-events-none' : ''} {isDropTarget.current ? 'bg-amber-50/50 rounded-xl' : ''}"
  transition:slide={{ axis: "y" }}
  id={slugify((stage ? stage?.name : "") + "-" + ing.name)}
  style="scroll-margin-top: 5rem;"
>
  <!-- Drag Handle Indicator -->
  {#if !isCookingMode}
    <div
      {@attach handleRef}
      class="flex items-center opacity-0 group-hover:opacity-100 h-10 text-slate-300 transition-opacity cursor-grab active:cursor-grabbing"
    >
      <GripVertical class="w-3 sm:w-4 h-3 sm:h-4" />
    </div>
  {/if}

  <!-- Cooking Mode: Checkbox -->
  {#if isCookingMode}
    <div class="flex items-center" onclick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={ing.checked}
        onCheckedChange={(v) => onUpdate(ing.id, { checked: v })}
      />
    </div>
  {:else}
    <!-- Category Switcher -->
    <div class="relative flex items-center h-10">
      <button
        onclick={() => (isMenuOpen = !isMenuOpen)}
        class="group/icon flex justify-center items-center bg-white hover:bg-slate-50 shadow-sm p-1.5 sm:p-2 border border-slate-200 hover:border-amber-400 rounded-lg sm:rounded-xl transition-all"
        title="Change Category"
      >
        <Icon class="w-3.5 h-3.5 sm:w-4 sm:h-4 {meta.iconColor}" />
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

  <Field.Field class="min-w-0 grow" orientation="horizontal">
    <Textarea
      rows={1}
      placeholder={meta.placeholder}
      bind:value={ing.name}
      disabled={isCookingMode}
      spellcheck={isCookingMode ? "false" : "true"}
      oninput={(e) =>
        onUpdate(ing.id, { name: (e.target as HTMLInputElement).value })}
      onkeydown={handleKeyDown}
      class="js-ingredient-name resize-none grow bg-slate-50/50 disabled:opacity-100 focus:bg-white min-h-0 py-2 px-2 sm:px-3 border-slate-100 focus:border-amber-500 rounded-lg sm:rounded-xl focus-visible:ring-amber-500 placeholder:text-slate-300 text-xs sm:text-sm transition-all text-black {ing.checked &&
      isCookingMode
        ? 'line-through decoration-2 decoration-slate-400 font-bold border-0 bg-transparent shadow-none min-h-0 py-1 pointer-events-none' :
        isCookingMode ? 'font-bold border-0 bg-transparent shadow-none min-h-0 py-1 pointer-events-none'
        : 'font-medium'}"
      style="transition: text-decoration 0.3s ease;"
    />
  </Field.Field>

  {#if ing.category === IngredientCategory.FLOUR && !isCookingMode}
    <Field.Field class="relative flex flex-col items-center gap-0.5 w-fit">
      <Field.Label
        for="protein-{ing.id}"
        class="-top-3.5 left-1/2 absolute font-extrabold text-[7px] text-slate-400 sm:text-[8px] uppercase tracking-widest -translate-x-1/2"
        >Prot.</Field.Label
      >
      <div
        class="flex items-center bg-white shadow-xs px-1 sm:px-2 border border-slate-200 rounded-lg w-fit h-7"
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
          class="bg-transparent disabled:opacity-100 shadow-none p-0 border-none focus:ring-0 w-[4ch] sm:w-[5ch] h-auto font-black text-[10px] text-slate-700 sm:text-xs text-center number-input-no-spin"
        />
        <span class="ml-0.5 font-mono font-bold text-[8px] text-slate-400 sm:text-[9px]">%</span>
      </div>
    </Field.Field>
  {:else if ing.category === IngredientCategory.LEAVENING && !isCookingMode}
    <Field.Field class="relative flex flex-col items-center gap-0.5 w-fit">
      <Field.Label
        for="hydration-{ing.id}"
        class="-top-3.5 left-1/2 absolute font-extrabold text-[7px] text-slate-400 sm:text-[8px] uppercase tracking-widest -translate-x-1/2"
        >Hydr.</Field.Label
      >
      <div
        class="flex items-center bg-white shadow-xs px-1 sm:px-2 border border-slate-200 rounded-lg w-fit h-7"
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
          class="bg-transparent disabled:opacity-100 shadow-none p-0 border-none focus:ring-0 w-[4ch] sm:w-[5ch] h-auto font-black text-[10px] text-slate-700 sm:text-xs text-center number-input-no-spin"
        />
        <span class="ml-0.5 font-mono font-bold text-[8px] text-slate-400 sm:text-[9px]">%</span>
      </div>
    </Field.Field>
  {:else if ing.category === IngredientCategory.TANGZHONG && !isCookingMode}
    <Field.Field class="relative flex flex-col items-center gap-0.5 w-fit">
      <Field.Label
        for="ratio-{ing.id}"
        class="-top-3.5 left-1/2 absolute font-extrabold text-[7px] text-slate-400 sm:text-[8px] uppercase tracking-widest -translate-x-1/2"
        >Ratio</Field.Label
      >
      <div
        class="flex items-center bg-white shadow-xs px-1 sm:px-2 border border-slate-200 rounded-lg w-fit h-7"
      >
        <span class="font-mono font-bold text-[8px] text-slate-400 sm:text-[9px]">1:</span>
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
          class="bg-transparent disabled:opacity-100 shadow-none p-0 border-none focus:ring-0 w-[3ch] sm:w-[5ch] h-auto font-black text-[10px] text-slate-700 sm:text-xs text-center number-input-no-spin"
        />
      </div>
    </Field.Field>
  {:else if (ing.category === IngredientCategory.FAT || ing.category === IngredientCategory.MILK || ing.category === IngredientCategory.EGG) && !isCookingMode}
    <Field.Field class="relative flex flex-col items-center gap-0.5 w-fit">
      <Field.Label
        for="water-{ing.id}"
        class="-top-3.5 left-1/2 absolute font-extrabold text-[7px] text-slate-400 sm:text-[8px] uppercase tracking-widest -translate-x-1/2"
        >Water</Field.Label
      >
      <div
        class="flex items-center bg-white shadow-xs px-1 sm:px-2 border border-slate-200 rounded-lg w-fit h-7"
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
          class="bg-transparent disabled:opacity-100 shadow-none p-0 border-none focus:ring-0 w-[3ch] sm:w-8 h-auto font-black text-[10px] text-slate-700 sm:text-xs text-center number-input-no-spin"
        />
        <span class="ml-0.5 font-mono font-bold text-[8px] text-slate-400 sm:text-[9px]">%</span>
      </div>
    </Field.Field>
  {/if}

  <Field.Field class="w-fit" orientation="horizontal">
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
        value={Number(ing.weight.toFixed(1))}
        disabled={isCookingMode}
        oninput={(e) =>
          onUpdate(ing.id, {
            weight: Number((e.target as HTMLInputElement).value),
          })}
        class="bg-transparent disabled:opacity-100 number-input-no-spin {isCookingMode ? 'h-auto py-1 pointer-events-none' : 'h-10'} border-none w-[5ch] sm:w-[6ch] p-0 font-black text-slate-700 text-xs sm:text-base text-right shadow-none {ing.checked &&
        isCookingMode
          ? 'line-through decoration-2 decoration-slate-400'
          : ''}"
        style="transition: text-decoration 0.3s ease;"
        placeholder="0"
      />
      <span
        class="ml-0.5 sm:ml-1 font-black text-[9px] sm:text-[10px] uppercase"
        >g</span
      >
    </div>
  </Field.Field>

  <div
    class="flex items-center justify-end w-10 sm:w-16 h-10 text-right {isCookingMode ? 'hidden' : 'block'} {ing.checked && isCookingMode
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
    class="disabled:hidden flex justify-center items-center hover:bg-red-50 p-1 sm:p-1.5 rounded-sm sm:rounded-lg w-10 h-10 text-slate-200 hover:text-red-500 transition-colors disabled:cursor-not-allowed"
  >
    <Trash2 class="w-3.5 sm:w-4 h-3.5 sm:h-4" />
  </button>
</div>
