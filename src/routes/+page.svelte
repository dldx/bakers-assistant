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
    ChefHat,
  } from "lucide-svelte";
  import { db } from "$lib/db";
  import { IngredientCategory, type Ingredient, type Recipe } from "$lib/types";
  import IngredientBucket from "$lib/components/IngredientBucket.svelte";
  import NotesEditor from "$lib/components/NotesEditor.svelte";
  import AIChat from "$lib/components/AIChat.svelte";
  import "../app.css"

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
      name: "Sourdough Starter",
      weight: 100,
      category: IngredientCategory.LEAVENING,
    },
    { id: "4", name: "Salt", weight: 10, category: IngredientCategory.SALT },
  ]);

  let recipeName = $state("My Sourdough Recipe");
  let notes = $state("");
  let portions = $state(1);
  let isScalingEnabled = $state(false);
  let isCookingMode = $state(false);

  let view = $state<"calculator" | "history">("calculator");
  let activeRecipeId = $state<number | null>(null);
  let savedRecipes = $state<Recipe[]>([]);

  // --- Derived Runes ---
  import { calculateRecipeStats } from "$lib/calculations";

  // --- Derived Runes ---
  const calculations = $derived(calculateRecipeStats(ingredients, portions));

  // --- Dirty Tracking ---
  function captureState() {
    return JSON.stringify({
      ingredients: $state.snapshot(ingredients),
      recipeName,
      notes,
      portions,
    });
  }

  let lastSavedJson = $state("");
  const isDirty = $derived(
    lastSavedJson !== "" && lastSavedJson !== captureState()
  );

  // --- Effects & Logic ---
  onMount(async () => {
    await refreshVault();
    window.addEventListener("hashchange", handleHashChange);
    await handleHashChange();
    lastSavedJson = captureState();
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
      ...(category === IngredientCategory.LEAVENING ? { hydration: 100 } : {}),
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

  function scaleByYield(newPortions: number) {
    if (newPortions <= 0) return;

    if (isScalingEnabled) {
      const factor = newPortions / portions;
      ingredients = ingredients.map((ing) => ({
        ...ing,
        weight: Math.round(ing.weight * factor * 10) / 10,
      }));
    }

    portions = newPortions;
  }

  function scaleToTargetServingWeight(targetWeight: number) {
    if (targetWeight <= 0 || calculations.totalWeight === 0 || !isScalingEnabled) return;
    const targetTotal = targetWeight * portions;
    const factor = targetTotal / calculations.totalWeight;
    ingredients = ingredients.map((ing) => ({
      ...ing,
      weight: Math.round(ing.weight * factor * 10) / 10,
    }));
  }

  function scaleToTotalWeight(targetTotal: number) {
    if (targetTotal <= 0 || calculations.totalWeight === 0 || !isScalingEnabled) return;
    const factor = targetTotal / calculations.totalWeight;
    ingredients = ingredients.map((ing) => ({
      ...ing,
      weight: Math.round(ing.weight * factor * 10) / 10,
    }));
  }

  function adjustHydration(targetHydration: number) {
    if (targetHydration <= 0 || calculations.totalFlour === 0) return;

    // We want totalWater / totalFlour = targetHydration / 100
    // So targetTotalWater = totalFlour * (targetHydration / 100)
    // The delta we need to add/remove from raw WATER ingredients:
    const targetTotalWater = calculations.totalFlour * (targetHydration / 100);
    const delta = targetTotalWater - calculations.totalWater;

    // Find the first water ingredient to adjust
    const waterIdx = ingredients.findIndex(i => i.category === IngredientCategory.WATER);
    if (waterIdx !== -1) {
      ingredients[waterIdx] = {
        ...ingredients[waterIdx],
        weight: Math.max(0, Math.round((ingredients[waterIdx].weight + delta) * 10) / 10)
      };
    } else {
      // If no water ingredient exists, add one
      ingredients.push({
        id: Math.random().toString(36).substr(2, 9),
        name: "Water",
        weight: Math.max(0, Math.round(delta * 10) / 10),
        category: IngredientCategory.WATER
      });
    }
  }

  async function saveRecipe(silent = false) {
    const existingRecipe = activeRecipeId ? savedRecipes.find((r) => r.id === activeRecipeId) : null;
    const uuid = existingRecipe?.uuid || crypto.randomUUID();

    const recipe: Recipe = {
      uuid,
      name: recipeName || "Untitled Recipe",
      ingredients: $state.snapshot(ingredients),
      portions,
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
    lastSavedJson = captureState();
    if (!silent) alert("Recipe saved to vault!");
  }

  function loadRecipe(recipe: Recipe) {
    // Migration for legacy recipes: Apply top-level hydration to starters if missing
    const legacyHydration = (recipe as any).starterHydration ?? 100;
    const loadedIngredients = JSON.parse(JSON.stringify(recipe.ingredients));

    ingredients = loadedIngredients.map((ing: Ingredient) => {
      if (
        ing.category === IngredientCategory.LEAVENING &&
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
    portions = recipe.portions || 1;
    activeRecipeId = recipe.id ?? null;
    view = "calculator";

    if (recipe.uuid) {
      window.location.hash = `recipe/${recipe.uuid}`;
    }
    lastSavedJson = captureState();
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
        clearToDefaults();
      }
    }
  }

  function handleRecipeUpdate(data: any) {
    if (data.recipeName) recipeName = data.recipeName;
    if (data.notes) notes = data.notes;

    if (data.ingredients) {
      ingredients = data.ingredients.map((ing: any) => ({
        id: ing.id || Math.random().toString(36).substr(2, 9),
        ...ing,
      }));
    }

    if (data.portions && data.portions !== portions) {
      if (isScalingEnabled) {
        scaleByYield(data.portions);
      } else {
        portions = data.portions;
      }
    }

    if (data.targetHydration && isScalingEnabled) {
      adjustHydration(data.targetHydration);
    }
  }

  function clearToDefaults() {
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
        name: "Sourdough Starter",
        weight: 100,
        category: IngredientCategory.LEAVENING,
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
    portions = 1;
    activeRecipeId = null;
    window.location.hash = "";
    lastSavedJson = captureState();
  }

  function resetCalculator() {
    const isSaved = activeRecipeId !== null;

    if (isDirty) {
      const message = isSaved
        ? "Discard unsaved changes and revert to the last saved version?"
        : "Reset to initial template?";

      if (!confirm(message)) return;
    }

    if (isSaved) {
      const recipe = savedRecipes.find((r) => r.id === activeRecipeId);
      if (recipe) {
        loadRecipe(recipe);
        return;
      }
    }

    clearToDefaults();
  }

  function startNewRecipe() {
    if (isDirty) {
      if (!confirm("Discard unsaved changes and start a new recipe?")) return;
    }
    clearToDefaults();
    view = "calculator";
  }

  const CATEGORY_ICONS: Record<string, any> = {
    [IngredientCategory.FLOUR]: Wheat,
    [IngredientCategory.WATER]: Droplets,
    [IngredientCategory.MILK]: GlassWater,
    [IngredientCategory.LEAVENING]: Dna,
    [IngredientCategory.SALT]: FlaskConical,
    [IngredientCategory.SUGAR]: Gem,
    [IngredientCategory.FAT]: Zap,
    [IngredientCategory.TANGZHONG]: Flame,
    [IngredientCategory.OTHER]: Cookie,
  };
</script>

<svelte:head>
  <title>{recipeName} | Baker's Assistant</title>
</svelte:head>

<div class="bg-gray-50/30 selection:bg-amber-100 min-h-screen">
  <header
    class="top-0 z-20 sticky bg-white/80 shadow-sm backdrop-blur-md border-b"
  >
    <div class="flex justify-between items-center mx-auto px-3 sm:px-6 max-w-6xl h-14 sm:h-16">
      <div class="flex items-center gap-2 sm:gap-3">
        <div class="bg-amber-600 shadow-amber-200 shadow-lg p-2 sm:p-2.5 rounded-xl">
          <CalcIcon class="w-4 sm:w-5 h-4 sm:h-5 text-white" />
        </div>
        <h1 class="font-extrabold text-slate-800 text-lg sm:text-xl tracking-tight">
          Baker's<span class="hidden sm:inline text-amber-600">Assistant</span>
        </h1>
      </div>

      <nav
        class="flex items-center bg-slate-100 p-0.5 sm:p-1 border border-slate-200 rounded-xl sm:rounded-2xl"
      >
        <button
          onclick={() => (view = "calculator")}
          class="px-3 sm:px-5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all {view ===
          'calculator'
            ? 'bg-white shadow-sm text-amber-700'
            : 'text-slate-500 hover:text-slate-800'}"
        >
          Calculator
        </button>
        <button
          onclick={() => (view = "history")}
          class="px-3 sm:px-5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all {view ===
          'history'
            ? 'bg-white shadow-sm text-amber-700'
            : 'text-slate-500 hover:text-slate-800'}"
        >
          <span class="hidden xs:inline">The Vault</span>
          <span class="xs:hidden">Vault</span>
          <span class="opacity-50 ml-1">({savedRecipes.length})</span>
        </button>
      </nav>

      <div class="flex items-center gap-1 sm:gap-2">
        <button
          onclick={resetCalculator}
          class="flex items-center gap-2 hover:bg-red-50 p-2 sm:px-4 sm:py-2 rounded-xl font-bold text-slate-400 hover:text-red-500 text-sm transition-colors"
          title="Reset"
        >
          <RotateCcw class="w-4 h-4" />
          <span class="hidden lg:inline">Reset</span>
        </button>
        <button
          onclick={() => saveRecipe()}
          class="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg p-2 sm:px-5 sm:py-2 rounded-xl font-bold text-white active:scale-95 transition"
          title="Save"
        >
          <Save class="w-4 h-4" />
          <span class="hidden lg:inline">Save</span>
        </button>
      </div>
    </div>
  </header>

  <main class="mx-auto px-4 py-4 sm:py-8 max-w-6xl">
    {#if view === "calculator"}
      <div class="gap-6 sm:gap-8 grid grid-cols-1 lg:grid-cols-12">
        <!-- Left: Inputs -->
        <div class="space-y-6 lg:col-span-8" in:fade>
          <div
            class="bg-white shadow-slate-200/50 shadow-xl p-5 sm:p-8 border border-slate-100 rounded-3xl sm:rounded-[2rem]"
          >
            <div
              class="flex md:flex-row flex-col justify-between md:items-center gap-4 sm:gap-6 mb-8 sm:mb-10 pb-6 border-slate-50 border-b"
            >
              <input
                type="text"
                bind:value={recipeName}
                class="bg-transparent p-0 border-none focus:ring-0 w-full font-black text-slate-900 placeholder:text-slate-200 text-2xl sm:text-3xl"
                placeholder="Name your creation..."
              />
                              <label class="group/cook flex items-center gap-2 cursor-pointer">
                    <span class="font-black text-[9px] text-slate-500 uppercase tracking-tighter">
                      <ChefHat class="inline-block mr-0.5 w-3 h-3" />
                      Cook
                    </span>
                    <div class="relative bg-slate-700 peer-checked:bg-emerald-500 rounded-full w-8 h-4 transition-colors">
                      <input
                        type="checkbox"
                        bind:checked={isCookingMode}
                        class="sr-only peer"
                      />
                      <div class="top-0.5 left-0.5 absolute bg-white shadow-sm rounded-full w-3 h-3 transition-transform peer-checked:translate-x-4"></div>
                    </div>
                  </label>
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
                  isCookingMode={isCookingMode}
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
              class="group relative bg-slate-900 shadow-2xl p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] overflow-hidden text-white"
            >
              <!-- Decorative element -->
              <div
                class="-top-4 -right-4 absolute bg-amber-500/10 blur-2xl rounded-full w-24 h-24 group-hover:scale-150 transition-all"
              ></div>

              <div class="flex justify-between items-center mb-6">
                <h3
                  class="font-black text-[10px] text-slate-400 uppercase tracking-widest"
                >
                  Real-time Analysis
                </h3>
                <div class="flex items-center gap-3">
                  <label class="group/scale flex items-center gap-2 cursor-pointer">
                    <span class="font-black text-[9px] text-slate-500 uppercase tracking-tighter">Scale Mode</span>
                    <div class="relative bg-slate-700 peer-checked:bg-amber-500 rounded-full w-8 h-4 transition-colors">
                      <input
                        type="checkbox"
                        bind:checked={isScalingEnabled}
                        class="sr-only peer"
                      />
                      <div class="top-0.5 left-0.5 absolute bg-white shadow-sm rounded-full w-3 h-3 transition-transform peer-checked:translate-x-4"></div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="space-y-6 sm:space-y-8">
                <div>
                  <div class="flex justify-between items-end mb-3">
                    <span class="font-bold text-slate-300 text-sm"
                      >Net Hydration</span
                    >
                    <span class="font-black text-amber-400 text-3xl sm:text-4xl"
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
                  class="gap-4 sm:gap-6 grid grid-cols-2 pt-6 border-slate-800 border-t"
                >
                  <div>
                    <span
                      class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest"
                      >Total Flour</span
                    >
                    <span class="font-bold text-xl sm:text-2xl"
                      >{Math.round(calculations.totalFlour)}g</span
                    >
                  </div>
                  <div>
                    <span
                      class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest"
                      >Total Liquid</span
                    >
                    <span class="font-bold text-xl sm:text-2xl"
                      >{Math.round(calculations.totalWater)}g</span
                    >
                  </div>
                  <div class="col-span-2 pt-4 border-slate-800 border-t">
                    <div class="gap-3 sm:gap-4 grid grid-cols-2">
                      <div class="bg-slate-800/50 p-3 rounded-2xl {isScalingEnabled ? 'ring-1 ring-amber-500/50' : ''}">
                        <span class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest">Yield</span>
                        <input
                          type="number"
                          value={portions}
                          onchange={(e) => scaleByYield(Number(e.currentTarget.value))}
                          class="bg-transparent p-0 border-none focus:ring-0 w-full font-bold {isScalingEnabled ? 'text-amber-500' : 'text-slate-200'} text-lg sm:text-xl"
                          min="1"
                        />
                      </div>
                      <div class="bg-slate-800/50 p-3 rounded-2xl {isScalingEnabled ? 'ring-1 ring-amber-500/50' : ''}">
                        <span class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest">Weight / Por.</span>
                        <div class="flex items-baseline gap-1">
                          <input
                            type="number"
                            value={Math.round(calculations.weightPerPortion)}
                            onchange={(e) => scaleToTargetServingWeight(Number(e.currentTarget.value))}
                            readonly={!isScalingEnabled}
                            class="bg-transparent p-0 border-none focus:ring-0 w-full font-bold {isScalingEnabled ? 'text-slate-200' : 'text-slate-500'} text-lg sm:text-xl"
                            min="1"
                          />
                          <span class="font-bold text-slate-500 text-xs">g</span>
                        </div>
                      </div>
                      <div class="col-span-2 bg-amber-600/20 p-3 border {isScalingEnabled ? 'border-amber-600' : 'border-amber-600/30'} rounded-2xl transition-colors">
                        <span class="block mb-1 font-black text-[10px] {isScalingEnabled ? 'text-amber-400' : 'text-amber-500/80'} uppercase tracking-widest">Final Batch Weight</span>
                        <div class="flex items-baseline gap-1">
                          <input
                            type="number"
                            value={Math.round(calculations.totalWeight)}
                            onchange={(e) => scaleToTotalWeight(Number(e.currentTarget.value))}
                            readonly={!isScalingEnabled}
                            class="bg-transparent p-0 border-none focus:ring-0 w-full font-black {isScalingEnabled ? 'text-amber-100' : 'text-amber-100/40'} text-2xl sm:text-3xl"
                            min="1"
                          />
                          <span class="ml-auto font-black text-amber-500 text-lg">g</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Chat Card -->
            <AIChat
              {recipeName}
              {ingredients}
              hydration={calculations.hydration}
              {portions}
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
            onclick={startNewRecipe}
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
          <div class="gap-4 sm:gap-6 grid">
            {#each savedRecipes as recipe (recipe.id)}
              <div
                class="group bg-white shadow-sm hover:shadow-xl p-4 sm:p-6 border border-slate-100 rounded-2xl sm:rounded-3xl transition-all hover:-translate-y-1"
                in:slide={{ axis: "y" }}
              >
                <div
                  class="flex md:flex-row flex-col justify-between md:items-center gap-4 sm:gap-6"
                >
                  <div class="flex-1">
                    <h4
                      class="font-black text-slate-900 group-hover:text-amber-600 text-lg sm:text-xl transition-colors"
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
                      class="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-slate-50 hover:bg-slate-900 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[10px] text-slate-600 hover:text-white sm:text-xs uppercase tracking-widest transition-all"
                    >
                      <PenLine class="w-3.5 h-3.5" />
                      <span>Open</span>
                    </button>
                    <button
                      onclick={() => remixRecipe(recipe)}
                      class="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-slate-50 hover:bg-amber-600 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[10px] text-slate-600 hover:text-white sm:text-xs uppercase tracking-widest transition-all"
                    >
                      <Copy class="w-3.5 h-3.5" />
                      <span>Remix</span>
                    </button>
                    <button
                      onclick={() => recipe.id && deleteRecipe(recipe.id)}
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
