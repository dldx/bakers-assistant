<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import { Input } from "$lib/components/ui/input";
  import * as Field from "$lib/components/ui/field";
  import type { CalculationResult, RecipeStage, BreakdownItem } from "$lib/types";
  import { fade } from "svelte/transition";

  let {
    calculations,
    portions,
    stages = [],
    isScalingEnabled = $bindable(),
    onScaleByYield,
    onScaleToTargetServingWeight,
    onScaleToTotalWeight,
  }: {
    calculations: CalculationResult;
    portions: number;
    stages: RecipeStage[];
    isScalingEnabled: boolean;
    onScaleByYield: (newPortions: number) => void;
    onScaleToTargetServingWeight: (targetWeight: number) => void;
    onScaleToTotalWeight: (targetTotal: number) => void;
  } = $props();

  let activeBreakdown = $state<"flour" | "water" | null>(null);

  function groupBreakdown(items: BreakdownItem[]) {
    const groups: { name: string; items: BreakdownItem[] }[] = [];

    // First, handle items with known stages in order
    stages.forEach(stage => {
      const stageItems = items.filter(i => i.stageId === stage.id);
      if (stageItems.length > 0) {
        groups.push({ name: stage.name, items: stageItems });
      }
    });

    // Then handle items with no stage or stage not in list
    const otherItems = items.filter(i => !i.stageId || !stages.find(s => s.id === i.stageId));
    if (otherItems.length > 0) {
      groups.push({ name: "General", items: otherItems });
    }

    return groups;
  }

  const flourGroups = $derived(groupBreakdown(calculations.flourBreakdown));
  const waterGroups = $derived(groupBreakdown(calculations.waterBreakdown));
</script>

<div
  class="group relative bg-slate-900 shadow-2xl p-6 sm:p-8 rounded-0 sm:rounded-4xl overflow-visible text-white"
>
  <div class="flex justify-between items-center mb-6">
    <h3 class="font-black text-[10px] text-slate-400 uppercase tracking-widest">
      Baker's maths
    </h3>
    <div class="flex items-center gap-3">
      <Label
        for="scale-mode"
        class="font-black text-[9px] text-slate-500 uppercase tracking-tighter cursor-pointer"
        >Scale Mode</Label
      >
      <Switch id="scale-mode" bind:checked={isScalingEnabled} />
    </div>
  </div>

  <div class="space-y-6 sm:space-y-8">
    <div>
      <div class="flex justify-between items-end mb-3">
        <span class="font-bold text-slate-300 text-sm">Net Hydration</span>
        <span class="font-black text-amber-400 text-3xl sm:text-4xl"
          >{calculations.hydration.toFixed(1)}%</span
        >
      </div>
      <div class="bg-slate-800 p-0.5 rounded-full w-full h-3 overflow-hidden">
        <div
          class="bg-linear-to-r from-amber-500 to-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] rounded-full h-full transition-all duration-1000 ease-out"
          style="width: {Math.min(calculations.hydration, 100)}%"
        ></div>
      </div>
    </div>

    <div class="gap-4 sm:gap-6 grid grid-cols-2 pt-6 border-slate-800 border-t">
      <button
        class="group/item relative focus:outline-none text-left"
        onmouseenter={() => activeBreakdown = 'flour'}
        onmouseleave={() => activeBreakdown = null}
        onclick={() => activeBreakdown = activeBreakdown === 'flour' ? null : 'flour'}
      >
        <span
          class="block mb-1 font-black text-[10px] text-slate-500 group-hover/item:text-slate-300 uppercase tracking-widest transition-colors"
          >Total Flour</span
        >
        <span class="font-bold text-xl sm:text-2xl"
          >{Math.round(calculations.totalFlour)}g</span
        >

        {#if activeBreakdown === 'flour'}
          <div
            transition:fade={{ duration: 150 }}
            class="top-full left-0 z-30 absolute bg-slate-800 shadow-2xl mt-2 p-3 border border-slate-700 rounded-xl min-w-50"
          >
            <h4 class="mb-2 font-black text-[9px] text-slate-400 uppercase tracking-widest">Flour Breakdown</h4>
            <div class="space-y-4">
              {#each flourGroups as group}
                <div>
                  {#if flourGroups.length > 1}
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="bg-slate-700 h-px grow"></div>
                      <span class="font-black text-[8px] text-slate-500 uppercase tracking-tighter whitespace-nowrap">{group.name}</span>
                      <div class="bg-slate-700 h-px grow"></div>
                    </div>
                  {/if}
                  <div class="space-y-1.5">
                    {#each group.items as item}
                      <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-300">{item.name}</span>
                        <span class="font-bold text-slate-100">{Math.round(item.amount)}g</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </button>

      <button
        class="group/item relative focus:outline-none text-left"
        onmouseenter={() => activeBreakdown = 'water'}
        onmouseleave={() => activeBreakdown = null}
        onclick={() => activeBreakdown = activeBreakdown === 'water' ? null : 'water'}
      >
        <span
          class="block mb-1 font-black text-[10px] text-slate-500 group-hover/item:text-slate-300 uppercase tracking-widest transition-colors"
          >Total Liquid</span
        >
        <span class="font-bold text-xl sm:text-2xl"
          >{Math.round(calculations.totalWater)}g</span
        >

        {#if activeBreakdown === 'water'}
          <div
            transition:fade={{ duration: 150 }}
            class="top-full right-0 z-30 absolute bg-slate-800 shadow-2xl mt-2 p-3 border border-slate-700 rounded-xl min-w-50"
          >
            <h4 class="mb-2 font-black text-[9px] text-slate-400 uppercase tracking-widest">Liquid Breakdown</h4>
            <div class="space-y-4">
              {#each waterGroups as group}
                <div>
                  {#if waterGroups.length > 1}
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="bg-slate-700 h-px grow"></div>
                      <span class="font-black text-[8px] text-slate-500 uppercase tracking-tighter whitespace-nowrap">{group.name}</span>
                      <div class="bg-slate-700 h-px grow"></div>
                    </div>
                  {/if}
                  <div class="space-y-1.5">
                    {#each group.items as item}
                      <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-300">{item.name}</span>
                        <span class="font-bold text-slate-100">{Math.round(item.amount)}g</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </button>
      <div class="col-span-2 pt-4 border-slate-800 border-t">
        <div class="gap-3 sm:gap-4 grid grid-cols-2">
          <Field.Field
            class="bg-slate-800/50 p-3 rounded-2xl {isScalingEnabled
              ? 'ring-1 ring-amber-500/50'
              : ''} gap-0"
          >
            <Field.Label
              class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest"
              >Yield</Field.Label
            >
            <Input
              type="number"
              value={portions}
              oninput={(e) => onScaleByYield(Number(e.currentTarget.value))}
              class="bg-transparent p-0 border-none focus:ring-0 w-full font-bold {isScalingEnabled
                ? 'text-amber-500'
                : 'text-slate-200'} text-lg sm:text-xl shadow-none h-auto"
              min="1"
            />
          </Field.Field>
          <Field.Field
            class="bg-slate-800/50 p-3 rounded-2xl {isScalingEnabled
              ? 'ring-1 ring-amber-500/50'
              : ''} gap-0"
          >
            <Field.Label
              class="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest"
              >Weight / Por.</Field.Label
            >
            <div class="flex items-baseline gap-1">
              <Input
                type="number"
                value={Math.round(calculations.weightPerPortion)}
                oninput={(e) =>
                  onScaleToTargetServingWeight(Number(e.currentTarget.value))}
                readonly={!isScalingEnabled}
                class="bg-transparent p-0 border-none focus:ring-0 w-full font-bold {isScalingEnabled
                  ? 'text-slate-200'
                  : 'text-slate-500'} text-lg sm:text-xl shadow-none h-auto"
                min="1"
              />
              <span class="font-bold text-slate-500 text-xs">g</span>
            </div>
          </Field.Field>
          <Field.Field
            class="col-span-2 bg-amber-600/20 p-3 border {isScalingEnabled
              ? 'border-amber-600'
              : 'border-amber-600/30'} rounded-2xl transition-colors gap-0"
          >
            <Field.Label
              class="block mb-1 font-black text-[10px] {isScalingEnabled
                ? 'text-amber-400'
                : 'text-amber-500/80'} uppercase tracking-widest"
              >Final Batch Weight</Field.Label
            >
            <div class="flex items-baseline gap-1">
              <Input
                type="number"
                value={Math.round(calculations.totalWeight)}
                oninput={(e) => onScaleToTotalWeight(Number(e.currentTarget.value))}
                readonly={!isScalingEnabled}
                class="bg-transparent p-0 border-none focus:ring-0 w-full font-black {isScalingEnabled
                  ? 'text-amber-100'
                  : 'text-amber-100/40'} text-2xl sm:text-3xl shadow-none h-auto"
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
