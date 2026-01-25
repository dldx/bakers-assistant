<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide, fly } from "svelte/transition";
  import {
    Plus,
    Save,
    RotateCcw,
    Trash2,
    Copy,
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
    Egg,
  } from "lucide-svelte";
  import { db } from "$lib/db";
  import {
    IngredientCategory,
    type Ingredient,
    type Recipe,
    type RecipeStage,
  } from "$lib/types";
  import { CATEGORY_META } from "$lib/constants";
  import IngredientBucket from "$lib/components/IngredientBucket.svelte";
  import NotesEditor from "$lib/components/NotesEditor.svelte";
  import BakersMaths from "$lib/components/BakersMaths.svelte";
  import AIChat from "$lib/components/AIChat.svelte";
  import RecipeVault from "$lib/components/RecipeVault.svelte";
  import { toast } from "svelte-sonner";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import * as Field from "$lib/components/ui/field";
  import {
    DragDropProvider,
    KeyboardSensor,
    PointerSensor,
    DragOverlay,
  } from "@dnd-kit-svelte/svelte";

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
  let stages = $state<RecipeStage[]>([
    { id: "s1", name: "Main Dough", includeInCalculations: true },
  ]);

  let view = $state<"calculator" | "history">("calculator");
  let activeRecipeId = $state<number | null>(null);
  let savedRecipes = $state<Recipe[]>([]);

  let syncKey = $state("");
  let syncService = $state<SyncService | null>(null);

  // --- DnD State ---
  const sensors = [PointerSensor, KeyboardSensor];
  let activeId = $state<string | null>(null);
  let originalCategory = $state<IngredientCategory | null>(null);
  const activeItem = $derived(ingredients.find((i) => i.id === activeId));

  function handleGlobalDragStart(event: any) {
    if (event.operation.source.type === "item") {
      activeId = event.operation.source.id;
      originalCategory =
        ingredients.find((i) => i.id === activeId)?.category ?? null;
    }
  }

  // --- Derived Runes ---
  import { calculateRecipeStats } from "$lib/calculations";
  import { generateUUID } from "$lib/utils";
  import { Textarea } from "$lib/components/ui/textarea";

  // --- Derived Runes ---
  const calculations = $derived(calculateRecipeStats(ingredients, portions, stages));

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
    lastSavedJson !== "" && lastSavedJson !== captureState(),
  );

  // --- Wake Lock ---
  let wakeLock: WakeLockSentinel | null = null;

  async function requestWakeLock() {
    if ("wakeLock" in navigator && isCookingMode) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        console.log("Wake Lock acquired");
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      console.log("Wake Lock released");
    }
  }

  $effect(() => {
    if (isCookingMode) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = async () => {
      if (isCookingMode && document.visibilityState === "visible") {
        await requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  });

  // --- Effects & Logic ---
  onMount(async () => {
    syncKey = localStorage.getItem("syncKey") || "";
    window.addEventListener("hashchange", handleHashChange);

    if (syncKey) {
      syncService = new SyncService(syncKey, refreshVault);
    }

    await refreshVault();
    lastSavedJson = captureState();

    // Small delay for initial hash check to ensure UI has painted
    // before any blocking confirm() dialogs appear
    setTimeout(() => handleHashChange(), 300);
  });

  async function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    if (hash.startsWith("recipe/")) {
      const uuid = hash.replace("recipe/", "");
      if (
        activeRecipeId &&
        savedRecipes.find((r) => r.id === activeRecipeId)?.uuid === uuid
      ) {
        return; // Already loaded
      }
      const recipe = await db.recipes.where("uuid").equals(uuid).first();
      if (recipe) {
        loadRecipe(recipe);
      }
    } else if (hash.startsWith("share/")) {
      try {
        const base64 = hash.replace("share/", "");
        const json = decodeURIComponent(
          Array.from(atob(base64))
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        );
        const recipe = JSON.parse(json) as Recipe;

        // When opening a shared recipe, we load it but treat it as a new one
        // so they can save it to their own vault if they want.
        loadRecipe(recipe, false);
        toast.info(`Loaded shared recipe: ${recipe.name}`);

        // Clear hash and mark as unsaved so they can save it to THEIR vault
        window.history.replaceState(null, "", window.location.pathname);
        activeRecipeId = null;
      } catch (e) {
        console.error("Failed to decode shared recipe", e);
        toast.error("Invalid share link.");
      }
    } else if (hash.startsWith("sync/")) {
      const key = hash.replace("sync/", "");
      if (key && key !== syncKey) {
        if (
          confirm(
            `Connect to shared vault with key: ${key}? This will sync your recipes with this key.`,
          )
        ) {
          updateSyncKey(key);
          window.history.replaceState(null, "", window.location.pathname);
          view = "history";
        }
      }
    }
  }

  async function refreshVault() {
    const all = await db.recipes.toArray();
    // Migration: ensure all recipes have UUIDs
    for (const r of all) {
      if (!r.uuid) {
        r.uuid = generateUUID();
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
      includeInCalculations: true,
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

  function handleGlobalDragOver(event: any) {
    const { operation } = event;
    const { source, target } = operation;
    if (!target || source.id === target.id) return;
    if (source.type === "column") return;

    const sourceGroup = source.data?.group;
    const targetGroup = target.data?.group || target.id;

    if (sourceGroup !== targetGroup) {
      const sourceIndex = ingredients.findIndex((i) => i.id === source.id);
      const draggingIng = ingredients[sourceIndex];
      if (!draggingIng) return;

      const parts = String(targetGroup).split("-");
      const cat = parts.pop() as IngredientCategory;
      const sId = parts.join("-");
      const newCategory = cat;
      const newStageId = sId === "root" ? undefined : sId;

      const updatedIng = {
        ...draggingIng,
        category: newCategory,
        stageId: newStageId,
      };

      const nextIngredients = [...ingredients];
      nextIngredients.splice(sourceIndex, 1);

      let targetIndex: number;
      if (target.type === "item") {
        targetIndex = nextIngredients.findIndex((i) => i.id === target.id);
      } else {
        const bucketItems = nextIngredients.filter(
          (i) => i.category === newCategory && i.stageId === newStageId,
        );
        if (bucketItems.length > 0) {
          targetIndex =
            nextIngredients.indexOf(bucketItems[bucketItems.length - 1]) + 1;
        } else {
          targetIndex = nextIngredients.length;
        }
      }

      if (targetIndex !== -1) {
        nextIngredients.splice(targetIndex, 0, updatedIng);
        ingredients = nextIngredients;
      }
    }
  }

  function handleGlobalDragEnd(event: any) {
    activeId = null;
    originalCategory = null;
    const { operation } = event;
    const { source, target } = operation;
    if (!target || source.id === target.id) return;
    if (source.type === "column") return;

    const sourceIndex = ingredients.findIndex((i) => i.id === source.id);
    const targetIndex = ingredients.findIndex((i) => i.id === target.id);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const next = [...ingredients];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      ingredients = next;
    }
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
    if (
      targetWeight <= 0 ||
      calculations.totalWeight === 0 ||
      !isScalingEnabled
    )
      return;
    const targetTotal = targetWeight * portions;
    const factor = targetTotal / calculations.totalWeight;
    ingredients = ingredients.map((ing) => ({
      ...ing,
      weight: Math.round(ing.weight * factor * 10) / 10,
    }));
  }

  function scaleToTotalWeight(targetTotal: number) {
    if (targetTotal <= 0 || calculations.totalWeight === 0 || !isScalingEnabled)
      return;
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
    const waterIdx = ingredients.findIndex(
      (i) => i.category === IngredientCategory.WATER,
    );
    if (waterIdx !== -1) {
      ingredients[waterIdx] = {
        ...ingredients[waterIdx],
        weight: Math.max(
          0,
          Math.round((ingredients[waterIdx].weight + delta) * 10) / 10,
        ),
      };
    } else {
      // If no water ingredient exists, add one
      ingredients.push({
        id: Math.random().toString(36).substr(2, 9),
        name: "Water",
        weight: Math.max(0, Math.round(delta * 10) / 10),
        category: IngredientCategory.WATER,
      });
    }
  }

  async function saveRecipe(silent = false, forceNew = false) {
    const existingRecipe =
      activeRecipeId && !forceNew
        ? savedRecipes.find((r) => r.id === activeRecipeId)
        : null;
    const uuid = existingRecipe?.uuid || generateUUID();

    const recipe: Recipe = {
      uuid,
      name:
        (forceNew ? `${recipeName} (Copy)` : recipeName) || "Untitled Recipe",
      ingredients: $state.snapshot(ingredients),
      stages: $state.snapshot(stages),
      portions,
      notes,
      createdAt: existingRecipe?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (activeRecipeId && !forceNew) {
      await db.recipes.update(activeRecipeId, recipe as any);
    } else {
      const id = await db.recipes.add(recipe);
      activeRecipeId = id as number;
    }

    if (recipe.uuid) {
      window.location.hash = `recipe/${recipe.uuid}`;
    }
    await refreshVault();
    lastSavedJson = captureState();

    if (syncService) {
      syncService.sendSave(recipe);
    }

    if (!silent)
      toast.success(forceNew ? "Saved as new copy!" : "Recipe saved to vault!");
  }

  function loadRecipe(recipe: Recipe, updateHash = true) {
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
    stages = (recipe.stages || []).map(s => ({
      ...s,
      includeInCalculations: s.includeInCalculations ?? true
    }));
    activeRecipeId = recipe.id ?? null;
    view = "calculator";

    if (updateHash && recipe.uuid) {
      window.location.hash = `recipe/${recipe.uuid}`;
    }
    lastSavedJson = captureState();
  }

  function shareRecipe(recipe: Recipe) {
    try {
      const json = JSON.stringify($state.snapshot(recipe));
      const base64 = btoa(
        encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) =>
          String.fromCharCode(parseInt(p1, 16)),
        ),
      );
      const url = `${window.location.origin}${window.location.pathname}#share/${base64}`;

      navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate share link.");
    }
  }

  function shareSyncKey() {
    const url = syncService?.getShareUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Sync key link copied to clipboard!");
  }

  async function remixRecipe(recipe: Recipe) {
    loadRecipe(recipe, false);
    recipeName += " (Remix)";
    activeRecipeId = null;
    await saveRecipe(true);
  }

  async function deleteRecipe(id: number) {
    if (confirm("Permanently remove this recipe from the vault?")) {
      const recipeToDelete = savedRecipes.find((r) => r.id === id);
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

    if (data.stages) {
      const updatedStages = [...stages];
      data.stages.forEach((newStage: RecipeStage) => {
        const idx = updatedStages.findIndex((s) => s.id === newStage.id);
        if (idx !== -1) {
          updatedStages[idx] = {
            ...updatedStages[idx],
            ...newStage,
            includeInCalculations:
              newStage.includeInCalculations ??
              updatedStages[idx].includeInCalculations ??
              true,
          };
        } else {
          updatedStages.push({
            includeInCalculations: true,
            ...newStage,
          });
        }
      });
      stages = updatedStages;
    }

    if (data.removeStageIds) {
      stages = stages.filter((s) => !data.removeStageIds.includes(s.id));
    }

    if (data.isScalingEnabled !== undefined) {
      isScalingEnabled = data.isScalingEnabled;
    }

    if (data.ingredients) {
      let updatedIngredients = [...ingredients];
      data.ingredients.forEach((ingUpdate: any) => {
        if (ingUpdate.id) {
          const idx = updatedIngredients.findIndex((i) => i.id === ingUpdate.id);
          if (idx !== -1) {
            updatedIngredients[idx] = {
              ...updatedIngredients[idx],
              ...ingUpdate,
            };
          } else {
            // ID provided but not found - treat as new
            updatedIngredients.push({
              id: ingUpdate.id,
              ...ingUpdate,
            } as Ingredient);
          }
        } else {
          // New ingredient - generate ID if missing
          updatedIngredients.push({
            id: generateUUID(),
            ...ingUpdate,
          } as Ingredient);
        }
      });
      ingredients = updatedIngredients;
    }

    if (data.removeIngredientIds) {
      ingredients = ingredients.filter(
        (i) => !data.removeIngredientIds.includes(i.id),
      );
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
    stages = [{ id: "s1", name: "Main Dough", includeInCalculations: true }];
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
    [IngredientCategory.EGG]: Egg,
    [IngredientCategory.TANGZHONG]: Flame,
    [IngredientCategory.OTHER]: Cookie,
  };
</script>

<svelte:head>
  <title>{recipeName} | Baker's Assistant</title>
</svelte:head>

<div class="bg-gray-50/30 selection:bg-amber-100 min-h-screen">
  <header
    class="top-0 z-20 sticky bg-white/80 shadow-sm backdrop-blur-md border-slate-100 border-b"
  >
    <div
      class="flex justify-between items-center mx-auto px-4 sm:px-6 max-w-6xl h-14 sm:h-16"
    >
      <button
        onclick={startNewRecipe}
        class="group flex items-center gap-2.5 hover:opacity-80 transition-opacity"
      >
        <div
          class="bg-amber-600 shadow-amber-200/50 shadow-lg p-2 sm:p-2.5 rounded-xl group-active:scale-95 transition-transform"
        >
          <Croissant class="w-4 sm:w-5 h-4 sm:h-5 text-white" />
        </div>
        <div class="flex flex-col text-left">
          <h1
            class="font-black text-slate-900 text-lg sm:text-xl leading-none tracking-tight"
          >
            Baker's<span
              class="text-amber-600 decoration-amber-200 underline underline-offset-4"
              >Assistant</span
            >
          </h1>
        </div>
      </button>

      <nav
        class="flex items-center bg-slate-100 p-0.5 sm:p-1 border border-slate-200/60 rounded-xl sm:rounded-2xl"
      >
        <button
          onclick={() => (view = "calculator")}
          class="px-4 sm:px-6 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all {view ===
          'calculator'
            ? 'bg-white shadow-sm text-amber-800'
            : 'text-slate-500 hover:text-slate-800'}"
        >
          Editor
        </button>
        <button
          onclick={() => (view = "history")}
          class="flex items-center gap-1.5 px-4 sm:px-6 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all {view ===
          'history'
            ? 'bg-white shadow-sm text-amber-800'
            : 'text-slate-500 hover:text-slate-800'}"
        >
          Vault
          <span
            class="hidden sm:inline bg-slate-200/50 opacity-70 px-1.5 py-0.5 rounded-md text-[10px]"
          >
            {savedRecipes.length}
          </span>
        </button>
      </nav>
    </div>
  </header>

  <main class="mx-auto px-0 sm:px-2 sm:py-8 pb-2 max-w-6xl">
    {#if view === "calculator"}
      <div class="gap-6 sm:gap-8 grid grid-cols-1 lg:grid-cols-12">
        <!-- Left: Inputs -->
        <div class="space-y-6 lg:col-span-9" in:fade>
          <div
            class="bg-white shadow-slate-200/50 shadow-xl p-4 sm:p-8 border border-slate-100 rounded-0 sm:rounded-4xl"
          >
            <div
              class="flex lg:flex-row flex-col justify-between lg:items-center gap-6 mb-4 sm:mb-6 pb-6 border-slate-50 border-b"
            >
              <div class="flex-1 min-w-0">
                <Field.Field class="w-full">
                  <Textarea
                    bind:value={recipeName}
                    class="bg-transparent shadow-none p-0 border-none focus:ring-0 w-full h-auto min-h-auto overflow-hidden font-[Lilita_One] font-normal text-slate-900 placeholder:text-slate-200 text-3xl md:text-5xl tracking-tight resize-none no-scrollbar"
                    placeholder="Name your creation..."
                    rows={1}
                  />
                </Field.Field>
                <div class="flex items-center gap-2">
                  {#if isDirty}
                    <span
                      class="bg-amber-100 px-2 py-0.5 rounded-full font-bold text-[9px] text-amber-700 uppercase tracking-wider animate-pulse"
                    >
                      Unsaved Changes
                    </span>
                  {:else}
                    <span
                      class="font-bold text-[9px] text-slate-400 uppercase tracking-widest"
                    >
                      &#10003; All Changes Saved
                    </span>
                  {/if}
                </div>
              </div>

              <div
                class="flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3 sm:gap-3 shrink-0"
              >
                <div class="flex items-center gap-1 sm:gap-1.5">
                  <button
                    onclick={resetCalculator}
                    class="flex items-center gap-2 hover:bg-slate-100 p-2 sm:px-3 sm:py-2 rounded-xl font-bold text-slate-400 hover:text-slate-600 text-xs transition-colors"
                    title="Reset"
                  >
                    <RotateCcw class="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                  {#if activeRecipeId}
                    <button
                      onclick={() => saveRecipe(false, true)}
                      class="flex items-center gap-2 hover:bg-slate-100 p-2 sm:px-3 sm:py-2 rounded-xl font-bold text-slate-400 hover:text-slate-600 text-xs transition-colors"
                      title="Save as Copy"
                    >
                      <Copy class="w-3.5 h-3.5" />
                      <span class="hidden sm:inline">Save As</span>
                    </button>
                  {/if}
                  <button
                    onclick={() => saveRecipe()}
                    class="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg p-2 sm:px-4 sm:py-2 rounded-xl font-bold text-white text-xs active:scale-95 transition"
                    title="Save"
                  >
                    <Save class="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>

                <div
                  class="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 border border-slate-100 rounded-2xl w-fit"
                >
                  <Label
                    for="cook-mode"
                    class="group/cook flex items-center gap-2 cursor-pointer"
                  >
                    <span
                      class="font-black text-[10px] text-slate-500 uppercase tracking-widest"
                    >
                      <ChefHat
                        class="inline-block mr-1 w-3.5 h-3.5 text-amber-600"
                      />
                      Cook
                    </span>
                  </Label>
                  <Switch id="cook-mode" bind:checked={isCookingMode} />
                </div>
              </div>
            </div>

            <DragDropProvider
              {sensors}
              onDragStart={handleGlobalDragStart}
              onDragEnd={handleGlobalDragEnd}
              onDragOver={handleGlobalDragOver}
            >
              <div class="space-y-12">
                {#if stages.length === 0}
                  <div class="space-y-10">
                    {#each Object.values(IngredientCategory) as cat, idx}
                      <IngredientBucket
                        category={cat}
                        index={idx}
                        ingredients={ingredients.filter(
                          (ing) => ing.category === cat,
                        )}
                        percentages={calculations.ingredientPercentages}
                        icon={CATEGORY_ICONS[cat]}
                        allIcons={CATEGORY_ICONS}
                        {isCookingMode}
                        onUpdate={updateIngredient}
                        onRemove={removeIngredient}
                        onAdd={() => addIngredient(cat)}
                      />
                    {/each}
                  </div>
                {:else}
                  {#each stages as stage, sIdx (stage.id)}
                    <div
                      class="bg-white/50 shadow-sm p-3 sm:p-8 border border-slate-100 rounded-3xl"
                      transition:slide
                    >
                      <div class="flex justify-between items-center mb-8">
                        <div class="flex items-center gap-3">
                          <div class="bg-slate-100 p-2 rounded-xl">
                            <Puzzle class="w-4 h-4 text-slate-500" />
                          </div>
                          <Field.Field>
                            <Textarea
                              rows={1}
                              bind:value={stage.name}
                              class="bg-transparent shadow-none p-0 border-none focus:ring-0 h-auto min-h-auto font-black text-slate-800 text-lg uppercase tracking-widest resize-none no-scrollbar"
                              placeholder="Stage Name"
                            />
                          </Field.Field>
                        </div>
                        <div class="flex items-center gap-1">
                          {#if !isCookingMode}
                            <div class="flex items-center gap-1 pr-2 border-slate-100 border-r">
                              <Label for="calculate-{stage.id}" class="font-bold text-[10px] {stage.includeInCalculations ? 'text-slate-400' : 'text-amber-500'} uppercase tracking-widest cursor-pointer whitespace-nowrap">
                                {#if stage.includeInCalculations}
                                  Included<span class="hidden sm:inline"> in Maths</span>
                                {:else}
                                  Excluded<span class="hidden sm:inline"> from Maths</span>
                                {/if}
                              </Label>
                              <Switch
                                id="calculate-{stage.id}"
                                bind:checked={stage.includeInCalculations}
                              />
                            </div>
                          {/if}
                          <button
                            onclick={() => removeStage(stage.id)}
                            disabled={isCookingMode}
                            class="disabled:hidden hover:bg-red-50 p-2 rounded-xl text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 class="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div class="space-y-6">
                        {#each Object.values(IngredientCategory) as cat, cIdx}
                          {@const stageIngs = ingredients.filter(
                            (ing) =>
                              ing.category === cat && ing.stageId === stage.id,
                          )}
                          {#if stageIngs.length > 0 || (activeId && !isCookingMode)}
                            <IngredientBucket
                              category={cat}
                              index={sIdx * 100 + cIdx}
                              ingredients={stageIngs}
                              percentages={calculations.ingredientPercentages}
                              icon={CATEGORY_ICONS[cat]}
                              allIcons={CATEGORY_ICONS}
                              {isCookingMode}
                              stageId={stage.id}
                              onUpdate={updateIngredient}
                              onRemove={removeIngredient}
                              onAdd={() => addIngredient(cat, stage.id)}
                            />
                          {/if}
                        {/each}

                        {#if !isCookingMode}
                          <div
                            class="flex flex-wrap gap-2 pt-4 border-slate-100 border-t"
                          >
                            {#each Object.entries(CATEGORY_META) as [cat, meta]}
                              <button
                                onclick={() =>
                                  addIngredient(
                                    cat as IngredientCategory,
                                    stage.id,
                                  )}
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
                    <div
                      class="bg-slate-50/50 p-6 sm:p-8 border border-slate-200 border-dashed rounded-3xl"
                    >
                      <h3
                        class="mb-6 font-black text-slate-400 text-xs uppercase tracking-[0.2em]"
                      >
                        General Ingredients
                      </h3>
                      <div class="space-y-10">
                        {#each Object.values(IngredientCategory) as cat, gIdx}
                          {@const catIngs = ungrouped.filter(
                            (ing) => ing.category === cat,
                          )}
                          {#if catIngs.length > 0}
                            <IngredientBucket
                              category={cat}
                              index={1000 + gIdx}
                              ingredients={catIngs}
                              percentages={calculations.ingredientPercentages}
                              icon={CATEGORY_ICONS[cat]}
                              allIcons={CATEGORY_ICONS}
                              {isCookingMode}
                              onUpdate={updateIngredient}
                              onRemove={removeIngredient}
                              onAdd={() => addIngredient(cat)}
                            />
                          {/if}
                        {/each}

                        {#if !isCookingMode}
                          <div
                            class="flex flex-wrap gap-2 pt-4 border-slate-100 border-t"
                          >
                            {#each Object.entries(CATEGORY_META) as [cat, meta]}
                              <button
                                onclick={() =>
                                  addIngredient(cat as IngredientCategory)}
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

              <DragOverlay>
                {#if activeItem}
                  {@const CatIcon = CATEGORY_ICONS[activeItem.category]}
                  <div
                    class="flex items-center gap-3 bg-white dark:bg-zinc-800 opacity-90 shadow-2xl px-4 py-2 border-2 border-amber-500 rounded-xl ring-4 ring-amber-500/20 cursor-grabbing"
                  >
                    <div
                      class="flex justify-center items-center bg-amber-50 rounded-lg w-8 h-8 text-amber-600"
                    >
                      <CatIcon class="w-5 h-5 {CATEGORY_META[activeItem.category].iconColor}" />
                    </div>
                    <div>
                      <div
                        class="font-black text-[10px] text-amber-500/80 uppercase tracking-wider"
                      >
                        {#if originalCategory && originalCategory !== activeItem.category}
                          <span class="opacity-50 line-through"
                            >{CATEGORY_META[originalCategory].label}</span
                          >
                          <span class="mx-1">→</span>
                          <span class="text-amber-600"
                            >{CATEGORY_META[activeItem.category].label}</span
                          >
                        {:else}
                          Dragging
                        {/if}
                      </div>
                      <div
                        class="font-bold text-slate-900 dark:text-zinc-100 italic"
                      >
                        {activeItem.name}
                      </div>
                    </div>
                  </div>
                {/if}
              </DragOverlay>
            </DragDropProvider>

            <NotesEditor bind:notes />
          </div>
        </div>

        <!-- Right: Summary Dashboard -->
        <div class="lg:col-span-3" in:fly={{ y: 20 }}>
          <div class="top-24 sticky space-y-6">
            <BakersMaths
              {calculations}
              {portions}
              {stages}
              bind:isScalingEnabled
              onScaleByYield={scaleByYield}
              onScaleToTargetServingWeight={scaleToTargetServingWeight}
              onScaleToTotalWeight={scaleToTotalWeight}
            />

            <!-- AI Chat Card -->
            <AIChat
              {recipeName}
              {ingredients}
              {stages}
              hydration={calculations.hydration}
              {portions}
              {isScalingEnabled}
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
        onShareRecipe={shareRecipe}
        onShareSyncKey={shareSyncKey}
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
