<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide, fly } from "svelte/transition";
  import {
    Plus,
    Save,
    RotateCcw,
    History,
    Trash2,
    PenLine,
    Copy,
    ChevronRight,
    Calculator as CalcIcon,
    BookOpen,
    Sparkles,
    Loader2,
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
  import { GoogleGenAI } from "@google/genai";
  import Markdown from "svelte-exmarkdown";
  import { db } from "$lib/db";
  import { IngredientCategory, type Ingredient, type Recipe } from "$lib/types";
  import { CATEGORY_META } from "$lib/constants";
  import IngredientBucket from "$lib/components/IngredientBucket.svelte";
  import NotesEditor from "$lib/components/NotesEditor.svelte";

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
  let aiInsight = $state<string | null>(null);
  let isAnalyzing = $state(false);

  // --- Derived Runes ---
  import { calculateRecipeStats } from "$lib/calculations";

  // --- Derived Runes ---
  const calculations = $derived(calculateRecipeStats(ingredients));

  // --- Effects & Logic ---
  onMount(async () => {
    await refreshVault();
  });

  async function refreshVault() {
    const all = await db.recipes.toArray();
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

  async function saveRecipe() {
    const recipe: Recipe = {
      name: recipeName || "Untitled Recipe",
      ingredients: $state.snapshot(ingredients),
      notes,
      createdAt: activeRecipeId
        ? savedRecipes.find((r) => r.id === activeRecipeId)?.createdAt ||
          Date.now()
        : Date.now(),
      updatedAt: Date.now(),
    };

    if (activeRecipeId) {
      await db.recipes.update(activeRecipeId, recipe as any);
    } else {
      const id = await db.recipes.add(recipe);
      activeRecipeId = id as number;
    }

    await refreshVault();
    alert("Recipe saved to vault!");
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
  }

  async function deleteRecipe(id: number) {
    if (confirm("Permanently remove this recipe from the vault?")) {
      await db.recipes.delete(id);
      await refreshVault();
      if (activeRecipeId === id) activeRecipeId = null;
    }
  }

  function resetCalculator() {
    if (confirm("Reset to initial template?")) {
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
      aiInsight = null;
    }
  }

  async function getBakerAdvice() {
    isAnalyzing = true;
    aiInsight = null;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `Expert Sourdough Baker Context:
          Recipe: ${recipeName}
          Hydration: ${calculations.hydration.toFixed(1)}%
          Total Batch: ${Math.round(calculations.totalWeight)}g
          Breakdown: ${ingredients.map((i) => `${i.name || "Unnamed"}: ${i.weight}g`).join(", ")}

          As a professional baker, give 3 concise bullet points about handling this dough, fermentation speed, and the likely crumb outcome. Use Markdown.`,
      });
      aiInsight = response.text || "No insights found.";
    } catch (e) {
      aiInsight =
        "The Baker's Assistant is currently offline. Please try again later.";
    } finally {
      isAnalyzing = false;
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

<div class="min-h-screen bg-gray-50/30 selection:bg-amber-100">
  <header
    class="bg-white border-b sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/80"
  >
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="bg-amber-600 p-2.5 rounded-xl shadow-amber-200 shadow-lg">
          <CalcIcon class="text-white w-5 h-5" />
        </div>
        <h1 class="text-xl font-extrabold text-slate-800 tracking-tight">
          Sourdough<span class="text-amber-600">Master</span>
        </h1>
      </div>

      <nav
        class="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200"
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

      <button
        onclick={saveRecipe}
        class="bg-slate-900 text-white px-5 py-2 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg active:scale-95 flex items-center gap-2"
      >
        <Save class="w-4 h-4" />
        <span class="hidden sm:inline">Save</span>
      </button>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-8">
    {#if view === "calculator"}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: Inputs -->
        <div class="lg:col-span-8 space-y-6" in:fade>
          <div
            class="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100"
          >
            <div
              class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-50"
            >
              <input
                type="text"
                bind:value={recipeName}
                class="text-3xl font-black text-slate-900 border-none bg-transparent focus:ring-0 w-full p-0 placeholder:text-slate-200"
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

            <div class="mt-12 pt-8 border-t flex justify-between items-center">
              <p class="text-xs text-slate-400 font-medium italic">
                Changes are saved only when you click 'Save' in the header.
              </p>
              <button
                onclick={resetCalculator}
                class="flex items-center space-x-2 text-slate-400 hover:text-red-500 transition-colors font-bold text-sm px-4 py-2 rounded-xl hover:bg-red-50"
              >
                <RotateCcw class="w-4 h-4" />
                <span>Reset Template</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Summary Dashboard -->
        <div class="lg:col-span-4" in:fly={{ y: 20 }}>
          <div class="sticky top-24 space-y-6">
            <div
              class="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group"
            >
              <!-- Decorative element -->
              <div
                class="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl transition-all group-hover:scale-150"
              ></div>

              <h3
                class="text-slate-400 uppercase tracking-widest text-[10px] font-black mb-6"
              >
                Real-time Analysis
              </h3>

              <div class="space-y-8">
                <div>
                  <div class="flex items-end justify-between mb-3">
                    <span class="text-sm font-bold text-slate-300"
                      >Net Hydration</span
                    >
                    <span class="text-4xl font-black text-amber-400"
                      >{calculations.hydration.toFixed(1)}%</span
                    >
                  </div>
                  <div
                    class="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5"
                  >
                    <div
                      class="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      style="width: {Math.min(calculations.hydration, 100)}%"
                    ></div>
                  </div>
                </div>

                <div
                  class="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800"
                >
                  <div>
                    <span
                      class="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1"
                      >Total Flour</span
                    >
                    <span class="text-2xl font-bold"
                      >{Math.round(calculations.totalFlour)}g</span
                    >
                  </div>
                  <div>
                    <span
                      class="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1"
                      >Total Liquid</span
                    >
                    <span class="text-2xl font-bold"
                      >{Math.round(calculations.totalWater)}g</span
                    >
                  </div>
                  <div class="col-span-2 pt-2">
                    <span
                      class="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1"
                      >Final Batch Weight</span
                    >
                    <span class="text-3xl font-black text-amber-100"
                      >{Math.round(calculations.totalWeight)}g</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Insight Card -->
            <div
              class="bg-white border-2 border-amber-50 rounded-[2rem] p-8 shadow-xl shadow-amber-900/5 group"
            >
              <div class="flex items-center gap-2 mb-4">
                <Sparkles class="w-4 h-4 text-amber-500" />
                <h3
                  class="text-slate-800 font-black text-sm uppercase tracking-widest"
                >
                  Baker's AI Assistant
                </h3>
              </div>

              {#if aiInsight}
                <div
                  class="text-sm text-slate-600 space-y-4 animate-in fade-in duration-500"
                >
                  <div
                    class="prose prose-sm prose-amber leading-relaxed font-medium"
                  >
                    {@html aiInsight.replace(/\n/g, "<br/>")}
                  </div>
                  <button
                    onclick={() => (aiInsight = null)}
                    class="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition"
                  >
                    Clear Analysis
                  </button>
                </div>
              {:else}
                <p class="text-xs text-slate-400 leading-relaxed italic mb-6">
                  {isAnalyzing
                    ? "Simulating fermentation dynamics..."
                    : "Get a professional review of your hydration, handling difficulty, and crumb texture."}
                </p>
                <button
                  onclick={getBakerAdvice}
                  disabled={isAnalyzing}
                  class="w-full py-4 bg-amber-50 text-amber-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white disabled:bg-slate-50 disabled:text-slate-300 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
                >
                  {#if isAnalyzing}
                    <Loader2 class="w-4 h-4 animate-spin" />
                    Consulting AI...
                  {:else}
                    <Sparkles class="w-4 h-4" />
                    Analyze Recipe
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Vault View -->
      <div class="max-w-4xl mx-auto py-12" in:fade>
        <div class="flex items-center justify-between mb-12">
          <div>
            <h2 class="text-4xl font-black text-slate-900 mb-2">
              The Recipe Vault
            </h2>
            <p class="text-slate-500 font-medium">
              Your personal collection of artisanal formulas.
            </p>
          </div>
          <button
            onclick={() => (view = "calculator")}
            class="bg-amber-100 text-amber-700 hover:bg-amber-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition"
          >
            <span>Start New Recipe</span>
            <Plus class="w-4 h-4" />
          </button>
        </div>

        {#if savedRecipes.length === 0}
          <div
            class="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center shadow-inner"
          >
            <BookOpen class="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <p class="text-slate-400 font-bold text-lg">
              Your vault is currently empty.
            </p>
          </div>
        {:else}
          <div class="grid gap-6">
            {#each savedRecipes as recipe (recipe.id)}
              <div
                class="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                in:slide={{ axis: "y" }}
              >
                <div
                  class="flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div class="flex-1">
                    <h4
                      class="text-xl font-black text-slate-900 group-hover:text-amber-600 transition-colors"
                    >
                      {recipe.name}
                    </h4>
                    <div class="flex items-center gap-4 mt-2">
                      <span
                        class="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                      >
                        {new Date(recipe.updatedAt).toLocaleDateString()}
                      </span>
                      <span class="text-slate-300">•</span>
                      <span class="text-slate-500 font-bold text-xs"
                        >{recipe.ingredients.length} Ingredients</span
                      >
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      onclick={() => loadRecipe(recipe)}
                      class="flex items-center gap-2 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      <PenLine class="w-3.5 h-3.5" />
                      Open
                    </button>
                    <button
                      onclick={() => {
                        loadRecipe(recipe);
                        recipeName += " (Copy)";
                        activeRecipeId = null;
                      }}
                      class="flex items-center gap-2 bg-slate-50 hover:bg-amber-600 text-slate-600 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
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
