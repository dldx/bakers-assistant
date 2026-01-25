
export enum IngredientCategory {
  FLOUR = 'flour',
  WATER = 'water',
  LEAVENING = 'starter',
  SALT = 'salt',
  MILK = 'milk',
  SUGAR = 'sugar',
  FAT = 'fat',
  EGG = 'egg',
  TANGZHONG = 'tangzhong',
  OTHER = 'other'
}

export interface Ingredient {
  id: string;
  name: string;
  weight: number;
  category: IngredientCategory;
  stageId?: string;
  // Advanced configuration
  hydration?: number;       // For Leavening (default 100 for sourdough, 0 for yeast)
  tangzhongRatio?: number;  // For Tangzhong (default 5 for 1:5)
  waterContent?: number;    // For Butter/Milk (default 16/87)
  proteinContent?: number;  // For Flour
  checked?: boolean;        // For cooking mode
}

export interface RecipeStage {
  id: string;
  name: string;
  includeInCalculations?: boolean;
}

export interface Recipe {
  id?: number;
  uuid: string;
  name: string;
  ingredients: Ingredient[];
  portions: number;
  stages?: RecipeStage[];

  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export interface BreakdownItem {
  name: string;
  amount: number;
  stageId?: string;
}

export interface CalculationResult {
  totalWeight: number;
  totalFlour: number;
  totalWater: number;
  hydration: number;
  weightPerPortion: number;
  ingredientPercentages: Record<string, number>;
  flourBreakdown: BreakdownItem[];
  waterBreakdown: BreakdownItem[];
}
