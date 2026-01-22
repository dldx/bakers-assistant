<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { Plus, PenLine, Copy, Trash2, BookOpen } from "lucide-svelte";
  import type { Recipe } from "$lib/types";
  import { calculateRecipeStats } from "$lib/calculations";
  import { GlassWater, Zap, Save } from "lucide-svelte";

  let {
    savedRecipes,
    syncKey,
    onLoadRecipe,
    onRemixRecipe,
    onDeleteRecipe,
    onStartNewRecipe,
    onUpdateSyncKey,
  } = $props<{
    savedRecipes: Recipe[];
    syncKey: string;
    onLoadRecipe: (recipe: Recipe) => void;
    onRemixRecipe: (recipe: Recipe) => void;
    onDeleteRecipe: (id: number) => void;
    onStartNewRecipe: () => void;
    onUpdateSyncKey: (key: string) => void;
  }>();

  let tempSyncKey = $state(syncKey);
</script>

<div class="mx-auto py-12 max-w-4xl" in:fade>
  <div class="flex justify-between items-center gap-2 mb-12 p-2">
    <div>
      <h2 class="mb-2 font-black text-slate-900 text-2xl sm:text-4xl">
        The Recipe Vault
      </h2>
      <p class="font-medium text-slate-500">
        Your personal collection of artisanal formulas.
      </p>
    </div>
    <div class="flex items-center gap-4">
      <div class="group relative">
        <input
          type="text"
          placeholder="Sync Key (e.g. secret123)"
          bind:value={tempSyncKey}
          onkeydown={(e) => e.key === "Enter" && onUpdateSyncKey(tempSyncKey)}
          class="bg-slate-100 hover:bg-slate-200 focus:bg-white px-4 py-3 rounded-2xl outline-hidden focus:ring-2 focus:ring-sky-500 w-48 sm:w-64 font-bold placeholder:font-bold text-slate-700 text-sm transition-all"
        />
        {#if tempSyncKey !== syncKey}
          <button
            onclick={() => onUpdateSyncKey(tempSyncKey)}
            class="top-1/2 right-2 absolute bg-sky-500 hover:bg-sky-600 p-1.5 rounded-lg text-white transition-colors -translate-y-1/2"
          >
            <Save class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
      <button
        onclick={onStartNewRecipe}
        class="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 px-6 py-3 rounded-2xl font-bold text-amber-700 transition"
      >
        <span>Start New Recipe</span>
        <Plus class="w-4 h-4" />
      </button>
    </div>
  </div>

  {#if savedRecipes.length === 0}
    <div
      class="bg-white shadow-inner p-24 border-2 border-slate-200 border-dashed rounded-[3rem] text-center"
    >
      <BookOpen class="mx-auto mb-6 w-16 h-16 text-slate-200" />
      <p class="font-bold text-slate-400 text-lg">
        Your vault is currently empty.
      </p>
    </div>
  {:else}
    <div class="gap-4 sm:gap-6 grid">
      {#each savedRecipes as recipe (recipe.id)}
        <div
          class="group bg-white shadow-sm hover:shadow-xl p-4 sm:p-6 border border-slate-100 rounded-0 sm:rounded-3xl transition-all hover:-translate-y-1"
          in:slide={{ axis: "y" }}
        >
          <div
            class="flex md:flex-row flex-col justify-between md:items-center gap-4 sm:gap-6"
          >
            <div class="flex-1">
              <button
                class="font-black text-slate-900 group-hover:text-amber-600 text-lg sm:text-xl transition-colors"
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
                  >{calculateRecipeStats(recipe.ingredients, recipe.portions || 1).hydration.toFixed(0)}% Hydration</span
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
                onclick={() => recipe.id && onDeleteRecipe(recipe.id)}
                class="p-2 text-slate-200 hover:text-red-500 transition-colors"
              >
                <Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
