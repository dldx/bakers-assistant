# Baker's Assistant Technical Documentation

This document serves as a guide for future agents and developers working on the Baker's Assistant codebase. It outlines the architectural decisions, core logic, and design philosophy used to build the application.

## 1. Project Overview

Baker's Assistant is a specialized web application designed for sourdough bakers. Unlike generic recipe managers, it provides precise hydration calculations that account for complex ingredients (enrichments, starters, scalds). It features an offline-first "Vault" for saving recipes and an AI integration for baking advice.

## 2. Technology Stack

*   **Framework**: [Svelte 5](https://svelte.dev/) (utilizing the new Runes reactivity model).
*   **Build Tool**: [Vite](https://vitejs.dev/) and [Bun](https://bun.sh/).
*   **Language**: TypeScript.
*   **Styling**: TailwindCSS (Utility-first, with a focus on specific interaction states like `group-hover`, `peer`, etc.).
*   **Icons**: `lucide-svelte`.
*   **Persistence**: IndexedDB via `dexie.js`.
*   **AI**: Google Generative AI SDK (Gemini).
*   **Testing**: [Vitest](https://vitest.dev/) (Unit testing calculation logic).

## 3. Architecture & State Management

The application fully embraces **Svelte 5 Runes** for a more explicit and fine-grained reactivity model.

### Key Runes Usage
*   **`$state`**: Manages all mutable data sources.
    *   `ingredients`: An array of `Ingredient` objects. This is the single source of truth for the recipe.
    *   `recipeName`: Top-level recipe metadata.
    *   `view`: Controls the navigation state ('calculator' vs 'history').
*   **`$derived`**: Handles all "computed" logic.
    *   `calculations`: Uses the imported `calculateRecipeStats` helper function to derive `totalFlour`, `totalWater`, and `hydration` whenever `ingredients` changes.
*   **`$state.snapshot`**: Used when saving recipes to `dexie` to ensure we store a plain POJO (Plain Old JavaScript Object) rather than a reactive proxy.

### Component Structure
*   **`src/routes/+page.svelte`**: The **Controller**. It holds the state, contains the business logic for standard/metric calculations, and manages the database interactions.
*   **`src/lib/calculations.ts`**: The **Logic**. Pure TypeScript function containing the business logic for recipe math. It is unit tested in `calculations.test.ts`.
*   **`src/lib/components/IngredientBucket.svelte`**: The **View**. It is a "dumb" component that renders a list of ingredients for a specific category. It emits events (`onUpdate`, `onRemove`) rather than mutating state directly.
*   **`src/lib/types.ts`**: Defines the domain model. `IngredientCategory` is the central enum driving UI logic and calculation logic.

## 4. Key Implementation Details

### The Hydration Logic
Calculations are located in `src/lib/calculations.ts`. This is the brain of the app, decoupled from the UI for testability. It normalizes all ingredients into their "Flour" and "Water" components.

*   **Flour**: 100% Flour.
*   **Water**: 100% Water.
*   **Milk**: Treated as 87% water (configurable via `ing.waterContent`) and 0% flour (the solids are ignored for hydration math, though they affect texture).
*   **Butter**: Treated as 16% water (configurable) and 0% flour.
*   **Starter**: Split based on the ingredient's `hydration` property (defaults to 100%).
    *   *Formula*: `flour = weight / (1 + ratio)`, `water = weight - flour`.
*   **Tangzhong**: Split based on a ratio (default 1:5).
    *   *Formula*: `flour = weight * (1/6)`, `water = weight * (5/6)`.

### Ingredient Configuration
Ingredients support "Ad-hoc Polymorphism" via optional fields in the `Ingredient` interface:
*   `hydration`: Defines the hydration percentage for a starter entry (defaults to 100% if unspecified).
*   `tangzhongRatio`: Overrides the default 1:5 ratio.
*   `waterContent`: Overrides default water percentages for enrichments.
*   `proteinContent`: Metadata for flour (currently informational, but could differ in future hydration math).

These fields are exposed in the UI as inline mini-inputs within the `IngredientBucket` only when relevant to the category.

### Persistance (The Vault)
We use `dexie` for a simplified wrapper around IndexedDB.
*   **Offline-First**: Recipes are saved locally to the user's browser.
*   **Schema**: Simple `recipes` store with `++id` auto-increment.
*   **Cloning**: When loading a recipe, we use `JSON.parse(JSON.stringify(recipe))` to break the reference to the database object and create a fresh reactive state.

## 5. Design System

The app follows a "Premium Utility" aesthetic.
*   **Color Coding**: Each ingredient category has a semantic color defined in `CATEGORY_META` (e.g., Amber for Flour, Sky for Milk).
*   **Shape Language**: heavy use of `rounded-2xl` and `rounded-3xl` for a soft, friendly feel.
*   **Micro-Interactions**:
    *   **Ingredient Switcher**: Clicking an ingredient icon opens a popover to change its category.
    *   **Sticky Analysis**: The "Real-time Analysis" card sticks to the viewport on desktop (`sticky top-24`) so users can see stats while adding ingredients.

## 6. Future Roadmap Ideas
*   **Scaling**: A "Scale to Total Dough Weight" feature that adjusts all ingredients proportionally.
*   **Unit Conversion**: Support for Ounces/Pounds.
*   **Export**: Generate a sharable Image or PDF of the formula.
