
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
    });

    it('should handle starter hydration (100% hydration default)', () => {
        // 100g starter at 100% hydration = 50g flour + 50g water
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Flour', weight: 100, category: IngredientCategory.FLOUR },
            { id: '2', name: 'Starter', weight: 100, category: IngredientCategory.STARTER, hydration: 100 }
        ];

        const result = calculateRecipeStats(ingredients);

        // Total Flour: 100 (raw) + 50 (from starter) = 150
        // Total Water: 0 (raw) + 50 (from starter) = 50
        // Hydration: 50 / 150 = 33.333...

        expect(result.totalFlour).toBe(150);
        expect(result.totalWater).toBe(50);
        expect(result.hydration).toBeCloseTo(33.33, 2);
    });

    it('should handle custom starter hydration (e.g. stiffer starter)', () => {
        // 100g starter at 60% hydration
        // Flour = Weight / (1 + 0.6) = 100 / 1.6 = 62.5
        // Water = 100 - 62.5 = 37.5
        const ingredients: Ingredient[] = [
            { id: '1', name: 'Starter', weight: 100, category: IngredientCategory.STARTER, hydration: 60 }
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
});
