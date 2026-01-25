<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { Plus, PenLine, Copy, Trash2, BookOpen, Download, Upload, Dices, Share2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-svelte";
  import { IngredientCategory, type Recipe, type Ingredient } from "$lib/types";
  import { calculateRecipeStats } from "$lib/calculations";
  import { GlassWater, Zap, Save } from "lucide-svelte";
  import * as InputGroup from "$lib/components/ui/input-group";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Tooltip from "$lib/components/ui/tooltip";

  let {
    savedRecipes,
    syncKey,
    onLoadRecipe,
    onRemixRecipe,
    onDeleteRecipe,
    onShareRecipe,
    onShareSyncKey,
    onStartNewRecipe,
    onUpdateSyncKey,
    onExportVault,
    onImportVault,
  } = $props<{
    savedRecipes: Recipe[];
    syncKey: string;
    onLoadRecipe: (recipe: Recipe) => void;
    onRemixRecipe: (recipe: Recipe) => void;
    onDeleteRecipe: (id: number) => void;
    onShareRecipe: (recipe: Recipe) => void;
    onShareSyncKey: () => void;
    onStartNewRecipe: () => void;
    onUpdateSyncKey: (key: string) => void;
    onExportVault: () => void;
    onImportVault: (file: File) => void;
  }>();

  let tempSyncKey = $state("");
  let fileInput: HTMLInputElement;

  let searchQuery = $state("");
  let sortBy = $state<"date" | "name" | "hydration" | "sugar">("date");
  let sortOrder = $state<"asc" | "desc">("desc");

  const SORT_LABELS = {
    date: "Date Updated",
    name: "Alphabetical",
    hydration: "Hydration %",
    sugar: "Sugar %",
  };

  const SORT_LABELS_SHORT = {
    date: "Date",
    name: "A-Z",
    hydration: "Hydration",
    sugar: "Sugar",
  };

  let filteredRecipes = $derived.by(() => {
    let result = [...savedRecipes].filter((recipe: Recipe) => {
      const nameMatch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
      const ingredientMatch = recipe.ingredients.some((ing: Ingredient) =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      return nameMatch || ingredientMatch;
    });

    result.sort((a: Recipe, b: Recipe) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "date") {
        comparison = a.updatedAt - b.updatedAt;
      } else if (sortBy === "hydration") {
        const hA = calculateRecipeStats(a.ingredients, a.portions || 1, a.stages || []).hydration;
        const hB = calculateRecipeStats(b.ingredients, b.portions || 1, b.stages || []).hydration;
        comparison = hA - hB;
      } else if (sortBy === "sugar") {
        const getSugar = (r: Recipe) => {
          const stats = calculateRecipeStats(r.ingredients, r.portions || 1, r.stages || []);
          return r.ingredients
            .filter((i: Ingredient) => i.category === IngredientCategory.SUGAR)
            .reduce((sum: number, i: Ingredient) => sum + (stats.ingredientPercentages[i.id] || 0), 0);
        };
        comparison = getSugar(a) - getSugar(b);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  });

  $effect(() => {
    tempSyncKey = syncKey;
  });

  function generateKey() {
    const chars = "abcdefghijklmnopqrstuvwxyz1234567890";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    tempSyncKey = result;
  }
</script>

<div class="mx-auto py-4 max-w-4xl" in:fade>
  <div class="flex md:flex-row flex-col justify-between md:items-center gap-6 mb-12 p-4 sm:p-4 pt-0">
    <div class="flex-1">
      <h2 class="mb-2 font-[Lilita_One] font-normal text-slate-900 text-3xl sm:text-4xl">
        The Recipe Vault
      </h2>
      <p class="font-medium text-slate-500">
        Your personal collection of artisanal formulas.
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-3 sm:gap-4">
      <div class="group relative">
        <input
          type="text"
          placeholder="Sync Key (e.g. secret123)"
          bind:value={tempSyncKey}
          onkeydown={(e) => e.key === "Enter" && onUpdateSyncKey(tempSyncKey)}
          class="bg-slate-100 hover:bg-slate-200 focus:bg-white px-4 py-3 rounded-2xl outline-hidden focus:ring-2 focus:ring-sky-500 w-full sm:w-64 font-bold placeholder:font-bold text-slate-700 text-sm transition-all"
        />
        {#if tempSyncKey !== syncKey}
          <button
            onclick={() => onUpdateSyncKey(tempSyncKey)}
            title="Save changes"
            class="top-1/2 right-2 absolute bg-sky-500 hover:bg-sky-600 p-1.5 rounded-lg text-white transition-colors -translate-y-1/2"
          >
            <Save class="w-3.5 h-3.5" />
          </button>
        {:else}
          <button
            onclick={generateKey}
            title="Generate random key"
            class="top-1/2 right-2 absolute bg-slate-200 hover:bg-slate-300 p-1.5 rounded-lg text-slate-500 transition-colors -translate-y-1/2"
          >
            <Dices class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>

      {#if syncKey}
        <button
          onclick={onShareSyncKey}
          title="Share Sync Link"
          class="bg-sky-50 hover:bg-sky-100 p-3 rounded-2xl text-sky-600 transition"
        >
          <Share2 class="w-5 h-5" />
        </button>
      {/if}

      <div class="flex items-center gap-2">
        <button
          onclick={onExportVault}
          title="Backup Vault"
          class="bg-slate-100 hover:bg-slate-200 p-3 rounded-2xl text-slate-600 transition"
        >
          <Download class="w-5 h-5" />
        </button>
        <button
          onclick={() => fileInput.click()}
          title="Restore Vault"
          class="bg-slate-100 hover:bg-slate-200 p-3 rounded-2xl text-slate-600 transition"
        >
          <Upload class="w-5 h-5" />
        </button>
        <input
          bind:this={fileInput}
          type="file"
          accept=".json"
          class="hidden"
          onchange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) {
              onImportVault(file);
              e.currentTarget.value = ""; // Reset for next time
            }
          }}
        />
      </div>

      <button
        onclick={onStartNewRecipe}
        class="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-amber-100 hover:bg-amber-200 px-6 py-3 rounded-2xl font-bold text-amber-700 transition"
      >
        <span>New Recipe</span>
        <Plus class="w-4 h-4" />
      </button>
    </div>
  </div>

  {#if savedRecipes.length === 0}
    <div
      class="bg-white shadow-inner p-24 border-2 border-slate-200 border-dashed rounded-0 sm:rounded-[3rem] text-center"
    >
      <BookOpen class="mx-auto mb-6 w-16 h-16 text-slate-200" />
      <p class="font-bold text-slate-400 text-lg">
        Your vault is currently empty.
      </p>
    </div>
  {:else}
    <div class="mb-12 px-2 sm:px-0">
      <InputGroup.Root
        class="bg-white shadow-slate-200/50 shadow-xl focus-within:shadow-2xl focus-within:shadow-amber-200/20 border-slate-100 focus-within:border-amber-200 rounded-2xl sm:rounded-3xl h-14 sm:h-20 overflow-hidden transition-all"
      >
        <InputGroup.Addon class="bg-transparent pl-4 sm:pl-8 border-none">
          <Search class="w-4 sm:w-6 h-4 sm:h-6 text-slate-400" />
        </InputGroup.Addon>
        <InputGroup.Input
          placeholder="Search..."
          bind:value={searchQuery}
          class="bg-transparent px-2 border-none focus-visible:ring-0 h-full font-medium text-md placeholder:text-slate-300 md:text-2xl"
        />
        <InputGroup.Addon
          align="inline-end"
          class="flex items-center gap-1 bg-transparent pr-2 sm:pr-8 border-none"
        >
          <div class="hidden sm:block bg-slate-100 mx-2 w-px h-8 sm:h-10"></div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <InputGroup.Button
                  {...props}
                  variant="ghost"
                  class="flex items-center gap-1 sm:gap-2 hover:bg-slate-50 px-2 sm:px-4 rounded-xl sm:rounded-2xl h-8 sm:h-12 font-black text-[10px] text-slate-600 sm:text-sm uppercase tracking-widest"
                >
                  <span
                    class="hidden sm:inline mr-1 font-bold text-slate-400 italic normal-case"
                    >Sort by:</span
                  >
                  <span class="sm:hidden">{SORT_LABELS_SHORT[sortBy]}</span>
                  <span class="hidden sm:inline">{SORT_LABELS[sortBy]}</span>
                  <ChevronDown class="w-3 sm:w-4 h-3 sm:h-4 text-amber-500" />
                </InputGroup.Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              align="end"
              class="shadow-2xl p-2 border-slate-100 rounded-xl sm:rounded-2xl min-w-40 sm:min-w-48"
            >
              {#each Object.entries(SORT_LABELS) as [id, label]}
                <DropdownMenu.Item
                  onclick={() => (sortBy = id as any)}
                  class="data-highlighted:bg-amber-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-slate-600 data-highlighted:text-amber-700 transition-colors"
                >
                  {label}
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <div class="bg-slate-100 mx-1 w-px h-5 sm:h-8"></div>

          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <InputGroup.Button
                  {...props}
                  variant="ghost"
                  onclick={() =>
                    (sortOrder = sortOrder === "asc" ? "desc" : "asc")}
                  class="hover:bg-amber-50 p-0 rounded-xl sm:rounded-2xl w-8 sm:w-12 h-8 sm:h-12 text-slate-400 hover:text-amber-600 transition-all"
                >
                  {#if sortOrder === "asc"}
                    <ArrowUp class="w-4 sm:w-6 h-4 sm:h-6" />
                  {:else}
                    <ArrowDown class="w-4 sm:w-6 h-4 sm:h-6" />
                  {/if}
                </InputGroup.Button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content
              class="bg-slate-900 shadow-xl px-3 py-1.5 rounded-lg font-bold text-white text-xs"
            >
              {sortOrder === "asc" ? "Sort Ascending" : "Sort Descending"}
            </Tooltip.Content>
          </Tooltip.Root>
        </InputGroup.Addon>
      </InputGroup.Root>
    </div>

    {#if filteredRecipes.length === 0}
      <div
        class="bg-slate-50 py-20 border-2 border-slate-200 border-dashed rounded-3xl text-center"
      >
        <p class="font-bold text-slate-400">No recipes match your search.</p>
      </div>
    {:else}
      <div class="gap-4 sm:gap-6 grid">
        {#each filteredRecipes as recipe (recipe.id)}
          <div
            class="group bg-white shadow-sm hover:shadow-xl p-4 sm:p-6 border border-slate-100 rounded-0 sm:rounded-3xl transition-all hover:-translate-y-1"
            in:slide={{ axis: "y" }}
          >
          <div
            class="flex md:flex-row flex-col justify-between md:items-center gap-4 sm:gap-6"
          >
            <div class="flex-1">
              <button
                class="font-black text-slate-900 group-hover:text-amber-600 text-lg sm:text-xl text-left transition-colors"
                onclick={() => onLoadRecipe(recipe)}
              >
                {recipe.name}
              </button>
              <div class="flex items-center gap-4 mt-2">
                <span
                  class="bg-slate-100 px-3 py-1 rounded-full font-black text-[10px] text-slate-500 uppercase tracking-widest"
                >
                  {new Date(recipe.updatedAt).toLocaleDateString("en-GB")}
                </span>
                <span class="text-slate-300">•</span>
                <span class="font-bold text-slate-500 text-xs"
                  >{recipe.ingredients.length} Ingredients</span
                >
                <span class="text-slate-300">•</span>
                <span class="bg-sky-50 px-3 py-1 rounded-full font-black text-[10px] text-sky-600 uppercase tracking-widest"
                  >{calculateRecipeStats(recipe.ingredients, recipe.portions || 1, recipe.stages || []).hydration.toFixed(0)}% Hydration</span
                >
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                onclick={() => onLoadRecipe(recipe)}
                class="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-slate-50 hover:bg-slate-900 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[10px] text-slate-600 hover:text-white sm:text-xs uppercase tracking-widest transition-all"
              >
                <PenLine class="w-3.5 h-3.5" />
                <span>Open</span>
              </button>
              <button
                onclick={() => onRemixRecipe(recipe)}
                class="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-slate-50 hover:bg-amber-600 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[10px] text-slate-600 hover:text-white sm:text-xs uppercase tracking-widest transition-all"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>Remix</span>
              </button>
              <button
                onclick={() => onShareRecipe(recipe)}
                class="p-2 text-slate-200 hover:text-sky-500 transition-colors"
                title="Share link"
              >
                <Share2 class="w-5 h-5" />
              </button>
              <button
                onclick={() => recipe.id && onDeleteRecipe(recipe.id)}
                class="p-2 text-slate-200 hover:text-red-500 transition-colors"
                title="Delete recipe"
              >
                <Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
{/if}
</div>
