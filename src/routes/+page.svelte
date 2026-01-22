<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide, fly } from "svelte/transition";
  import {
    Plus,
    Save,
    RotateCcw,
    Trash2,
    Croissant,
    Puzzle,
    Wheat,
    Droplets,
    Dna,
    Zap,
    Cookie,
    Stone,
    GlassWater,
    Gem,
    Flame,
    ChefHat,
  } from "lucide-svelte";
  import { db } from "$lib/db";
  import { IngredientCategory, type Ingredient, type Recipe, type RecipeStage } from "$lib/types";
  import { CATEGORY_META } from "$lib/constants";
  import IngredientBucket from "$lib/components/IngredientBucket.svelte";
  import NotesEditor from "$lib/components/NotesEditor.svelte";
  import AIChat from "$lib/components/AIChat.svelte";
  import RecipeVault from "$lib/components/RecipeVault.svelte";
  import { toast } from "svelte-sonner";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import * as Field from "$lib/components/ui/field";
  import { SyncService } from "$lib/syncService";
  import { exportVault, importVault } from "$lib/vaultService";

  // --- State Runes ---
  let ingredients = $state<Ingredient[]>([
    {
      id: "1",
      name: "Bread Flour",
      weight: 500,
      category: IngredientCategory.FLOUR,
      stageId: "s1",
    },
    {
      id: "2",
      name: "Water",
      weight: 350,
      category: IngredientCategory.WATER,
      stageId: "s1",
    },
    {
      id: "3",
      name: "Sourdough Starter",
      weight: 100,
      category: IngredientCategory.LEAVENING,
      stageId: "s1",
    },
    {
      id: "4",
      name: "Salt",
      weight: 10,
      category: IngredientCategory.SALT,
      stageId: "s1",
    },
  ]);

  let recipeName = $state("My Sourdough Recipe");
  let notes = $state("");
  let portions = $state(1);
  let isScalingEnabled = $state(false);
  let isCookingMode = $state(false);
  let stages = $state<RecipeStage[]>([{ id: "s1", name: "Main Dough" }]);

  let view = $state<"calculator" | "history">("calculator");
  let activeRecipeId = $state<number | null>(null);
  let savedRecipes = $state<Recipe[]>([]);

  let syncKey = $state("");
  let syncService = $state<SyncService | null>(null);

  // --- Derived Runes ---
  import { calculateRecipeStats } from "$lib/calculations";

  // --- Derived Runes ---
  const calculations = $derived(calculateRecipeStats(ingredients, portions));

  // --- Dirty Tracking ---
  function captureState() {
    return JSON.stringify({
      ingredients: $state.snapshot(ingredients),
      stages: $state.snapshot(stages),
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
    syncKey = localStorage.getItem("syncKey") || "";
    if (syncKey) {
      syncService = new SyncService(syncKey, refreshVault);
    }

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

  function addIngredient(category: IngredientCategory, stageId?: string) {
    ingredients.push({
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      weight: 0,
      category,
      stageId,
      ...(category === IngredientCategory.LEAVENING ? { hydration: 100 } : {}),
    });
  }

  function addStage() {
    stages.push({
      id: Math.random().toString(36).substr(2, 9),
      name: `Stage ${stages.length + 1}`,
    });
  }

  function removeStage(id: string) {
    if (confirm("Remove this stage and all its ingredients?")) {
      ingredients = ingredients.filter((ing) => ing.stageId !== id);
      stages = stages.filter((s) => s.id !== id);
    }
  }

  function updateStage(id: string, name: string) {
    const stage = stages.find((s) => s.id === id);
    if (stage) stage.name = name;
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

  function handleDnd(category: IngredientCategory, stageId: string | undefined, newBucketItems: Ingredient[]) {
    // 1. Update items in this bucket to the correct category/stage
    const updated = newBucketItems.map(item => ({
      ...item,
      category,
      stageId
    }));

    // 2. IDs of items that WERE in this bucket or ARE NOW in this bucket
    const currentBucketItems = ingredients.filter(ing => ing.category === category && ing.stageId === stageId);
    const currentIds = new Set(currentBucketItems.map(i => i.id));
    const newIds = new Set(updated.map(i => i.id));
    const allAffectedIds = new Set([...currentIds, ...newIds]);

    // 3. Find insertion index (where the bucket starts)
    let insertionIndex = ingredients.findIndex(ing => currentIds.has(ing.id));
    if (insertionIndex === -1) {
      // If bucket was empty, put it at the end of its stage or at the end of the list
      const stageItems = ingredients.filter(ing => ing.stageId === stageId);
      if (stageItems.length > 0) {
        const lastItem = stageItems[stageItems.length - 1];
        insertionIndex = ingredients.indexOf(lastItem) + 1;
      } else {
        insertionIndex = ingredients.length;
      }
    }

    // 4. Remove all affected items and splice in the updated ones
    const remaining = ingredients.filter(ing => !allAffectedIds.has(ing.id));
    const next = [...remaining];
    next.splice(insertionIndex, 0, ...updated);

    ingredients = next;
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
      stages: $state.snapshot(stages),
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

    if (syncService) {
      syncService.sendSave(recipe);
    }

    if (!silent) toast.success("Recipe saved to vault!");
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
    stages = recipe.stages || [];
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
      const recipeToDelete = savedRecipes.find(r => r.id === id);
      const uuidToDelete = recipeToDelete?.uuid;

      await db.recipes.delete(id);
      await refreshVault();

      if (syncService && uuidToDelete) {
        syncService.sendDelete(uuidToDelete);
      }

      if (activeRecipeId === id) {
        clearToDefaults();
      }
      toast.success("Recipe deleted from vault");
    }
  }

  async function handleExportVault() {
    try {
      await exportVault();
      toast.success("Vault exported successfully");
    } catch (err) {
      toast.error("Failed to export vault");
    }
  }

  async function handleImportVault(file: File) {
    const result = await importVault(file, syncService ?? undefined);
    if (result.success) {
      await refreshVault();
      toast.success(`Imported ${result.count} recipes`);
    } else {
      toast.error(`Import failed: ${result.error}`);
    }
  }

  function updateSyncKey(key: string) {
    syncKey = key;
    localStorage.setItem("syncKey", key);

    if (syncService) {
      syncService.close();
    }

    if (key) {
      syncService = new SyncService(key, refreshVault);
      refreshVault();
      toast.info("Sync key updated. Connecting to vault...");
    } else {
      syncService = null;
      toast.success("Sync disabled");
    }
  }

  function handleRecipeUpdate(data: any) {
    if (data.recipeName) recipeName = data.recipeName;
    if (data.notes) notes = data.notes;
    if (data.stages) stages = data.stages;

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
    stages = [{ id: "s1", name: "Main Dough" }];
    ingredients = [
      {
        id: "1",
        name: "Bread Flour",
        weight: 500,
        category: IngredientCategory.FLOUR,
        stageId: "s1",
      },
      {
        id: "2",
        name: "Water",
        weight: 350,
        category: IngredientCategory.WATER,
        stageId: "s1",
      },
      {
        id: "3",
        name: "Sourdough Starter",
        weight: 100,
        category: IngredientCategory.LEAVENING,
        stageId: "s1",
      },
      {
        id: "4",
        name: "Salt",
        weight: 10,
        category: IngredientCategory.SALT,
        stageId: "s1",
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
    [IngredientCategory.SALT]: Stone,
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
          <Croissant class="w-4 sm:w-5 h-4 sm:h-5 text-white" />
        </div>
        <h1 class="flex sm:flex-row flex-col font-extrabold text-slate-800 text-lg sm:text-xl leading-4 tracking-tight">
          Baker's<span class="text-amber-600">Assistant</span>
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
          <span class="hidden sm:inline opacity-50 ml-1">({savedRecipes.length})</span>
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

  <main class="mx-auto px-0 sm:px-2 sm:py-8 pb-2 max-w-6xl">
    {#if view === "calculator"}
      <div class="gap-6 sm:gap-8 grid grid-cols-1 lg:grid-cols-12">
        <!-- Left: Inputs -->
        <div class="space-y-6 lg:col-span-8" in:fade>
          <div
            class="bg-white shadow-slate-200/50 shadow-xl sm:p-8 px-2 py-4 border border-slate-100 rounded-0 sm:rounded-4xl"
          >
            <div
              class="flex md:flex-row flex-col justify-between md:items-center gap-4 sm:gap-6 mb-8 sm:mb-10 pb-6 border-slate-50 border-b"
            >
              <Field.Field class="w-full">
                <Input
                  type="text"
                  bind:value={recipeName}
                  class="bg-transparent shadow-none p-0 border-none focus:ring-0 w-full h-auto font-black text-slate-900 sm:text-[40px] placeholder:text-slate-200 text-3xl"
                  placeholder="Name your creation..."
                />
              </Field.Field>
              <div class="flex items-center gap-3">
                <Label for="cook-mode" class="group/cook flex items-center gap-2 cursor-pointer">
                  <span class="font-black text-[9px] text-slate-500 uppercase tracking-tighter">
                    <ChefHat class="inline-block mr-0.5 w-3 h-3" />
                    Cook
                  </span>
                </Label>
                <Switch id="cook-mode" bind:checked={isCookingMode} />
              </div>
            </div>

            <div class="space-y-12">
              {#if stages.length === 0}
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
                      onDnd={(items) => handleDnd(cat, undefined, items)}
                    />
                  {/each}
                </div>
              {:else}
                {#each stages as stage (stage.id)}
                  <div
                    class="bg-white/50 shadow-sm p-6 sm:p-8 border border-slate-100 rounded-3xl"
                    transition:slide
                  >
                    <div class="flex justify-between items-center mb-8">
                      <div class="flex items-center gap-3">
                        <div class="bg-slate-100 p-2 rounded-xl">
                          <Puzzle class="w-4 h-4 text-slate-500" />
                        </div>
                        <Field.Field>
                          <Input
                            type="text"
                            bind:value={stage.name}
                            class="bg-transparent shadow-none p-0 border-none focus:ring-0 h-auto font-black text-slate-800 text-lg uppercase tracking-widest"
                            placeholder="Stage Name"
                          />
                        </Field.Field>
                      </div>
                      <button
                        onclick={() => removeStage(stage.id)}
                        disabled={isCookingMode}
                        class="hover:bg-red-50 p-2 rounded-xl text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 class="w-5 h-5" />
                      </button>
                    </div>

                    <div class="space-y-6">
                      {#each Object.values(IngredientCategory) as cat}
                        {@const stageIngs = ingredients.filter(
                          (ing) => ing.category === cat && ing.stageId === stage.id,
                        )}
                        {#if stageIngs.length > 0}
                          <IngredientBucket
                            category={cat}
                            ingredients={stageIngs}
                            percentages={calculations.ingredientPercentages}
                            icon={CATEGORY_ICONS[cat]}
                            allIcons={CATEGORY_ICONS}
                            isCookingMode={isCookingMode}
                            onUpdate={updateIngredient}
                            onRemove={removeIngredient}
                            onAdd={() => addIngredient(cat, stage.id)}
                            onDnd={(items) => handleDnd(cat, stage.id, items)}
                          />
                        {/if}
                      {/each}

                      {#if !isCookingMode}
                        <div class="flex flex-wrap gap-2 pt-4 border-slate-100 border-t">
                          {#each Object.entries(CATEGORY_META) as [cat, meta]}
                            <button
                              onclick={() => addIngredient(cat as IngredientCategory, stage.id)}
                              class="flex items-center gap-1.5 hover:bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-[10px] text-slate-500 uppercase tracking-wider transition-colors"
                            >
                              <Plus class="w-3 h-3" />
                              {meta.label}
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}

                <!-- Ungrouped ingredients if any -->
                {@const ungrouped = ingredients.filter((ing) => !ing.stageId)}
                {#if ungrouped.length > 0}
                  <div class="bg-slate-50/50 p-6 sm:p-8 border border-slate-200 border-dashed rounded-3xl">
                    <h3 class="mb-6 font-black text-slate-400 text-xs uppercase tracking-[0.2em]">General Ingredients</h3>
                    <div class="space-y-10">
                      {#each Object.values(IngredientCategory) as cat}
                        {@const catIngs = ungrouped.filter((ing) => ing.category === cat)}
                        {#if catIngs.length > 0}
                          <IngredientBucket
                            category={cat}
                            ingredients={catIngs}
                            percentages={calculations.ingredientPercentages}
                            icon={CATEGORY_ICONS[cat]}
                            allIcons={CATEGORY_ICONS}
                            isCookingMode={isCookingMode}
                            onUpdate={updateIngredient}
                            onRemove={removeIngredient}
                            onAdd={() => addIngredient(cat)}
                            onDnd={(items) => handleDnd(cat, undefined, items)}
                          />
                        {/if}
                      {/each}

                      {#if !isCookingMode}
                        <div class="flex flex-wrap gap-2 pt-4 border-slate-100 border-t">
                          {#each Object.entries(CATEGORY_META) as [cat, meta]}
                            <button
                              onclick={() => addIngredient(cat as IngredientCategory)}
                              class="flex items-center gap-1.5 hover:bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-[10px] text-slate-500 uppercase tracking-wider transition-colors"
                            >
                              <Plus class="w-3 h-3" />
                              {meta.label}
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              {/if}

              {#if !isCookingMode}
                <button
                  onclick={addStage}
                  class="flex justify-center items-center gap-2 hover:bg-slate-100 hover:shadow-sm py-4 border-2 border-slate-200 border-dashed rounded-3xl w-full font-bold text-slate-400 hover:text-slate-600 transition-all"
                >
                  <Plus class="w-5 h-5" />
                  Add Recipe Stage (e.g. Levain, Main Dough, Toppings)
                </button>
              {/if}
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
              class="group relative bg-slate-900 shadow-2xl p-6 sm:p-8 rounded-0 sm:rounded-4xl overflow-hidden text-white"
            >

              <div class="flex justify-between items-center mb-6">
                <h3
                  class="font-black text-[10px] text-slate-400 uppercase tracking-widest"
                >
                  Real-time Analysis
                </h3>
                <div class="flex items-center gap-3">
                  <Label for="scale-mode" class="font-black text-[9px] text-slate-500 uppercase tracking-tighter cursor-pointer">Scale Mode</Label>
                  <Switch id="scale-mode" bind:checked={isScalingEnabled} />
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
                      class="bg-linear-to-r from-amber-500 to-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] rounded-full h-full transition-all duration-1000 ease-out"
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
                      <Field.Field class="bg-slate-800/50 p-3 rounded-2xl {isScalingEnabled ? 'ring-1 ring-amber-500/50' : ''} gap-0">
                        <Field.Label class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest">Yield</Field.Label>
                        <Input
                          type="number"
                          value={portions}
                          onchange={(e) => scaleByYield(Number(e.currentTarget.value))}
                          class="bg-transparent p-0 border-none focus:ring-0 w-full font-bold {isScalingEnabled ? 'text-amber-500' : 'text-slate-200'} text-lg sm:text-xl shadow-none h-auto"
                          min="1"
                        />
                      </Field.Field>
                      <Field.Field class="bg-slate-800/50 p-3 rounded-2xl {isScalingEnabled ? 'ring-1 ring-amber-500/50' : ''} gap-0">
                        <Field.Label class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest">Weight / Por.</Field.Label>
                        <div class="flex items-baseline gap-1">
                          <Input
                            type="number"
                            value={Math.round(calculations.weightPerPortion)}
                            onchange={(e) => scaleToTargetServingWeight(Number(e.currentTarget.value))}
                            readonly={!isScalingEnabled}
                            class="bg-transparent p-0 border-none focus:ring-0 w-full font-bold {isScalingEnabled ? 'text-slate-200' : 'text-slate-500'} text-lg sm:text-xl shadow-none h-auto"
                            min="1"
                          />
                          <span class="font-bold text-slate-500 text-xs">g</span>
                        </div>
                      </Field.Field>
                      <Field.Field class="col-span-2 bg-amber-600/20 p-3 border {isScalingEnabled ? 'border-amber-600' : 'border-amber-600/30'} rounded-2xl transition-colors gap-0">
                        <Field.Label class="block mb-1 font-black text-[10px] {isScalingEnabled ? 'text-amber-400' : 'text-amber-500/80'} uppercase tracking-widest">Final Batch Weight</Field.Label>
                        <div class="flex items-baseline gap-1">
                          <Input
                            type="number"
                            value={Math.round(calculations.totalWeight)}
                            onchange={(e) => scaleToTotalWeight(Number(e.currentTarget.value))}
                            readonly={!isScalingEnabled}
                            class="bg-transparent p-0 border-none focus:ring-0 w-full font-black {isScalingEnabled ? 'text-amber-100' : 'text-amber-100/40'} text-2xl sm:text-3xl shadow-none h-auto"
                            min="1"
                          />
                          <span class="ml-auto font-black text-amber-500 text-lg">g</span>
                        </div>
                      </Field.Field>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Chat Card -->
            <AIChat
              {recipeName}
              {ingredients}
              {stages}
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
      <RecipeVault
        {savedRecipes}
        {syncKey}
        onLoadRecipe={loadRecipe}
        onRemixRecipe={remixRecipe}
        onDeleteRecipe={deleteRecipe}
        onStartNewRecipe={startNewRecipe}
        onUpdateSyncKey={updateSyncKey}
        onExportVault={handleExportVault}
        onImportVault={handleImportVault}
      />
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
