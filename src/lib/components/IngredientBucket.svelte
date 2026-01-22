<script lang="ts">
  import { Plus, GripVertical } from "lucide-svelte";
  import { fade } from "svelte/transition";
  import { dndzone } from "svelte-dnd-action";
  import { IngredientCategory, type Ingredient } from "$lib/types";
  import { CATEGORY_META } from "$lib/constants";
  import IngredientRow from "./IngredientRow.svelte";

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
    onDnd,
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
    onDnd: (items: Ingredient[]) => void;
  }>();

  const meta = $derived(CATEGORY_META[category as keyof typeof CATEGORY_META]);
  const flipDurationMs = 200;
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

  <div
    class="space-y-3 min-h-10"
    use:dndzone={{
      items: ingredients,
      flipDurationMs,
      dropTargetStyle: {},
      type: "ingredient",
      dragDisabled: isCookingMode,
    }}
    onconsider={(e) => onDnd(e.detail.items)}
    onfinalize={(e) => onDnd(e.detail.items)}
  >
    {#if ingredients.length === 0}
      <p
        class="px-2 font-medium text-[10px] text-slate-300 italic"
        transition:fade
      >
        No {meta.label.toLowerCase()} added yet...
      </p>
    {:else}
      {#each ingredients as ing (ing.id)}
        <div class="outline-none">
          <IngredientRow
            ingredient={ing}
            percentage={percentages[ing.id]}
            {isCookingMode}
            {allIcons}
            {onUpdate}
            {onRemove}
          />
        </div>
      {/each}
    {/if}
  </div>
</div>
