
export enum IngredientCategory {
  FLOUR = 'flour',
  WATER = 'water',
  STARTER = 'starter',
  SALT = 'salt',
  MILK = 'milk',
  SUGAR = 'sugar',
  FAT = 'fat',
  TANGZHONG = 'tangzhong',
  OTHER = 'other'
}

export interface Ingredient {
  id: string;
  name: string;
  weight: number;
  category: IngredientCategory;
  // Advanced configuration
  hydration?: number;       // For Starter (default 100)
  tangzhongRatio?: number;  // For Tangzhong (default 5 for 1:5)
  waterContent?: number;    // For Butter/Milk (default 16/87)
  proteinContent?: number;  // For Flour
}

export interface Recipe {
  id?: number;
  name: string;
  ingredients: Ingredient[];

  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export interface CalculationResult {
  totalWeight: number;
  totalFlour: number;
  totalWater: number;
  hydration: number;
  ingredientPercentages: Record<string, number>;
}
