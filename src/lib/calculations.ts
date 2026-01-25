import { IngredientCategory, type Ingredient, type CalculationResult, type BreakdownItem, type RecipeStage } from "./types";

export function calculateRecipeStats(
    ingredients: Ingredient[],
    portions: number = 1,
    stages: RecipeStage[] = []
): CalculationResult {
    let totalFlour = 0;
    let totalWater = 0;
    let totalWeight = 0;
    const flourBreakdown: BreakdownItem[] = [];
    const waterBreakdown: BreakdownItem[] = [];

    // Map stages for quick lookup of inclusion status
    const excludedStageIds = new Set(
        stages.filter(s => s.includeInCalculations === false).map(s => s.id)
    );

    ingredients.forEach((ing) => {
        // Skip ingredients from excluded stages
        if (ing.stageId && excludedStageIds.has(ing.stageId)) return;

        totalWeight += ing.weight;
        const name = ing.name || "Unnamed Ingredient";
        const stageId = ing.stageId;

        if (ing.category === IngredientCategory.FLOUR) {
            totalFlour += ing.weight;
            flourBreakdown.push({ name, amount: ing.weight, stageId });
        } else if (ing.category === IngredientCategory.WATER) {
            totalWater += ing.weight;
            waterBreakdown.push({ name, amount: ing.weight, stageId });
        } else if (ing.category === IngredientCategory.MILK) {
            const content = ing.waterContent ?? 87;
            const water = ing.weight * (content / 100);
            totalWater += water;
            waterBreakdown.push({ name, amount: water, stageId });
        } else if (ing.category === IngredientCategory.FAT) {
            // Fat/Butter can have water content (e.g., Butter is ~16-18% water, Oil is 0%)
            const content = ing.waterContent ?? 0;
            const water = ing.weight * (content / 100);
            totalWater += water;
            if (water > 0) waterBreakdown.push({ name: `${name} (Water)`, amount: water, stageId });
        } else if (ing.category === IngredientCategory.EGG) {
            const content = ing.waterContent ?? 75; // Default whole egg
            const water = ing.weight * (content / 100);
            totalWater += water;
            if (water > 0) waterBreakdown.push({ name: `${name} (Water)`, amount: water, stageId });
        } else if (ing.category === IngredientCategory.TANGZHONG) {
            // Tangzhong 1:X ratio (default 1:5)
            const ratioConfig = ing.tangzhongRatio ?? 5;
            const totalParts = 1 + ratioConfig;
            const flourPart = ing.weight * (1 / totalParts);
            const waterPart = ing.weight * (ratioConfig / totalParts);
            totalFlour += flourPart;
            totalWater += waterPart;
            flourBreakdown.push({ name: `${name} (Flour)`, amount: flourPart, stageId });
            waterBreakdown.push({ name: `${name} (Water)`, amount: waterPart, stageId });
        } else if (ing.category === IngredientCategory.LEAVENING) {
            const hydrationConfig = ing.hydration ?? 100;
            const ratio = hydrationConfig / 100;
            const flourInLeavening = ing.weight / (1 + ratio);
            const waterInLeavening = ing.weight - flourInLeavening;
            totalFlour += flourInLeavening;
            totalWater += waterInLeavening;
            flourBreakdown.push({ name: `${name} (Flour)`, amount: flourInLeavening, stageId });
            waterBreakdown.push({ name: `${name} (Water)`, amount: waterInLeavening, stageId });
        }
    });

    const ingredientPercentages: Record<string, number> = {};
    ingredients.forEach((ing) => {
        ingredientPercentages[ing.id] =
            totalFlour > 0 ? (ing.weight / totalFlour) * 100 : 0;
    });

    return {
        totalWeight,
        totalFlour,
        totalWater,
        hydration: totalFlour > 0 ? (totalWater / totalFlour) * 100 : 0,
        weightPerPortion: portions > 0 ? totalWeight / portions : 0,
        ingredientPercentages,
        flourBreakdown,
        waterBreakdown,
    };
}
