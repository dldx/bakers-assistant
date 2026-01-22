<script lang="ts">
  import { Plus, Trash2 } from "lucide-svelte";
  import { fade, slide } from "svelte/transition";
  import { IngredientCategory, type Ingredient } from "$lib/types";
  import { CATEGORY_META } from "$lib/constants";

  let {
    category,
    ingredients,
    percentages,
    icon: Icon,
    allIcons,
    isCookingMode = false,
    onUpdate,
    onRemove,
    onAdd,
  } = $props<{
    category: IngredientCategory;
    ingredients: Ingredient[];
    percentages: Record<string, number>;
    icon: any;
    allIcons: Record<string, any>;
    isCookingMode?: boolean;
    onUpdate: (id: string, updates: Partial<Ingredient>) => void;
    onRemove: (id: string) => void;
    onAdd: () => void;
  }>();

  const meta = $derived(CATEGORY_META[category]);
  let activeMenuId = $state<string | null>(null);
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center pb-2 border-slate-50 border-b">
    <div class="flex items-center space-x-3">
      <div class="p-2 rounded-xl {meta.color.split(' ')[0]}">
        <Icon class="w-4 h-4 {meta.iconColor}" />
      </div>
      <h4
        class="font-black text-[10px] text-slate-800 uppercase tracking-[0.2em]"
      >
        {meta.label}
      </h4>
    </div>
    <button
      onclick={onAdd}
      disabled={isCookingMode}
      class="hover:bg-amber-50 disabled:opacity-30 p-1.5 rounded-lg text-amber-600 transition-colors disabled:cursor-not-allowed"
    >
      <Plus class="w-5 h-5" />
    </button>
  </div>

  <div class="space-y-3 min-h-[40px]">
    {#if ingredients.length === 0}
      <p
        class="px-2 font-medium text-[10px] text-slate-300 italic"
        transition:fade
      >
        No {meta.label.toLowerCase()} added yet...
      </p>
    {:else}
      {#each ingredients as ing (ing.id)}
        <div
          class="group relative flex items-center gap-2 sm:gap-3 {ing.checked &&
            isCookingMode
            ? 'opacity-40'
            : ''}"
          transition:slide={{ axis: "y" }}
        >
          <!-- Cooking Mode: Checkbox -->
          {#if isCookingMode}
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ing.checked}
                onchange={(e) =>
                  onUpdate(ing.id, { checked: e.currentTarget.checked })}
                class="sr-only peer"
              />
              <div
                class="flex justify-center items-center bg-white peer-checked:bg-emerald-500 shadow-sm hover:shadow-md border-2 border-slate-200 peer-checked:border-emerald-500 rounded-lg w-6 h-6 transition-all"
              >
                <svg
                  class="opacity-0 peer-checked:opacity-100 w-4 h-4 text-white transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </label>
          {:else}
            <!-- Category Switcher -->
            <div class="relative">
              <button
                onclick={() =>
                  (activeMenuId = activeMenuId === ing.id ? null : ing.id)}
                class="group/icon flex justify-center items-center bg-white hover:bg-slate-50 shadow-sm p-2 border border-slate-200 hover:border-amber-400 rounded-xl transition-all"
                title="Change Category"
              >
                <Icon class="w-4 h-4 {meta.iconColor}" />
              </button>

              {#if activeMenuId === ing.id}
                <!-- Backdrop -->
                <button
                  class="z-40 fixed inset-0 cursor-default"
                  aria-label="Close menu"
                  onclick={() => (activeMenuId = null)}
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
                        activeMenuId = null;
                      }}
                    >
                      <div
                        class="p-1.5 rounded-lg {catMeta.color.split(' ')[0]}"
                      >
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

          <input
            type="text"
            placeholder={meta.placeholder}
            bind:value={ing.name}
            disabled={isCookingMode}
            oninput={(e) =>
              onUpdate(ing.id, { name: (e.target as HTMLInputElement).value })}
            class="flex-grow bg-slate-50/50 focus:bg-white px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-100 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-500 min-w-[80px] sm:min-w-[120px] font-medium placeholder:text-slate-300 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 {ing.checked &&
              isCookingMode
              ? 'line-through decoration-2 decoration-slate-400'
              : ''}"
            style="transition: text-decoration 0.3s ease;"
          />

          {#if category === IngredientCategory.FLOUR}
            <div class="hidden sm:flex flex-col items-center">
              <label
                class="mb-0.5 font-bold text-[8px] text-slate-300 uppercase tracking-widest"
                >Protein</label
              >
              <div
                class="flex items-center bg-white px-2 py-1 border border-slate-200 rounded-lg h-[34px]"
              >
                <input
                  type="number"
                  placeholder="-"
                  value={ing.proteinContent}
                  disabled={isCookingMode}
                  oninput={(e) =>
                    onUpdate(ing.id, {
                      proteinContent: Number(e.currentTarget.value),
                    })}
                  class="bg-transparent disabled:opacity-60 p-0 border-none focus:ring-0 w-12 font-bold text-slate-600 text-xs text-center disabled:cursor-not-allowed"
                />
                <span class="ml-0.5 font-bold text-[8px] text-slate-400">%</span
                >
              </div>
            </div>
          {:else if category === IngredientCategory.LEAVENING}
            <div class="hidden sm:flex flex-col items-center">
              <label
                class="mb-0.5 font-bold text-[8px] text-slate-300 uppercase tracking-widest"
                >Hydration</label
              >
              <div
                class="flex items-center bg-white px-2 py-1 border border-slate-200 rounded-lg w-fit h-[34px]"
              >
                <input
                  type="number"
                  placeholder="100"
                  value={ing.hydration ?? 100}
                  disabled={isCookingMode}
                  oninput={(e) =>
                    onUpdate(ing.id, {
                      hydration: Number(e.currentTarget.value),
                    })}
                  class="bg-transparent disabled:opacity-60 p-0 border-none focus:ring-0 w-12 font-bold text-slate-600 text-xs text-center disabled:cursor-not-allowed"
                />
                <span class="ml-0.5 font-bold text-[8px] text-slate-400">%</span
                >
              </div>
            </div>
          {:else if category === IngredientCategory.TANGZHONG}
            <div class="hidden sm:flex flex-col items-center">
              <label
                class="mb-0.5 font-bold text-[8px] text-slate-300 uppercase tracking-widest"
                >Ratio 1:</label
              >
              <div
                class="flex items-center bg-white px-2 py-1 border border-slate-200 rounded-lg h-[34px]"
              >
                <input
                  type="number"
                  placeholder="5"
                  value={ing.tangzhongRatio ?? 5}
                  disabled={isCookingMode}
                  oninput={(e) =>
                    onUpdate(ing.id, {
                      tangzhongRatio: Number(e.currentTarget.value),
                    })}
                  class="bg-transparent disabled:opacity-60 p-0 border-none focus:ring-0 w-12 font-bold text-slate-600 text-xs text-center disabled:cursor-not-allowed"
                />
              </div>
            </div>
          {:else if category === IngredientCategory.FAT || category === IngredientCategory.MILK}
            <div class="hidden sm:flex flex-col items-center">
              <label
                class="mb-0.5 font-bold text-[8px] text-slate-300 uppercase tracking-widest"
                >Water</label
              >
              <div
                class="flex items-center bg-white px-2 py-1 border border-slate-200 rounded-lg h-[34px]"
              >
                <input
                  type="number"
                  placeholder={category === IngredientCategory.MILK
                    ? "87"
                    : "0"}
                  value={ing.waterContent ??
                    (category === IngredientCategory.MILK ? 87 : 0)}
                  disabled={isCookingMode}
                  oninput={(e) =>
                    onUpdate(ing.id, {
                      waterContent: Number(e.currentTarget.value),
                    })}
                  class="bg-transparent disabled:opacity-60 p-0 border-none focus:ring-0 w-12 font-bold text-slate-600 text-xs text-center disabled:cursor-not-allowed"
                />
                <span class="ml-0.5 font-bold text-[8px] text-slate-400">%</span
                >
              </div>
            </div>
          {/if}

          <div
            class="flex items-center bg-slate-100 group-focus-within:bg-white px-2 sm:px-3 border border-slate-200 rounded-xl group-focus-within:ring-2 group-focus-within:ring-amber-500 w-fit transition-all {ing.checked &&
              isCookingMode
              ? 'opacity-50'
              : ''}"
            style="transition: opacity 0.3s ease;"
          >
            <input
              type="number"
              bind:value={ing.weight}
              disabled={isCookingMode}
              oninput={(e) =>
                onUpdate(ing.id, {
                  weight: Number((e.target as HTMLInputElement).value),
                })}
              class="bg-transparent py-2 sm:py-2.5 border-none focus:ring-0 w-12 sm:w-16 font-black text-slate-700 text-xs sm:text-sm text-right disabled:cursor-not-allowed disabled:opacity-60 {ing.checked &&
              isCookingMode
                ? 'line-through decoration-2 decoration-slate-400'
                : ''}"
              style="transition: text-decoration 0.3s ease;"
              placeholder="0"
            />
            <span
              class="ml-0.5 sm:ml-1 font-black text-[8px] text-slate-400 sm:text-[10px] uppercase"
              >g</span
            >
          </div>

          <div
            class="hidden sm:block w-10 sm:w-16 text-right {ing.checked &&
              isCookingMode
              ? 'opacity-50'
              : ''}"
            style="transition: opacity 0.3s ease;"
          >
            <span
              class="font-black tabular-nums text-[9px] text-slate-400 sm:text-[10px]"
            >
              {percentages[ing.id]
                ? `${percentages[ing.id].toFixed(1)}%`
                : "0%"}
            </span>
          </div>

          <button
            onclick={() => onRemove(ing.id)}
            disabled={isCookingMode}
            class="hover:bg-red-50 disabled:opacity-30 p-1.5 rounded-lg text-slate-200 hover:text-red-500 transition-colors disabled:cursor-not-allowed"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>
