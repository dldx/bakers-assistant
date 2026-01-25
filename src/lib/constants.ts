
import { IngredientCategory } from './types';

export const CATEGORY_META = {
  [IngredientCategory.FLOUR]: {
    label: 'Flours',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
    placeholder: 'e.g., Bread Flour'
  },
  [IngredientCategory.WATER]: {
    label: 'Liquids',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
    placeholder: 'e.g., Filtered Water'
  },
  [IngredientCategory.LEAVENING]: {
    label: 'Leavening agents',
    color: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
    placeholder: 'e.g., Levain, Instant Yeast'
  },
  [IngredientCategory.SALT]: {
    label: 'Salt',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    iconColor: 'text-slate-300',
    placeholder: 'e.g., Sea Salt'
  },
  [IngredientCategory.MILK]: {
    label: 'Dairy',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    iconColor: 'text-sky-600',
    placeholder: 'e.g., Whole Milk'
  },
  [IngredientCategory.SUGAR]: {
    label: 'Sugars',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    iconColor: 'text-rose-600',
    placeholder: 'e.g., Caster Sugar'
  },
  [IngredientCategory.FAT]: {
    label: 'Fats & Butters',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
    placeholder: 'e.g., Butter, Oil'
  },
  [IngredientCategory.EGG]: {
    label: 'Eggs',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    iconColor: 'text-pink-600',
    placeholder: 'e.g., Whole Egg'
  },
  [IngredientCategory.TANGZHONG]: {
    label: 'Tangzhong',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
    placeholder: 'e.g., Water Roux'
  },
  [IngredientCategory.OTHER]: {
    label: 'Other Ingredients',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600',
    placeholder: 'e.g., Honey'
  }
};
