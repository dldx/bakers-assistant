<script lang="ts">
  import { Plus } from "lucide-svelte";
  import { fade } from "svelte/transition";
  import { useSortable } from "@dnd-kit-svelte/svelte/sortable";
  import { IngredientCategory, type Ingredient, type RecipeStage } from "$lib/types";
  import { CATEGORY_META } from "$lib/constants";
  import IngredientRow from "./IngredientRow.svelte";

  let {
    category,
    ingredients,
    percentages,
    icon: Icon,
    allIcons,
    isCookingMode = false,
    stage,
    index,
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
    stage?: RecipeStage;
    index: number;
    onUpdate: (id: string, updates: Partial<Ingredient>) => void;
    onRemove: (id: string) => void;
    onAdd: () => void;
  }>();

  const meta = $derived(CATEGORY_META[category as keyof typeof CATEGORY_META]);
  const groupId = $derived(`${stage?.id || "root"}-${category}`);

  const { ref, isDropTarget } = useSortable({
    id: () => groupId,
    index: () => index,
    type: "column",
    accept: ["item", "column"],
    data: () => ({ group: groupId }),
  });
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center pb-2 border-slate-50 border-b">
    <div class="flex items-center space-x-3">
      <div class="p-2 rounded-xl {meta.color.split(' ')[0]}">
        <Icon class="w-4 h-4 {meta.iconColor}" />
      </div>
      <h4
        class="font-black text-[10px] text-slate-800 uppercase tracking-[0.2em] {isCookingMode ? 'opacity-50' : ''}"
      >
        {meta.label}
      </h4>
    </div>
    <button
      onclick={onAdd}
      disabled={isCookingMode}
      class="disabled:hidden hover:bg-amber-50 p-1.5 rounded-lg text-amber-600 transition-colors disabled:cursor-not-allowed"
    >
      <Plus class="w-5 h-5" />
    </button>
  </div>

  <div
    {@attach ref}
    class="space-y-3 min-h-10 rounded-xl transition-colors {isDropTarget.current
      ? 'bg-amber-50/50'
      : ''}"
  >
    {#if ingredients.length === 0}
      <p
        class="px-2 font-medium text-[10px] text-slate-300 italic"
        transition:fade
      >
        No {meta.label.toLowerCase()} added yet...
      </p>
    {:else}
      {#each ingredients as ing, index (ing.id)}
        <div class="outline-none">
          <IngredientRow
            ingredient={ing}
            percentage={percentages[ing.id]}
            {index}
            {stage}
            {isCookingMode}
            {allIcons}
            {onUpdate}
            {onRemove}
            {onAdd}
          />
        </div>
      {/each}
    {/if}
  </div>
</div>
