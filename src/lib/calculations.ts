import { IngredientCategory, type Ingredient, type CalculationResult } from "./types";

export function calculateRecipeStats(ingredients: Ingredient[], portions: number = 1): CalculationResult {
    let totalFlour = 0;
    let totalWater = 0;
    let totalWeight = 0;

    ingredients.forEach((ing) => {
        totalWeight += ing.weight;
        if (ing.category === IngredientCategory.FLOUR) {
            totalFlour += ing.weight;
        } else if (ing.category === IngredientCategory.WATER) {
            totalWater += ing.weight;
        } else if (ing.category === IngredientCategory.MILK) {
            const content = ing.waterContent ?? 87;
            totalWater += ing.weight * (content / 100);
        } else if (ing.category === IngredientCategory.FAT) {
            // Fat/Butter can have water content (e.g., Butter is ~16-18% water, Oil is 0%)
            const content = ing.waterContent ?? 0;
            totalWater += ing.weight * (content / 100);
        } else if (ing.category === IngredientCategory.TANGZHONG) {
            // Tangzhong 1:X ratio (default 1:5)
            const ratioConfig = ing.tangzhongRatio ?? 5;
            const totalParts = 1 + ratioConfig;
            const flourPart = ing.weight * (1 / totalParts);
            const waterPart = ing.weight * (ratioConfig / totalParts);
            totalFlour += flourPart;
            totalWater += waterPart;
        } else if (ing.category === IngredientCategory.LEAVENING) {
            const hydrationConfig = ing.hydration ?? 100;
            const ratio = hydrationConfig / 100;
            const flourInLeavening = ing.weight / (1 + ratio);
            const waterInLeavening = ing.weight - flourInLeavening;
            totalFlour += flourInLeavening;
            totalWater += waterInLeavening;
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
    };
}
