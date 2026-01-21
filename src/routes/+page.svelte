<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide, fly } from "svelte/transition";
  import {
    Plus,
    Save,
    RotateCcw,
    Trash2,
    PenLine,
    Copy,
    Calculator as CalcIcon,
    BookOpen,
    Wheat,
    Droplets,
    Dna,
    Zap,
    Cookie,
    FlaskConical,
    GlassWater,
    Gem,
    Flame,
  } from "lucide-svelte";
  import { db } from "$lib/db";
  import { IngredientCategory, type Ingredient, type Recipe } from "$lib/types";
  import IngredientBucket from "$lib/components/IngredientBucket.svelte";
  import NotesEditor from "$lib/components/NotesEditor.svelte";
  import AIChat from "$lib/components/AIChat.svelte";

  // --- State Runes ---
  let ingredients = $state<Ingredient[]>([
    {
      id: "1",
      name: "Bread Flour",
      weight: 500,
      category: IngredientCategory.FLOUR,
    },
    { id: "2", name: "Water", weight: 350, category: IngredientCategory.WATER },
    {
      id: "3",
      name: "Starter",
      weight: 100,
      category: IngredientCategory.STARTER,
    },
    { id: "4", name: "Salt", weight: 10, category: IngredientCategory.SALT },
  ]);

  let recipeName = $state("My Sourdough Recipe");
  let notes = $state("");

  let view = $state<"calculator" | "history">("calculator");
  let activeRecipeId = $state<number | null>(null);
  let savedRecipes = $state<Recipe[]>([]);

  // --- Derived Runes ---
  import { calculateRecipeStats } from "$lib/calculations";

  // --- Derived Runes ---
  const calculations = $derived(calculateRecipeStats(ingredients));

  // --- Effects & Logic ---
  onMount(async () => {
    await refreshVault();
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
  });

  async function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash && hash.startsWith("recipe/")) {
      const uuid = hash.replace("recipe/", "");
      if (activeRecipeId && savedRecipes.find((r) => r.id === activeRecipeId)?.uuid === uuid) {
        return; // Already loaded
      }
      const recipe = await db.recipes.where("uuid").equals(uuid).first();
      if (recipe) {
        loadRecipe(recipe);
      }
    }
  }

  async function refreshVault() {
    const all = await db.recipes.toArray();
    // Migration: ensure all recipes have UUIDs
    for (const r of all) {
      if (!r.uuid) {
        r.uuid = crypto.randomUUID();
        await db.recipes.update(r.id!, { uuid: r.uuid });
      }
    }
    savedRecipes = all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function addIngredient(category: IngredientCategory) {
    ingredients.push({
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      weight: 0,
      category,
      ...(category === IngredientCategory.STARTER ? { hydration: 100 } : {}),
    });
  }

  function updateIngredient(id: string, updates: Partial<Ingredient>) {
    const index = ingredients.findIndex((i) => i.id === id);
    if (index !== -1) {
      ingredients[index] = { ...ingredients[index], ...updates };
    }
  }

  function removeIngredient(id: string) {
    ingredients = ingredients.filter((i) => i.id !== id);
  }

  async function saveRecipe(silent = false) {
    const existingRecipe = activeRecipeId ? savedRecipes.find((r) => r.id === activeRecipeId) : null;
    const uuid = existingRecipe?.uuid || crypto.randomUUID();

    const recipe: Recipe = {
      uuid,
      name: recipeName || "Untitled Recipe",
      ingredients: $state.snapshot(ingredients),
      notes,
      createdAt: existingRecipe?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (activeRecipeId) {
      await db.recipes.update(activeRecipeId, recipe as any);
    } else {
      const id = await db.recipes.add(recipe);
      activeRecipeId = id as number;
    }

    window.location.hash = `recipe/${uuid}`;
    await refreshVault();
    if (!silent) alert("Recipe saved to vault!");
  }

  function loadRecipe(recipe: Recipe) {
    // Migration for legacy recipes: Apply top-level hydration to starters if missing
    const legacyHydration = (recipe as any).starterHydration ?? 100;
    const loadedIngredients = JSON.parse(JSON.stringify(recipe.ingredients));

    ingredients = loadedIngredients.map((ing: Ingredient) => {
      if (
        ing.category === IngredientCategory.STARTER &&
        ing.hydration === undefined
      ) {
        return { ...ing, hydration: legacyHydration };
      }
      // Migration for deprecated Butter category -> Fat with 16% water
      if ((ing.category as any) === "butter") {
        return { ...ing, category: IngredientCategory.FAT, waterContent: 16 };
      }
      return ing;
    });

    notes = recipe.notes || "";
    recipeName = recipe.name;
    activeRecipeId = recipe.id ?? null;
    view = "calculator";
    aiInsight = null;

    if (recipe.uuid) {
      window.location.hash = `recipe/${recipe.uuid}`;
    }
  }

  async function remixRecipe(recipe: Recipe) {
    loadRecipe(recipe);
    recipeName += " (Remix)";
    activeRecipeId = null;
    await saveRecipe(true);
  }

  async function deleteRecipe(id: number) {
    if (confirm("Permanently remove this recipe from the vault?")) {
      await db.recipes.delete(id);
      await refreshVault();
      if (activeRecipeId === id) {
        activeRecipeId = null;
        window.location.hash = "";
      }
    }
  }

  function handleRecipeUpdate(data: any) {
    if (data.recipeName) recipeName = data.recipeName;
    if (data.ingredients) {
      ingredients = data.ingredients.map((ing: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        ...ing,
      }));
    }
    if (data.notes) notes = data.notes;
  }

  function resetCalculator() {
    const isSaved = activeRecipeId !== null;
    const message = isSaved
      ? "Discard unsaved changes and revert to the last saved version?"
      : "Reset to initial template?";

    if (confirm(message)) {
      if (isSaved) {
        const recipe = savedRecipes.find((r) => r.id === activeRecipeId);
        if (recipe) {
          loadRecipe(recipe);
          return;
        }
      }

      ingredients = [
        {
          id: "1",
          name: "Bread Flour",
          weight: 500,
          category: IngredientCategory.FLOUR,
        },
        {
          id: "2",
          name: "Water",
          weight: 350,
          category: IngredientCategory.WATER,
        },
        {
          id: "3",
          name: "Starter",
          weight: 100,
          category: IngredientCategory.STARTER,
        },
        {
          id: "4",
          name: "Salt",
          weight: 10,
          category: IngredientCategory.SALT,
        },
      ];
      recipeName = "My Sourdough Recipe";
      notes = "";
      activeRecipeId = null;
      window.location.hash = "";
    }
  }

  const CATEGORY_ICONS: Record<string, any> = {
    flour: Wheat,
    water: Droplets,
    milk: GlassWater,
    starter: Dna,
    salt: FlaskConical,
    sugar: Gem,
    fat: Zap,
    tangzhong: Flame,
    other: Cookie,
  };
</script>

<svelte:head>
  <title>{recipeName} | Baker's Assistant</title>
</svelte:head>

<div class="bg-gray-50/30 selection:bg-amber-100 min-h-screen">
  <header
    class="top-0 z-20 sticky bg-white bg-white/80 shadow-sm backdrop-blur-md border-b"
  >
    <div class="flex justify-between items-center mx-auto px-4 max-w-6xl h-16">
      <div class="flex items-center space-x-3">
        <div class="bg-amber-600 shadow-amber-200 shadow-lg p-2.5 rounded-xl">
          <CalcIcon class="w-5 h-5 text-white" />
        </div>
        <h1 class="font-extrabold text-slate-800 text-xl tracking-tight">
          Baker's<span class="text-amber-600">Assistant</span>
        </h1>
      </div>

      <nav
        class="flex items-center bg-slate-100 p-1 border border-slate-200 rounded-2xl"
      >
        <button
          onclick={() => (view = "calculator")}
          class="px-5 py-1.5 rounded-xl text-sm font-bold transition-all {view ===
          'calculator'
            ? 'bg-white shadow-sm text-amber-700'
            : 'text-slate-500 hover:text-slate-800'}"
        >
          Calculator
        </button>
        <button
          onclick={() => (view = "history")}
          class="px-5 py-1.5 rounded-xl text-sm font-bold transition-all {view ===
          'history'
            ? 'bg-white shadow-sm text-amber-700'
            : 'text-slate-500 hover:text-slate-800'}"
        >
          The Vault ({savedRecipes.length})
        </button>
      </nav>

      <div class="flex items-center gap-2">
        <button
          onclick={resetCalculator}
          class="flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-red-500 text-sm transition-colors"
        >
          <RotateCcw class="w-4 h-4" />
          <span class="hidden sm:inline">Reset</span>
        </button>
        <button
          onclick={() => saveRecipe()}
          class="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg px-5 py-2 rounded-xl font-bold text-white active:scale-95 transition"
        >
          <Save class="w-4 h-4" />
          <span class="hidden sm:inline">Save</span>
        </button>
      </div>
    </div>
  </header>

  <main class="mx-auto px-4 py-8 max-w-6xl">
    {#if view === "calculator"}
      <div class="gap-8 grid grid-cols-1 lg:grid-cols-12">
        <!-- Left: Inputs -->
        <div class="space-y-6 lg:col-span-8" in:fade>
          <div
            class="bg-white shadow-slate-200/50 shadow-xl p-8 border border-slate-100 rounded-[2rem]"
          >
            <div
              class="flex md:flex-row flex-col justify-between md:items-center gap-6 mb-10 pb-6 border-slate-50 border-b"
            >
              <input
                type="text"
                bind:value={recipeName}
                class="bg-transparent p-0 border-none focus:ring-0 w-full font-black text-slate-900 placeholder:text-slate-200 text-3xl"
                placeholder="Name your creation..."
              />
            </div>

            <div class="space-y-10">
              {#each Object.values(IngredientCategory) as cat}
                <IngredientBucket
                  category={cat}
                  ingredients={ingredients.filter(
                    (ing) => ing.category === cat,
                  )}
                  percentages={calculations.ingredientPercentages}
                  icon={CATEGORY_ICONS[cat]}
                  allIcons={CATEGORY_ICONS}
                  onUpdate={updateIngredient}
                  onRemove={removeIngredient}
                  onAdd={() => addIngredient(cat)}
                />
              {/each}
            </div>

            <NotesEditor bind:notes />

            <div class="flex justify-between items-center mt-12 pt-8 border-t">
              <p class="font-medium text-slate-400 text-xs italic">
                Changes are saved only when you click 'Save' in the header.
              </p>
            </div>
          </div>
        </div>

        <!-- Right: Summary Dashboard -->
        <div class="lg:col-span-4" in:fly={{ y: 20 }}>
          <div class="top-24 sticky space-y-6">
            <div
              class="group relative bg-slate-900 shadow-2xl p-8 rounded-[2rem] overflow-hidden text-white"
            >
              <!-- Decorative element -->
              <div
                class="-top-4 -right-4 absolute bg-amber-500/10 blur-2xl rounded-full w-24 h-24 group-hover:scale-150 transition-all"
              ></div>

              <h3
                class="mb-6 font-black text-[10px] text-slate-400 uppercase tracking-widest"
              >
                Real-time Analysis
              </h3>

              <div class="space-y-8">
                <div>
                  <div class="flex justify-between items-end mb-3">
                    <span class="font-bold text-slate-300 text-sm"
                      >Net Hydration</span
                    >
                    <span class="font-black text-amber-400 text-4xl"
                      >{calculations.hydration.toFixed(1)}%</span
                    >
                  </div>
                  <div
                    class="bg-slate-800 p-0.5 rounded-full w-full h-3 overflow-hidden"
                  >
                    <div
                      class="bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] rounded-full h-full transition-all duration-1000 ease-out"
                      style="width: {Math.min(calculations.hydration, 100)}%"
                    ></div>
                  </div>
                </div>

                <div
                  class="gap-6 grid grid-cols-2 pt-6 border-slate-800 border-t"
                >
                  <div>
                    <span
                      class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest"
                      >Total Flour</span
                    >
                    <span class="font-bold text-2xl"
                      >{Math.round(calculations.totalFlour)}g</span
                    >
                  </div>
                  <div>
                    <span
                      class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest"
                      >Total Liquid</span
                    >
                    <span class="font-bold text-2xl"
                      >{Math.round(calculations.totalWater)}g</span
                    >
                  </div>
                  <div class="col-span-2 pt-2">
                    <span
                      class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest"
                      >Final Batch Weight</span
                    >
                    <span class="font-black text-amber-100 text-3xl"
                      >{Math.round(calculations.totalWeight)}g</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Chat Card -->
            <AIChat
              {recipeName}
              {ingredients}
              hydration={calculations.hydration}
              {notes}
              onUpdateRecipe={handleRecipeUpdate}
            />
          </div>
        </div>
      </div>
    {:else}
      <!-- Vault View -->
      <div class="mx-auto py-12 max-w-4xl" in:fade>
        <div class="flex justify-between items-center mb-12">
          <div>
            <h2 class="mb-2 font-black text-slate-900 text-4xl">
              The Recipe Vault
            </h2>
            <p class="font-medium text-slate-500">
              Your personal collection of artisanal formulas.
            </p>
          </div>
          <button
            onclick={() => {
              resetCalculator();
              view = "calculator";
            }}
            class="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 px-6 py-3 rounded-2xl font-bold text-amber-700 transition"
          >
            <span>Start New Recipe</span>
            <Plus class="w-4 h-4" />
          </button>
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
          <div class="gap-6 grid">
            {#each savedRecipes as recipe (recipe.id)}
              <div
                class="group bg-white shadow-sm hover:shadow-xl p-6 border border-slate-100 rounded-3xl transition-all hover:-translate-y-1"
                in:slide={{ axis: "y" }}
              >
                <div
                  class="flex md:flex-row flex-col justify-between md:items-center gap-6"
                >
                  <div class="flex-1">
                    <h4
                      class="font-black text-slate-900 group-hover:text-amber-600 text-xl transition-colors"
                    >
                      {recipe.name}
                    </h4>
                    <div class="flex items-center gap-4 mt-2">
                      <span
                        class="bg-slate-100 px-3 py-1 rounded-full font-black text-[10px] text-slate-500 uppercase tracking-widest"
                      >
                        {new Date(recipe.updatedAt).toLocaleDateString()}
                      </span>
                      <span class="text-slate-300">•</span>
                      <span class="font-bold text-slate-500 text-xs"
                        >{recipe.ingredients.length} Ingredients</span
                      >
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      onclick={() => loadRecipe(recipe)}
                      class="flex items-center gap-2 bg-slate-50 hover:bg-slate-900 px-5 py-2.5 rounded-xl font-black text-slate-600 hover:text-white text-xs uppercase tracking-widest transition-all"
                    >
                      <PenLine class="w-3.5 h-3.5" />
                      Open
                    </button>
                    <button
                      onclick={() => remixRecipe(recipe)}
                      class="flex items-center gap-2 bg-slate-50 hover:bg-amber-600 px-5 py-2.5 rounded-xl font-black text-slate-600 hover:text-white text-xs uppercase tracking-widest transition-all"
                    >
                      <Copy class="w-3.5 h-3.5" />
                      Remix
                    </button>
                    <button
                      onclick={() => recipe.id && deleteRecipe(recipe.id)}
                      class="p-2.5 text-slate-200 hover:text-red-500 transition-colors"
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
    {/if}
  </main>
</div>

<style>
  :global(.prose ul) {
    list-style-type: disc;
    margin-left: 1.25rem;
  }
  :global(.prose li) {
    margin-bottom: 0.5rem;
  }
</style>
