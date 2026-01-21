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
    onUpdate,
    onRemove,
    onAdd,
  } = $props<{
    category: IngredientCategory;
    ingredients: Ingredient[];
    percentages: Record<string, number>;
    icon: any;
    allIcons: Record<string, any>;
    onUpdate: (id: string, updates: Partial<Ingredient>) => void;
    onRemove: (id: string) => void;
    onAdd: () => void;
  }>();

  const meta = $derived(CATEGORY_META[category]);
  let activeMenuId = $state<string | null>(null);
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between border-b border-slate-50 pb-2">
    <div class="flex items-center space-x-3">
      <div class="p-2 rounded-xl {meta.color.split(' ')[0]}">
        <Icon class="w-4 h-4 {meta.iconColor}" />
      </div>
      <h4
        class="font-black text-slate-800 uppercase tracking-[0.2em] text-[10px]"
      >
        {meta.label}
      </h4>
    </div>
    <button
      onclick={onAdd}
      class="text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors"
    >
      <Plus class="w-5 h-5" />
    </button>
  </div>

  <div class="space-y-3 min-h-[40px]">
    {#if ingredients.length === 0}
      <p
        class="text-[10px] text-slate-300 italic font-medium px-2"
        transition:fade
      >
        No {meta.label.toLowerCase()} added yet...
      </p>
    {:else}
      {#each ingredients as ing (ing.id)}
        <div
          class="flex items-center gap-3 group relative"
          transition:slide={{ axis: "y" }}
        >
          <!-- Category Switcher -->
          <div class="relative">
            <button
              onclick={() =>
                (activeMenuId = activeMenuId === ing.id ? null : ing.id)}
              class="p-2 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center group/icon"
              title="Change Category"
            >
              <Icon class="w-4 h-4 {meta.iconColor}" />
            </button>

            {#if activeMenuId === ing.id}
              <!-- Backdrop -->
              <button
                class="fixed inset-0 z-40 cursor-default"
                aria-label="Close menu"
                onclick={() => (activeMenuId = null)}
              ></button>

              <!-- Dropdown -->
              <div
                class="absolute top-full left-0 mt-2 w-48 max-h-64 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-100 z-50 p-1 grid grid-cols-1"
                transition:slide={{ duration: 150 }}
              >
                {#each Object.values(IngredientCategory) as cat}
                  {@const catMeta = CATEGORY_META[cat]}
                  {@const CatIcon = allIcons[cat]}
                  <button
                    class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left transition-colors rounded-lg w-full"
                    onclick={() => {
                      onUpdate(ing.id, { category: cat });
                      activeMenuId = null;
                    }}
                  >
                    <div class="p-1.5 rounded-lg {catMeta.color.split(' ')[0]}">
                      <CatIcon class="w-3 h-3 {catMeta.iconColor}" />
                    </div>
                    <span class="text-xs font-bold text-slate-700"
                      >{catMeta.label}</span
                    >
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <input
            type="text"
            placeholder={meta.placeholder}
            bind:value={ing.name}
            oninput={(e) =>
              onUpdate(ing.id, { name: (e.target as HTMLInputElement).value })}
            class="flex-grow bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white transition-all placeholder:text-slate-300 min-w-[120px]"
          />

          {#if category === IngredientCategory.FLOUR}
            <div class="hidden sm:flex flex-col items-center">
              <label
                class="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-0.5"
                >Protein</label
              >
              <div
                class="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 h-[34px]"
              >
                <input
                  type="number"
                  placeholder="-"
                  value={ing.proteinContent}
                  oninput={(e) =>
                    onUpdate(ing.id, {
                      proteinContent: Number(e.currentTarget.value),
                    })}
                  class="w-12 text-center text-xs font-bold text-slate-600 bg-transparent border-none p-0 focus:ring-0"
                />
                <span class="text-[8px] text-slate-400 font-bold ml-0.5">%</span
                >
              </div>
            </div>
          {:else if category === IngredientCategory.STARTER}
            <div class="flex flex-col items-center">
              <label
                class="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-0.5"
                >Hydration</label
              >
              <div
                class="flex w-fit items-center bg-white border border-slate-200 rounded-lg px-2 py-1 h-[34px]"
              >
                <input
                  type="number"
                  placeholder="100"
                  value={ing.hydration ?? 100}
                  oninput={(e) =>
                    onUpdate(ing.id, {
                      hydration: Number(e.currentTarget.value),
                    })}
                  class="w-12 text-center text-xs font-bold text-slate-600 bg-transparent border-none p-0 focus:ring-0"
                />
                <span class="text-[8px] text-slate-400 font-bold ml-0.5">%</span
                >
              </div>
            </div>
          {:else if category === IngredientCategory.TANGZHONG}
            <div class="flex flex-col items-center">
              <label
                class="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-0.5"
                >Ratio 1:</label
              >
              <div
                class="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 h-[34px]"
              >
                <input
                  type="number"
                  placeholder="5"
                  value={ing.tangzhongRatio ?? 5}
                  oninput={(e) =>
                    onUpdate(ing.id, {
                      tangzhongRatio: Number(e.currentTarget.value),
                    })}
                  class="w-12 text-center text-xs font-bold text-slate-600 bg-transparent border-none p-0 focus:ring-0"
                />
              </div>
            </div>
          {:else if category === IngredientCategory.FAT || category === IngredientCategory.MILK}
            <div class="flex flex-col items-center">
              <label
                class="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-0.5"
                >Water</label
              >
              <div
                class="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 h-[34px]"
              >
                <input
                  type="number"
                  placeholder={category === IngredientCategory.MILK
                    ? "87"
                    : "0"}
                  value={ing.waterContent ??
                    (category === IngredientCategory.MILK ? 87 : 0)}
                  oninput={(e) =>
                    onUpdate(ing.id, {
                      waterContent: Number(e.currentTarget.value),
                    })}
                  class="w-12 text-center text-xs font-bold text-slate-600 bg-transparent border-none p-0 focus:ring-0"
                />
                <span class="text-[8px] text-slate-400 font-bold ml-0.5">%</span
                >
              </div>
            </div>
          {/if}

          <div
            class="flex items-center w-fit bg-slate-100 border border-slate-200 rounded-xl px-3 group-focus-within:ring-2 group-focus-within:ring-amber-500 group-focus-within:bg-white transition-all"
          >
            <input
              type="number"
              bind:value={ing.weight}
              oninput={(e) =>
                onUpdate(ing.id, {
                  weight: Number((e.target as HTMLInputElement).value),
                })}
              class="w-16 bg-transparent border-none focus:ring-0 text-right py-2.5 text-sm font-black text-slate-700"
              placeholder="0"
            />
            <span class="text-slate-400 text-[10px] font-black uppercase ml-1"
              >g</span
            >
          </div>

          <div class="w-16 text-right">
            <span class="text-[10px] font-black text-slate-400 tabular-nums">
              {percentages[ing.id]
                ? `${percentages[ing.id].toFixed(1)}%`
                : "0%"}
            </span>
          </div>

          <button
            onclick={() => onRemove(ing.id)}
            class="text-slate-200 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>
