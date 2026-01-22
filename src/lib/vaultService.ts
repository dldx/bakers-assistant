import { db } from './db';
import type { Recipe } from './types';

export async function exportVault() {
  const recipes = await db.recipes.toArray();
  // Strip internal IDs for export to keep it clean, though they might be useful
  // Actually, keeping them is fine as we handle them on import.
  const data = JSON.stringify(recipes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `bakers-assistant-vault-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importVault(file: File): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const text = await file.text();
    const recipes: Recipe[] = JSON.parse(text);

    if (!Array.isArray(recipes)) {
      throw new Error('Invalid vault file format: expected an array of recipes.');
    }

    let count = 0;
    for (const recipe of recipes) {
      // Basic validation
      if (!recipe.uuid || !recipe.name || !Array.isArray(recipe.ingredients)) {
        console.warn('Skipping invalid recipe during import', recipe);
        continue;
      }

      const local = await db.recipes.where("uuid").equals(recipe.uuid).first();

      const importedUpdatedAt = recipe.updatedAt || Date.now();
      const localUpdatedAt = local?.updatedAt || 0;

      // If it doesn't exist locally OR the imported one is newer, update/add it
      if (!local || importedUpdatedAt > localUpdatedAt) {
        // preserve local ID if it exists to avoid duplicates in the same DB
        const recipeToSave = { ...recipe, updatedAt: importedUpdatedAt };
        if (local?.id) {
            recipeToSave.id = local.id;
        } else {
            // Ensure we don't use an ID from another installation that might conflict
            delete recipeToSave.id;
        }

        await db.recipes.put(recipeToSave);
        count++;
      }
    }

    return { success: true, count };
  } catch (error) {
    console.error('Failed to import vault', error);
    return { success: false, count: 0, error: error instanceof Error ? error.message : String(error) };
  }
}
