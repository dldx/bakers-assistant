
import Dexie, { type Table } from 'dexie';
import type { Recipe } from './types';

// Using the default export for Dexie ensures that the class and its 
// prototype methods (like version) are correctly inherited and typed in the subclass.
export class SourdoughDatabase extends Dexie {
  recipes!: Table<Recipe>;

  constructor() {
    super('SourdoughDB');
    // version() is a standard method inherited from the Dexie base class.
    this.version(1).stores({
      recipes: '++id, name, createdAt, updatedAt'
    });
  }
}

export const db = new SourdoughDatabase();
