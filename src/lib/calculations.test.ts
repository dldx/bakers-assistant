
import { describe, it, expect } from 'vitest';
import { calculateRecipeStats } from './calculations';
import { IngredientCategory, type Ingredient } from './types';

describe('calculateRecipeStats', () => {

    it('should calculate basic hydration correctly (100g flour, 75g water)', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Water', weight: 75, category: IngredientCategory.WATER }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalFlour).toBe(100);
        expect(result.totalWater).toBe(75);
        expect(result.totalWeight).toBe(175);
        expect(result.hydration).toBe(75);
        expect(result.flourBreakdown).toHaveLength(1);
        expect(result.flourBreakdown[0]).toEqual({ name: 'Flour', amount: 100, stageId: undefined });
        expect(result.waterBreakdown).toHaveLength(1);
        expect(result.waterBreakdown[0]).toEqual({ name: 'Water', amount: 75, stageId: undefined });
    });

    it('should handle leavening hydration (100% hydration default sourdough starter)', () => {
        // 100g starter at 100% hydration = 50g flour + 50g water
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Starter', weight: 100, category: IngredientCategory.LEAVENING, hydration: 100 }
        ];

        const result = calculateRecipeStats(ingredients);

        // Total Flour: 100 (raw) + 50 (from leavening) = 150
        // Total Water: 0 (raw) + 50 (from leavening) = 50
        // Hydration: 50 / 150 = 33.333...

        expect(result.totalFlour).toBe(150);
        expect(result.totalWater).toBe(50);
        expect(result.hydration).toBeCloseTo(33.33, 2);
        expect(result.flourBreakdown).toContainEqual({ name: 'Starter (Flour)', amount: 50, stageId: undefined });
        expect(result.waterBreakdown).toContainEqual({ name: 'Starter (Water)', amount: 50, stageId: undefined });
    });

    it('should handle recipe stages correctly in breakdown', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Levain Flour', weight: 100, category: IngredientCategory.FLOUR, stageId: 'levain' },
            { id: '2', name: 'Main Flour', weight: 400, category: IngredientCategory.FLOUR, stageId: 'main' },
            { id: '3', name: 'Water', weight: 350, category: IngredientCategory.WATER, stageId: 'main' }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalFlour).toBe(500);
        expect(result.flourBreakdown).toContainEqual({ name: 'Levain Flour', amount: 100, stageId: 'levain' });
        expect(result.flourBreakdown).toContainEqual({ name: 'Main Flour', amount: 400, stageId: 'main' });
        expect(result.waterBreakdown[0].stageId).toBe('main');
    });

    it('should handle yeast as leavening with 0% hydration', () => {
        // 500g flour, 350g water, 5g yeast (0% hydration)
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 500, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Water', weight: 350, category: IngredientCategory.WATER },
            { id: '3', name: 'Yeast', weight: 5, category: IngredientCategory.LEAVENING, hydration: 0 }
        ];

        const result = calculateRecipeStats(ingredients);

        // Total Flour: 500 + 5 = 505
        // Total Water: 350
        // Hydration: 350 / 505 = 69.306...
        expect(result.totalFlour).toBe(505);
        expect(result.totalWater).toBe(350);
        expect(result.hydration).toBeCloseTo(69.31, 2);
    });

    it('should handle custom leavening hydration (e.g. stiffer starter)', () => {
        // 100g starter at 60% hydration
        // Flour = Weight / (1 + 0.6) = 100 / 1.6 = 62.5
        // Water = 100 - 62.5 = 37.5
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Starter', weight: 100, category: IngredientCategory.LEAVENING, hydration: 60 }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalFlour).toBe(62.5);
        expect(result.totalWater).toBe(37.5);
    });

    it('should handle milk (87% water content)', () => {
        // 100g milk => 87g water, 0g flour
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Milk', weight: 100, category: IngredientCategory.MILK, waterContent: 87 }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalFlour).toBe(100);
        expect(result.totalWater).toBe(87);
        expect(result.hydration).toBe(87);
    });

    it('should handle tangzhong (1:5 default ratio)', () => {
        // 60g tangzhong @ 1:5 ratio
        // Total parts = 6. 1 part flour, 5 parts water.
        // Flour = 60 * (1/6) = 10g
        // Water = 60 * (5/6) = 50g
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 90, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Tangzhong', weight: 60, category: IngredientCategory.TANGZHONG, tangzhongRatio: 5 }
        ];

        const result = calculateRecipeStats(ingredients);

        // Total Flour: 90 + 10 = 100
        // Total Water: 50
        expect(result.totalFlour).toBe(100);
        expect(result.totalWater).toBe(50);
        expect(result.hydration).toBe(50);
    });

    it('should handle zero flour (avoid division by zero)', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Water', weight: 100, category: IngredientCategory.WATER }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalFlour).toBe(0);
        expect(result.hydration).toBe(0);
    });

    it('should calculate individual percentages correctly', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Water', weight: 70, category: IngredientCategory.WATER },
            { id: '3', name: 'Salt', weight: 2, category: IngredientCategory.SALT }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.ingredientPercentages['1']).toBe(100); // 100/100
        expect(result.ingredientPercentages['2']).toBe(70);  // 70/100
        expect(result.ingredientPercentages['3']).toBe(2);   // 2/100
    });

    it('should handle pure fat (0% water)', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Oil', weight: 10, category: IngredientCategory.FAT, waterContent: 0 }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalWater).toBe(0);
        expect(result.hydration).toBe(0);
    });

    it('should handle butter (fat with 16% water)', () => {
        // 100g flour, 100g butter (16g water)
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Butter', weight: 100, category: IngredientCategory.FAT, waterContent: 16 }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalWater).toBe(16);
        expect(result.hydration).toBe(16);
    });

    it('should calculate weight per portion correctly', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 500, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Water', weight: 350, category: IngredientCategory.WATER }
        ];

        const result = calculateRecipeStats(ingredients, 2);

        expect(result.totalWeight).toBe(850);
        expect(result.weightPerPortion).toBe(425);
    });

    it('should handle zero portions gracefully', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 500, category: IngredientCategory.FLOUR }
        ];

        const result = calculateRecipeStats(ingredients, 0);

        expect(result.weightPerPortion).toBe(0);
    });

    it('should handle eggs (75% water content default)', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Whole Egg', weight: 100, category: IngredientCategory.EGG }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalWater).toBe(75);
        expect(result.hydration).toBe(75);
    });

    it('should handle egg whites (88% custom water content)', () => {
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Egg Whites', weight: 50, category: IngredientCategory.EGG, waterContent: 88 }
        ];

        const result = calculateRecipeStats(ingredients);

        expect(result.totalWater).toBe(44); // 50 * 0.88
        expect(result.hydration).toBe(44);
    });
});
