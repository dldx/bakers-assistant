
import { IngredientCategory } from './types';

export const CATEGORY_META = {
  [IngredientCategory.FLOUR]: {
    label: 'Flour',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
    placeholder: 'e.g., Bread Flour'
  },
  [IngredientCategory.WATER]: {
    label: 'Liquid',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
    placeholder: 'e.g., Filtered Water'
  },
  [IngredientCategory.LEAVENING]: {
    label: 'Leavening',
    color: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
    placeholder: 'e.g., Levain, Instant Yeast'
  },
  [IngredientCategory.SALT]: {
    label: 'Salt',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    iconColor: 'text-slate-600',
    placeholder: 'e.g., Sea Salt'
  },
  [IngredientCategory.MILK]: {
    label: 'Milk',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    iconColor: 'text-sky-600',
    placeholder: 'e.g., Whole Milk'
  },
  [IngredientCategory.SUGAR]: {
    label: 'Sugar',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    iconColor: 'text-rose-600',
    placeholder: 'e.g., Caster Sugar'
  },
  [IngredientCategory.FAT]: {
    label: 'Fat & Butter',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
    placeholder: 'e.g., Butter, Oil'
  },
  [IngredientCategory.TANGZHONG]: {
    label: 'Tangzhong',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
    placeholder: 'e.g., Water Roux'
  },
  [IngredientCategory.OTHER]: {
    label: 'Other',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600',
    placeholder: 'e.g., Honey'
  }
};
